import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Monorepo Testing Shared Fixture Strategy Without Shared-State Flakes',
  description: 'Build a monorepo testing shared fixture strategy with typed packages, isolated resources, clear ownership, and CI checks that prevent fixture drift and flakes.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Monorepo Testing Shared Fixture Strategy Without Shared-State Flakes

A monorepo testing shared fixture strategy should share fixture definitions, builders, and lifecycle contracts across packages without sharing mutable test state across cases. The safest design places stable data factories and framework adapters in a small workspace package, keeps product-specific scenarios near their owning service, and creates isolated resources at the narrowest scope that meets runtime needs.

That distinction solves the central monorepo tension. Teams want one canonical way to create a customer, authenticate a browser, or start an integration dependency. They do not want checkout tests and billing tests to mutate the same customer row, depend on execution order, or force every package to install a heavyweight browser runner. Sharing code is usually beneficial. Sharing live objects, database schemas, queues, ports, or accounts without ownership is where flakes begin.

This guide presents a package layout, typed builder patterns, Playwright fixture composition, resource namespaces, contract tests, and CI diagnostics. The examples use JavaScript and TypeScript workspaces, but the boundaries apply to other build systems: keep the core framework-neutral, make adapters explicit, and attach cleanup responsibility to the code that allocates the resource.

## Split the Fixture System Into Four Layers

Do not create one \`fixtures\` package that becomes a drawer for every test helper. Separate responsibilities so consumers can reuse the lightest layer.

| Layer | Contains | Must not contain | Typical consumers |
| --- | --- | --- | --- |
| Data definitions | Types, valid defaults, pure builders | Network clients, global state | Unit, contract, component, browser tests |
| Scenario definitions | Named business states and relationships | Runner lifecycle code | Service integration and journey tests |
| Resource managers | Allocate, reset, and release external resources | Assertions about one product UI | Integration suites |
| Runner adapters | Playwright fixtures, runner hooks, report attachments | Canonical domain defaults | Tests using that runner |

The dependency direction should be one way. A runner adapter may import scenario and data packages. Pure builders should not import Playwright, Vitest, Jest, a database client, or application code with side effects. This keeps unit-test consumers fast and prevents package-manager resolution from loading browser infrastructure just to build an object.

A useful repository shape is:

\`\`\`text
apps/
  checkout-web/
    tests/
      scenarios/
      checkout.spec.ts
  account-api/
    tests/
packages/
  test-data/
    src/
      customer.ts
      order.ts
  test-scenarios/
    src/
      paid-order.ts
  test-resources/
    src/
      namespace.ts
      cleanup.ts
  playwright-fixtures/
    src/
      api.ts
      auth.ts
      index.ts
\`\`\`

Keep scenario files inside an application when they express only that application's UI or deployment details. Promote a scenario to a shared package only when two real consumers need the same business setup and can agree on ownership.

## Write a Fixture Ownership Contract

Before implementing helpers, decide who owns values and cleanup. A short contract prevents assumptions from hiding in hooks.

| Fixture category | Creation owner | Mutation policy | Cleanup owner | Recommended scope |
| --- | --- | --- | --- | --- |
| Pure customer object | Calling test | Local mutation or immutable override | None | Per call |
| API-created order | Scenario fixture | Only through returned client | Fixture that created it | Per test |
| Database namespace | Worker resource fixture | Tests use unique records inside it | Worker fixture | Per worker |
| Browser auth state | Auth fixture | Read-only after creation | Fixture or artifact policy | Per worker or role |
| Third-party sandbox account | Environment owner | Serialized or uniquely keyed operations | Scheduled reconciler plus suite | Suite, with strict controls |

For every shared fixture, document five things: input, output, scope, isolation key, and cleanup guarantee. "Creates a user" is incomplete. "Creates a user in the current worker namespace, returns its id and an authenticated API client, and deletes the namespace when the worker ends" is reviewable.

Scope is a performance decision and a correctness decision. Per-test resources give strong isolation but may be expensive. Per-worker infrastructure can be efficient if each test receives unique records and the worker owns cleanup. Suite-wide mutable business data is rarely worth the coordination cost.

## Publish Pure Builders as the Smallest Shared Package

Begin with deterministic builders. Avoid random defaults because randomness makes failures hard to replay and can accidentally produce invalid combinations. Generate uniqueness at the resource boundary, where the test knows its namespace, worker, or case id.

\`\`\`ts
export type Customer = {
  externalId: string;
  email: string;
  country: 'US' | 'GB' | 'IN';
  status: 'active' | 'suspended';
  marketingConsent: boolean;
};

const validCustomer: Customer = {
  externalId: 'customer-example',
  email: 'customer@example.test',
  country: 'US',
  status: 'active',
  marketingConsent: false,
};

export function buildCustomer(overrides: Partial<Customer> = {}): Customer {
  return { ...validCustomer, ...overrides };
}

export function suspendedCustomer(externalId: string): Customer {
  return buildCustomer({
    externalId,
    email: \`\${externalId}@example.test\`,
    status: 'suspended',
  });
}
\`\`\`

The reserved \`.test\` domain communicates that addresses are not deliverable. The builder does not read environment variables, increment a global counter, or call a faker library. Given the same override, it returns the same value.

This package can expose explicit subpaths so consumers do not reach into source internals:

\`\`\`json
{
  "name": "@acme/test-data",
  "private": true,
  "type": "module",
  "exports": {
    "./customer": "./src/customer.ts",
    "./order": "./src/order.ts"
  }
}
\`\`\`

How TypeScript source is built or consumed depends on the monorepo toolchain. The architectural rule is stable: import \`@acme/test-data/customer\`, not \`../../../../packages/test-data/src/customer\`. Public subpaths reveal intended dependencies and allow internal reorganization.

## Keep Named Scenarios Concrete and Composable

A data builder creates one valid object. A scenario defines relationships and business meaning. For example, a refundable order needs a customer, captured payment, shippable items, and a fulfillment state. That scenario belongs near the domain that understands those rules.

\`\`\`ts
import { buildCustomer } from '@acme/test-data/customer';
import { buildOrder } from '@acme/test-data/order';

type RefundableOrderScenario = {
  customer: ReturnType<typeof buildCustomer>;
  order: ReturnType<typeof buildOrder>;
};

export function refundableOrderScenario(key: string): RefundableOrderScenario {
  const customer = buildCustomer({
    externalId: \`\${key}-customer\`,
    email: \`\${key}@example.test\`,
  });
  const order = buildOrder({
    externalId: \`\${key}-order\`,
    customerExternalId: customer.externalId,
    paymentStatus: 'captured',
    fulfillmentStatus: 'unfulfilled',
  });
  return { customer, order };
}
\`\`\`

Require the caller to pass a uniqueness key. A runner adapter can derive it from worker and test identity, while a unit test can pass a readable string. Avoid exporting a single object named \`refundableOrder\`; one test will eventually mutate it and another will inherit the change.

Named scenarios are also a vocabulary. A failure mentioning \`refundable-order\` communicates more than \`fixture-17\`. Keep names tied to business states, not implementation steps such as \`insertThreeRows\`.

## Generate Isolation Keys at the Runner Boundary

An isolation key should be unique enough for concurrently running tests, safe for the target system, and visible in diagnostics. Do not rely only on a worker index because separate CI jobs can use the same index. Combine a sanitized run identifier, project, worker, and short test-derived component.

\`\`\`ts
import { createHash } from 'node:crypto';

function safePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function isolationKey(input: {
  runId: string;
  project: string;
  worker: number;
  testTitle: string;
}): string {
  const digest = createHash('sha256')
    .update(input.testTitle)
    .digest('hex')
    .slice(0, 8);
  return [
    safePart(input.runId).slice(0, 20),
    safePart(input.project).slice(0, 12),
    \`w\${input.worker}\`,
    digest,
  ].join('-');
}
\`\`\`

Adapt length and character restrictions to the actual resource: PostgreSQL schema, S3-style key prefix, message topic, or application tenant may have different rules. Do not claim one universal key format. Store the resulting key in test attachments and logs so leaked resources can be traced to a run.

## Compose Playwright Fixtures Around Capabilities

Runner fixtures should expose capabilities a test needs, not a giant context object containing every service. One fixture can provide a namespaced API client, another an authenticated page, and another a scenario loader. Tests import the composed \`test\` and \`expect\` from their application's fixture entry point.

\`\`\`ts
import { test as base, expect } from '@playwright/test';
import { isolationKey } from '@acme/test-resources/namespace';

type WorkerResources = {
  workerNamespace: string;
};

type TestResources = {
  scenarioKey: string;
};

export const test = base.extend<TestResources, WorkerResources>({
  workerNamespace: [
    async ({}, use, workerInfo) => {
      const namespace = isolationKey({
        runId: process.env.CI_RUN_ID ?? 'local',
        project: workerInfo.project.name,
        worker: workerInfo.workerIndex,
        testTitle: 'worker',
      });
      await provisionNamespace(namespace);
      try {
        await use(namespace);
      } finally {
        await removeNamespace(namespace);
      }
    },
    { scope: 'worker' },
  ],

  scenarioKey: async ({ workerNamespace }, use, testInfo) => {
    const key = isolationKey({
      runId: workerNamespace,
      project: testInfo.project.name,
      worker: testInfo.workerIndex,
      testTitle: testInfo.titlePath.join(' '),
    });
    await use(key);
  },
});

export { expect };
\`\`\`

Playwright supports test-scoped and worker-scoped fixtures through \`test.extend\`. The example intentionally leaves \`provisionNamespace\` and \`removeNamespace\` application-specific. Their implementation must be idempotent enough for cleanup after partial setup, and deletion must validate the namespace prefix before acting.

Do not hide dozens of automatic fixtures in the shared package. Automatic setup that starts services, creates users, or changes feature flags for tests that never use them raises runtime and creates surprising dependencies. Let fixture dependency resolution activate only requested capabilities.

## Give Every Allocation a Cleanup Stack

Setup can fail halfway through. If code creates a namespace, then a user, then a queue, failure during queue creation must still remove the first two. Register cleanup immediately after each successful allocation and execute in reverse order.

\`\`\`ts
type Cleanup = () => Promise<void>;

export class CleanupStack {
  private tasks: Cleanup[] = [];

  defer(task: Cleanup) {
    this.tasks.push(task);
  }

  async run() {
    const errors: unknown[] = [];
    for (const task of this.tasks.reverse()) {
      try {
        await task();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Fixture cleanup failed');
    }
  }
}

const cleanup = new CleanupStack();
try {
  await createTenant(tenantKey);
  cleanup.defer(() => deleteTenant(tenantKey));

  await createQueue(queueKey);
  cleanup.defer(() => deleteQueue(queueKey));

  await use({ tenantKey, queueKey });
} finally {
  await cleanup.run();
}
\`\`\`

Never let the first cleanup error prevent the remaining cleanup attempts. Report all failures as artifacts. A scheduled janitor can remove leaked test resources as defense in depth, but it does not replace fixture cleanup. The janitor should recognize strict prefixes and age limits, run with least privilege, and support a dry inspection workflow before deletion logic is introduced.

## Prevent Framework Dependencies From Leaking Everywhere

The shared fixture graph should remain acyclic and intentional.

| Package | May depend on | Should not depend on |
| --- | --- | --- |
| \`test-data\` | Small utility or schema packages | Runner and application entry points |
| \`test-scenarios\` | \`test-data\`, domain types | Playwright config |
| \`test-resources\` | Infrastructure clients, \`test-data\` | Browser page objects |
| \`playwright-fixtures\` | All three lower layers, Playwright | Application source with startup side effects |
| Application tests | Public fixture adapter and app test helpers | Other applications' private test folders |

Use dependency-graph checks already supported by your monorepo tooling, or write a small import-boundary test. The exact configuration key varies by tool, so keep the policy in prose even when enforcement is automated.

Framework leakage has a measurable symptom: changing the browser runner forces unrelated unit-test packages to reinstall or recompile. Another symptom is test discovery loading a module that opens a database connection at import time. Shared packages should export definitions and functions; resource creation should occur inside explicit fixture setup.

## Contract-Test the Fixture Package Itself

Fixture code is production code for the test system. Give it tests for determinism, override behavior, namespace safety, cleanup order, and public exports.

\`\`\`ts
import { describe, expect, it, vi } from 'vitest';
import { buildCustomer } from '@acme/test-data/customer';
import { CleanupStack } from '@acme/test-resources/cleanup';

describe('shared fixture contracts', () => {
  it('builds independent customer objects', () => {
    const first = buildCustomer();
    const second = buildCustomer();
    first.status = 'suspended';
    expect(second.status).toBe('active');
  });

  it('preserves explicit overrides', () => {
    const customer = buildCustomer({ country: 'IN', marketingConsent: true });
    expect(customer).toMatchObject({ country: 'IN', marketingConsent: true });
  });

  it('cleans resources in reverse allocation order', async () => {
    const events: string[] = [];
    const stack = new CleanupStack();
    stack.defer(vi.fn(async () => void events.push('tenant')));
    stack.defer(vi.fn(async () => void events.push('queue')));
    await stack.run();
    expect(events).toEqual(['queue', 'tenant']);
  });
});
\`\`\`

Add a consumer smoke package that imports only documented subpaths. This catches accidental reliance on workspace source resolution that would fail in a published or built package. Even for a private monorepo, the consumer test verifies the public boundary.

## Version Fixture Contracts With Coordinated Changes

In a monorepo, source changes and consumers often land atomically, so independent package publishing may be unnecessary. Compatibility still matters because cached branches, selective CI, and parallel feature work can observe different expectations.

Classify changes:

- Additive: new optional builder override, new scenario, or new adapter export.
- Behavioral: a default country, role, state, or cleanup policy changes.
- Breaking: a field is removed, a scenario changes meaning, or isolation requirements change.

| Change | Safe rollout | Required evidence |
| --- | --- | --- |
| New optional builder field | Add with valid default | Builder and representative consumer tests |
| Default value change | Add explicit value to sensitive consumers first | Search of consumers and scenario review |
| Renamed export | Add new export, migrate, then remove old | Import-boundary check |
| Resource-scope change | Trial in one suite before broad adoption | Runtime, flake, and cleanup comparison |
| Cleanup semantics change | Keep allocation metadata compatible | Leak scan and failure-path tests |

The most dangerous change is a "harmless" default update. If \`buildCustomer()\` changes from active to pending, hundreds of tests may still compile while exercising different behavior. Prefer explicit named variants for meaningful states and reserve the default for a boring, broadly valid object.

## Keep CI Selective Without Skipping Fixture Consumers

Affected-package testing must include reverse dependencies. When \`test-data\` changes, checkout, billing, and account test packages may all be affected even if their files did not change. Use the dependency graph produced by the workspace tool rather than a path-only rule.

At the workflow level, separate a fast fixture-contract job from consumer suites. Canceling obsolete runs reduces wasted feedback when a pull request receives a new commit; this [guide to canceling stale E2E runs on new commits](/blog/ci-cancel-stale-e2e-runs-on-new-commit) explains that operational pattern. Cancellation must still allow fixture teardown or external expiration to clean resources.

An illustrative GitHub Actions job can run the package contract tests and publish results:

\`\`\`yaml
name: shared-fixture-contracts

on:
  pull_request:

concurrency:
  group: fixture-contracts-\${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:fixture-contracts
\`\`\`

The npm script belongs in the repository; the workflow does not assume a particular workspace selector. Add consumer jobs according to the actual dependency graph. If GitLab CI is the system of record, preserving test-case evidence helps distinguish fixture flakes from product failures. This guide to [GitLab CI JUnit reports for flaky tests](/blog/gitlab-ci-junit-report-flaky-tests) covers the report path and triage workflow.

## Diagnose a Flake Caused by Worker-Scoped Data

Consider a suite where a worker fixture creates one customer and ten tests modify that customer's preferences. The suite passes with one worker but fails in parallel. A test expecting email notifications enabled sometimes inherits the prior test's disabled setting.

The initial reaction is often to reset the customer in \`beforeEach\`. That may reduce symptoms, but diagnosis should establish ownership:

1. Run the failing file repeatedly with the same worker count and record order.
2. Attach customer id, namespace, worker index, and test title to each result.
3. Query mutations by customer id and timestamp.
4. Confirm whether multiple tests share the same business record or only the same infrastructure namespace.
5. Check whether cleanup waits for asynchronous writes and background consumers.
6. Repeat with a unique per-test customer inside the existing worker namespace.

If uniqueness removes the flake, keep the expensive database or tenant allocation at worker scope but move mutable records to test scope. That hybrid is usually the right balance.

What people get wrong is equating worker scope with permission to share everything created by the worker. Worker-scoped infrastructure is an ownership boundary, not a shared mutable scenario. A worker can own one schema while each case owns its own customer, order, idempotency key, and queue correlation id.

## Watch for Duplicate Package Instances

Another monorepo-specific failure occurs when two consumers resolve different physical copies of a fixture package. A module-level registry, symbol, or class identity then differs even though import names look the same. Symptoms include cleanup handlers not finding allocations, \`instanceof\` checks failing, or two supposedly singleton servers trying to bind the same port.

Diagnose resolution rather than adding retries:

- Inspect the package-manager dependency tree and lockfile.
- Log the resolved module path in a temporary diagnostic.
- Confirm package names and versions are consistent across workspaces.
- Remove imports that cross package internals by relative path.
- Avoid correctness that depends on a process-global singleton.

Even with one physical copy, module global state behaves poorly when a runner isolates modules or launches multiple processes. Pass registries and resource handles through fixtures. Explicit dependency flow survives process and worker boundaries more reliably than hidden singleton state.

## Review Shared Fixtures With a Consumer Matrix

Every shared abstraction has a maintenance cost. Keep a small matrix showing who consumes it and what contract they rely on.

| Shared capability | Checkout | Billing | Account API | Ownership decision |
| --- | --- | --- | --- | --- |
| Customer builder | Email, country, active state | External id and status | Full profile | Identity team owns core fields |
| Paid-order scenario | Full use | Payment reference only | None | Checkout owns scenario package |
| Tenant namespace | Browser suite | Integration suite | Integration suite | Platform quality owns lifecycle |
| Authenticated page | Buyer role | Finance role | None | Each app owns role-specific adapter |

If only one package uses a helper, keep it local. If consumers need incompatible defaults, share a lower-level builder and keep separate named scenarios. Do not add flags until one function has ten personalities; split capabilities along domain boundaries.

For AI coding agents, repository instructions should say which fixture layer to extend, how to form isolation keys, and where cleanup belongs. An agent can detect duplicate builders and propose consolidation, but it should not promote a scenario across domains without consumer evidence. Ready-made QA skills install from qaskills.sh with the qaskills CLI, while the monorepo's fixture ownership rules should remain local and versioned with the code.

## Roll Out the Strategy Without a Flag Day

Choose one duplicated, high-friction fixture used by two packages. Extract only its pure builder first. Add contract tests, migrate consumers, and observe compile time and test behavior. Next extract resource lifecycle if both consumers truly share allocation semantics. Keep runner adapters separate until composition is clear.

A practical sequence is:

1. Inventory duplicate fixtures, hidden global state, external allocations, and cleanup hooks.
2. Classify each helper into data, scenario, resource, or runner layer.
3. Select one pure builder and define its public import path.
4. Add consumer and independence tests.
5. Introduce isolation keys for external state.
6. Move cleanup beside allocation and test partial failure.
7. Update affected-package CI to include reverse consumers.
8. Measure flake rate, runtime, leak count, and fixture-related diagnosis time.

The target is not maximum reuse. It is deliberate reuse with obvious ownership. A successful monorepo testing shared fixture strategy gives every test a fresh business state, lets expensive infrastructure be shared safely when justified, and makes failures traceable to a package, worker, scenario, and cleanup contract.

## Frequently Asked Questions

### Should shared fixtures live in one package or several packages?

Use several small packages or clearly separated entry points when consumers need different dependency weights. Pure data builders should not force unit-test packages to install a browser runner or database client. Scenario definitions can depend on builders, resource managers can depend on infrastructure clients, and runner adapters can compose them. A single package can work in a modest repository if its exports preserve these boundaries, but split it once framework dependencies, ownership, or build cost starts leaking into unrelated consumers.

### When is worker-scoped fixture state safe?

Worker scope is safe for infrastructure that is expensive to allocate and can contain isolated per-test records, such as a database namespace or application process. It is risky for mutable business entities that tests update independently. Give every case unique customers, orders, keys, and correlation ids even inside a worker-owned resource. Cleanup at worker end should remove the containing namespace, while test-level cleanup or uniqueness prevents one case from observing another. Prove the assumption by running with parallel workers and randomized test order.

### How do shared fixtures work across different test runners?

Put deterministic builders and scenario functions in framework-neutral modules. Add thin adapters for each runner's lifecycle and context model. Playwright tests can use extended fixtures, while another runner can call the same builders from its documented setup hooks. Do not attempt to create one universal hook abstraction that hides cancellation, worker, and teardown semantics, because those differ. Share inputs and resource contracts, then implement lifecycle behavior explicitly for each runner and contract-test the common layer independently.

### What metrics show that a fixture refactor succeeded?

Track fixture-related flaky failures, leaked external resources, median setup time, high-percentile suite duration, and time spent diagnosing setup failures. Also monitor the number of consumer-specific overrides and breaking default changes, because excessive exceptions suggest the abstraction is too broad. Compare before and after under similar worker counts and CI load. A reduction in duplicated lines is useful maintenance evidence, but it does not compensate for slower tests or coupled failures. Success means stable consumers, clear ownership, reliable cleanup, and predictable parallel execution.
`,
};
