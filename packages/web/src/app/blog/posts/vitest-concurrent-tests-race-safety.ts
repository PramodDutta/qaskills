import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Concurrent Tests: A Practical Guide to Race Safety',
  description: 'Vitest concurrent tests race safety requires isolated state, deterministic fixtures, local assertions, and diagnostics that expose ordering-dependent failures.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Vitest Concurrent Tests: A Practical Guide to Race Safety

Vitest concurrent tests are race-safe when every test owns its mutable state, awaits all work it starts, and does not depend on execution order. Marking tests with \`test.concurrent\` lets Vitest schedule them concurrently, but it does not make shared fixtures safe. The speedup is real only when the tests remain deterministic under repeated runs, different worker counts, and randomized timing.

The safest workflow is to identify each shared resource, choose an isolation mechanism, use the test-local \`expect\` supplied through the context in concurrent tests, and cap concurrency at the capacity of external dependencies. Start with a small independent group rather than turning on concurrency for an entire suite. Then stress the group enough to reveal collisions before relying on it in CI.

This guide explains Vitest’s concurrency boundary, shows race-safe TypeScript fixtures, diagnoses realistic failures, and provides a migration process for suites that currently assume serial execution.

## Distinguish Concurrent Tests From Parallel Test Files

Test-file parallelism and in-file test concurrency are related but different. Vitest can distribute test files to workers. Inside a file, tests normally run in declaration order unless they are marked concurrent or concurrency is configured for the sequence. \`test.concurrent\` and \`describe.concurrent\` opt tests into concurrent scheduling.

That distinction determines where state can collide. Module-level variables can be shared by tests executing in the same worker. External databases, ports, queues, files, accounts, and services can be shared even across workers and processes. A suite may be race-prone before adding \`test.concurrent\` because file parallelism already exposes broader shared resources.

| Execution feature | Concurrency boundary | Typical collision |
| --- | --- | --- |
| Parallel test files | Different files scheduled across workers | Shared database records or fixed ports |
| \`test.concurrent\` | Marked tests within a suite or file | Module variables and shared fixture objects |
| \`describe.concurrent\` | Tests within the marked suite | Suite hooks and mutable setup state |
| CI job matrix | Separate processes or machines | Shared staging tenant or external account |
| Repeated local runs | Separate runs over time | Leaked files, queues, or unfinished async tasks |

Think in resources, not merely threads. JavaScript execution may be single-threaded within an event loop, yet two async tests can interleave at every \`await\`. A read, await, then write sequence is enough to lose an update. Worker processes add genuine isolation for memory but do nothing for a shared database.

## Opt In With the Smallest Useful Group

Begin with independent, I/O-heavy tests. A test that waits for its own fake server or isolated database schema can benefit. A CPU-heavy group may only contend for cores. A test using a singleton or global mock is a poor first candidate.

\`\`\`ts
import { describe, test } from 'vitest';

describe.concurrent('price service clients', () => {
  test('reads the retail price', async ({ expect }) => {
    const response = await fetch('http://127.0.0.1:4173/prices/retail');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ currency: 'USD', amount: 25 });
  });

  test('reads the wholesale price', async ({ expect }) => {
    const response = await fetch('http://127.0.0.1:4173/prices/wholesale');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ currency: 'USD', amount: 18 });
  });
});
\`\`\`

Vitest recommends using the \`expect\` from the test context for concurrent tests, especially so snapshots are associated with the correct test. Make this a review rule. An imported global \`expect\` may appear to work for ordinary assertions, but test-local context removes ambiguity for framework state tied to the running test.

Do not mix order-dependent tests into the group. If test B requires data created by test A, they are one scenario split incorrectly. Combine them into one test, move prerequisite creation into an isolated fixture, or test the lower-level behavior directly.

## Inventory Shared State Before Changing Scheduling

Race safety starts with an inventory. Search setup files, helpers, and tests for mutable module variables, process environment changes, clock and timer manipulation, global mocks, fixed filenames, fixed ports, shared users, and cleanup that deletes broad resource sets.

Classify each resource by scope and isolation strategy:

| Resource | Unsafe pattern | Safer ownership model |
| --- | --- | --- |
| JavaScript object | One module-level object mutated by many tests | Create a fresh object inside each test |
| Database | Every test writes tenant \`test\` | Unique tenant or transaction per test |
| File system | All tests use \`output.json\` | Per-test temporary directory |
| HTTP server | All tests bind port 3000 | Let the operating system choose an available port |
| Process environment | Tests assign the same environment key | Inject configuration into the unit under test |
| Mock implementation | Tests mutate one global mock | Create and restore a mock within test scope |
| Clock | Several tests change fake time | Keep clock-dependent group serial or inject a clock |

The inventory often reveals that concurrency is not the root problem. A global mutable fixture can make serial tests order-dependent too. Concurrency merely makes the hidden coupling visible more often.

## Replace Mutable Module Fixtures With Factories

This pattern is unsafe:

\`\`\`ts
import { beforeEach, test } from 'vitest';

const cart = { items: [] as string[] };

beforeEach(() => {
  cart.items.length = 0;
});

test.concurrent('adds a mug', async ({ expect }) => {
  await Promise.resolve();
  cart.items.push('mug');
  expect(cart.items).toEqual(['mug']);
});

test.concurrent('adds a bottle', async ({ expect }) => {
  await Promise.resolve();
  cart.items.push('bottle');
  expect(cart.items).toEqual(['bottle']);
});
\`\`\`

Both tests receive the same object. \`beforeEach\` does not create per-test memory, and hook execution can interleave with concurrent bodies. Depending on timing, one assertion sees both items or the other test’s reset.

Use a factory so ownership is visible:

\`\`\`ts
import { test } from 'vitest';

type Cart = { items: string[] };
const createCart = (): Cart => ({ items: [] });

test.concurrent.each([
  ['mug'],
  ['bottle'],
  ['notebook'],
])('adds %s to an isolated cart', async ([product], { expect }) => {
  const cart = createCart();
  await Promise.resolve();
  cart.items.push(product);
  expect(cart.items).toEqual([product]);
});
\`\`\`

Parameterized tests are good concurrency candidates when each row receives new input and creates new dependencies. Beware of object rows reused by reference. Clone or construct mutable inputs per invocation.

Factories also improve AI-generated tests. Ask the coding agent to identify resource ownership for every fixture it creates. Reject a change that adds \`concurrent\` while leaving module-level mutable state unexplained.

## Give Every Test a Unique External Namespace

Memory factories cannot isolate a shared database or object store. Assign each test a unique namespace derived from a generated identifier, then delete exactly that namespace. Never make concurrent cleanup broad, such as deleting every row where the email domain is a test domain.

Vitest provides a test context to each test, and custom fixtures can pass isolated resources into it. A simple helper can create unique data without depending on ordering.

\`\`\`ts
import { randomUUID } from 'node:crypto';
import { test as base } from 'vitest';

type Fixtures = {
  tenant: {
    id: string;
    dispose: () => Promise<void>;
  };
};

export const test = base.extend<Fixtures>({
  tenant: async ({}, use) => {
    const id = \`test-\${randomUUID()}\`;
    await createTenant(id);
    await use({
      id,
      dispose: () => deleteTenant(id),
    });
    await deleteTenant(id);
  },
});
\`\`\`

The example assumes \`createTenant\` and \`deleteTenant\` are application test helpers. Cleanup is idempotent because a test may explicitly dispose early and the fixture cleans again. Make deletion target the exact identifier.

Use the fixture in concurrent tests:

\`\`\`ts
import { test } from './fixtures/tenant';

test.concurrent('stores preferences in its tenant', async ({ tenant, expect }) => {
  await savePreference(tenant.id, 'theme', 'dark');
  await expect(loadPreference(tenant.id, 'theme')).resolves.toBe('dark');
});

test.concurrent('starts with no preferences', async ({ tenant, expect }) => {
  await expect(listPreferences(tenant.id)).resolves.toEqual([]);
});
\`\`\`

For databases, other valid strategies include a transaction rolled back after a test, a schema per worker or test, and an ephemeral container per suitable boundary. Transaction isolation fails when the system under test opens independent connections that cannot see or share the test transaction. Choose based on actual architecture.

## Make Cleanup Narrow, Awaited, and Failure-Tolerant

Cleanup is part of the test, not optional housekeeping. If cleanup begins without \`await\`, the next test or process can encounter leftover state. If cleanup deletes a shared prefix, one concurrent test can erase another’s fixture.

Use \`try/finally\` when a custom fixture is unnecessary:

\`\`\`ts
import { randomUUID } from 'node:crypto';
import { test } from 'vitest';

test.concurrent('exports one customer report', async ({ expect }) => {
  const customerId = \`customer-\${randomUUID()}\`;
  await createCustomer(customerId);

  try {
    const report = await exportCustomerReport(customerId);
    expect(report.customerId).toBe(customerId);
    expect(report.sections).toContain('activity');
  } finally {
    await deleteCustomer(customerId);
  }
});
\`\`\`

If creation partially succeeds, cleanup may still be needed. Return identifiers as early as possible, make deletion idempotent, and log enough context to remove leaked resources later. A periodic janitor can remove abandoned resources older than a safety threshold, but it should not replace per-test cleanup.

Avoid \`afterEach\` that assumes one shared "current" identifier. With concurrent tests, a module variable holding the current resource can be overwritten. Keep the identifier in test-local scope or a context fixture.

## Await Every Promise the Test Starts

An unawaited async call can keep running after the test finishes. Under serial execution, the leak may coincidentally finish before the next assertion. Under concurrency, it collides immediately and produces confusing logs or unhandled rejections.

Bad examples include calling an async assertion without returning it, starting a write and checking the database at once, and using \`forEach\` with an async callback. Use \`await\`, \`Promise.all\`, or a sequential \`for...of\` loop according to the intended relationship.

\`\`\`ts
import { test } from 'vitest';

test.concurrent('indexes all documents before searching', async ({ expect }) => {
  const documents = [
    { id: 'a', text: 'race safety' },
    { id: 'b', text: 'fixture ownership' },
  ];

  await Promise.all(documents.map((document) => indexDocument(document)));

  const results = await searchDocuments('fixture');
  expect(results.map((item) => item.id)).toContain('b');
});
\`\`\`

\`Promise.all\` is correct here only because the writes are designed to be independent. If the application requires ordered writes, make the loop sequential and do not use test-level concurrency to pretend the dependency does not exist.

Static analysis rules that detect floating promises are valuable. Runtime stress still matters because a returned promise can contain an internal race.

## Control Mocks, Timers, and Environment Mutation

Mocks that replace module exports, globals, time, or environment are process-scoped concerns. Two concurrent tests that demand different implementations of the same function cannot both own that global at once. Restoring in \`afterEach\` does not solve simultaneous use.

Prefer dependency injection:

\`\`\`ts
type Clock = { now: () => Date };

export function tokenIsExpired(expiresAt: Date, clock: Clock): boolean {
  return expiresAt.getTime() <= clock.now().getTime();
}

test.concurrent.each([
  ['expired', '2026-08-07T09:00:00Z', true],
  ['active', '2026-08-07T11:00:00Z', false],
])('%s token uses an injected clock', ([, expiry, expected], { expect }) => {
  const clock = { now: () => new Date('2026-08-07T10:00:00Z') };
  expect(tokenIsExpired(new Date(expiry), clock)).toBe(expected);
});
\`\`\`

When code cannot be refactored and a test must manipulate a global, keep that group serial. Serial execution is a valid safety mechanism, not a failure. Document why concurrency is unsafe so a future optimization does not reintroduce the race.

Environment variables have the same issue. A test that assigns \`process.env.REGION\` affects other tests in the process. Pass a configuration object to the function under test. If the application reads the environment at import time, isolate that behavior behind a small configuration module and test most logic without mutating the process.

Fake timers are also shared framework state within their scope. Concurrent clock scenarios are clearer and safer with injected clocks. Reserve timer manipulation for a serial suite when injection cannot represent the behavior.

## Respect Capacity Limits of Real Dependencies

Race-free code can still overload a database, API sandbox, or local fake server. Vitest exposes a \`maxConcurrency\` configuration that limits how many concurrent tests run at once in a suite. Set it from measured dependency capacity, not the largest number a laptop accepts.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    maxConcurrency: 6,
  },
});
\`\`\`

This limit is not a substitute for data isolation. It reduces simultaneous pressure but does not guarantee that two tests never overlap. Likewise, worker configuration controls file-level scheduling and resource use, not correctness of shared records.

Measure wall time, service latency, throttling, connection pool saturation, and retry rate as concurrency rises. Stop when added concurrency produces little speedup or increases instability. A suite completing in 50 seconds reliably is better than one completing in 35 seconds half the time and rerunning for three minutes the rest.

| Symptom as concurrency rises | Likely constraint | Response |
| --- | --- | --- |
| Database timeout rate increases | Connection pool or lock contention | Reduce concurrency, isolate records, tune test service capacity |
| HTTP 429 responses appear | Provider rate limit | Use a fake, request a test quota, or cap tests |
| CPU reaches saturation and time does not improve | CPU-bound workload | Use file distribution carefully, avoid more in-file concurrency |
| Fixed-port bind errors | Shared listener address | Request an available port per test |
| Memory spikes and workers exit | Heavy fixtures retained together | Shrink fixture scope or lower active tests |

For teams comparing which JavaScript runner and browser layer should own a scenario, the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides a broader tool-selection frame. Concurrency should optimize the right test layer, not rescue an unnecessarily expensive one.

## Preserve Snapshot and Assertion Ownership

Concurrent snapshots need unambiguous test context and stable output. Use context-local \`expect\`, unique test names, and deterministic serialization. Do not let two parameter rows generate the same title. Duplicate names make failures and snapshots hard to assign even if execution is technically safe.

Avoid snapshots of values containing random identifiers or timestamps unless a serializer deliberately removes those fields. Better yet, assert the stable business properties directly. Snapshot churn under concurrency is often blamed on scheduling when the true cause is nondeterministic data.

DOM assertions from browser tools face an analogous issue: choose stable user-facing locators rather than shared mutable selectors or positional assumptions. The [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) is useful when Vitest participates in a project that also has Playwright browser tests. Keep the runner boundaries clear, and do not share mutable accounts across them just because both jobs run in the same CI workflow.

When a concurrent assertion fails, include the resource identifier, input row, and relevant state version in the message or structured logs. Evidence must identify its owner.

## Reproduce Ordering Failures Instead of Adding Retries

Imagine three tests creating users with the same email \`qa@example.test\`. They pass serially because each cleanup deletes the user. After adding \`test.concurrent\`, one test receives a duplicate constraint error, another deletes the record before its assertion, and the third passes. CI retries make the file green on its second attempt.

The wrong response is increasing retries. The failure is a real test-design race. Diagnose it with a resource timeline:

1. Log test name and a correlation identifier at resource creation, read, and deletion.
2. Include the database key or safe hash of it.
3. Run only the affected file repeatedly.
4. Vary concurrency and add controlled delays around the suspected boundary in a diagnostic branch.
5. Confirm that unique resource ownership removes the failure.

A stress script can repeat the file through the documented Vitest CLI without inventing special race flags:

\`\`\`bash
set -eu

run=1
while [ "$run" -le 30 ]; do
  echo "concurrency stress run $run"
  npx vitest run tests/users.concurrent.test.ts
  run=$((run + 1))
done
\`\`\`

The loop increases opportunity for the race but does not prove its absence after thirty passes. Pair repetition with code-level ownership analysis. Timing bugs can remain dormant on a fast machine.

If random delays are used for diagnosis, seed and log them so a failure can be replayed. Remove diagnostic jitter after finding the fault unless the team deliberately maintains a chaos-oriented test job.

## What Engineers Commonly Misread About Concurrency

The first misconception is that \`beforeEach\` makes a shared variable private. It resets the same variable; it does not clone it. Concurrent hooks and tests can interleave.

The second is that JavaScript cannot race because it runs on one thread. Async operations interleave across awaits, and external systems process requests in parallel. Lost updates and delete-before-read bugs do not require two JavaScript statements to execute at the exact same CPU instant.

The third is that a mutex around tests is a concurrency solution. A global lock can make tests safe by making them serial, but it adds complexity and may conceal the underlying shared resource. If serialization is required, express it with a serial suite.

The fourth is that more concurrency always shortens CI. Setup cost, worker overhead, connection limits, CPU contention, and retries create a point of diminishing returns. Measure the complete job, including reruns.

The fifth is assuming process isolation solves everything. Separate workers isolate JavaScript memory, but not shared accounts, buckets, queues, files on a common path, or staging deployments.

Finally, teams use retries as proof of flakiness rather than as evidence. A retry can classify instability, but accepting the eventual pass trains everyone to ignore a race. Store all attempts and fix the resource boundary.

## Build a Concurrency-Safety Review Checklist

Review every proposed concurrent group using questions that map to failure modes:

- Does each test create its own mutable objects?
- Are database keys, filenames, ports, tenants, queues, and accounts unique?
- Is cleanup limited to the resource created by that test?
- Are all started promises awaited or returned?
- Do tests mutate global mocks, environment variables, or clocks?
- Does every concurrent callback use its test-context \`expect\`?
- Can the external dependency support the configured active test count?
- Do parameter rows have unique names and fresh mutable inputs?
- Can logs associate every external operation with a test?
- Does the group still pass when run repeatedly and within the full suite?

Automate what is objective. Lint floating promises, ban fixed temporary paths in test helpers, and provide approved fixture factories. Human review remains necessary for resource ownership and system capacity.

Ready-made QA skills from qaskills.sh can be installed with the qaskills CLI when an AI coding agent needs a repeatable test-review workflow. Give the agent this checklist and the project’s fixture conventions. Require it to explain why each shared resource is safe rather than accepting a mechanical addition of \`.concurrent\`.

## Migrate a Serial Suite Without Losing Trust

First, measure the baseline. Record file duration, total job duration, CPU and memory use, external error rates, and current flaky outcomes. Without a baseline, concurrency can move time between jobs and look better than it is.

Second, select one group with no global mutation and clear fixture ownership. Refactor shared objects into factories. Allocate unique external namespaces. Make cleanup exact and awaited. Use context-local assertions.

Third, enable concurrency only for that group. Run it repeatedly alone, after another file, before another file, and in the full suite. Exercise it on CI, where scheduling and resources differ from a developer machine.

Fourth, tune \`maxConcurrency\` from measured throughput. Watch provider limits and database contention. Do not change worker settings and in-file concurrency simultaneously, because attribution becomes difficult.

Fifth, document intentionally serial groups. A suite that controls a singleton clock or validates a migration on one database may need serialization. Focus optimization on the expensive waiting around it or move the dependency to a safer boundary.

Finally, review the result after several weeks. Count retry exposure and unresolved failures, not only green final runs. Keep the change when total feedback time improves without degrading trust. Revert or redesign it when concurrency merely converts stable minutes into unpredictable seconds.

## Frequently Asked Questions

### Are Vitest concurrent tests executed in separate processes?

Not necessarily. \`test.concurrent\` describes concurrent scheduling of marked tests, while worker pools and file parallelism govern how files run across workers. Tests in the same execution context can share module state, and tests in different workers can still collide through databases, files, services, and accounts. Do not infer isolation from the keyword. Inventory the actual resources and choose an ownership strategy for each. If process separation is required for a particular behavior, design and verify that boundary explicitly rather than relying on in-file concurrency.

### Should every asynchronous Vitest test be marked concurrent?

No. Asynchronous tests can benefit when they spend meaningful time waiting on independent I/O, but concurrency adds scheduling and resource pressure. Keep order-dependent flows, global-mock scenarios, fake-clock groups, and shared migration tests serial unless they are redesigned. Measure the entire CI job, not a single file. Start with a small independent group, isolate its data, cap active tests to dependency capacity, and compare stable wall time plus retry exposure against the baseline. Concurrency is a targeted throughput tool, not a default correctness feature.

### How can I safely use a database from concurrent tests?

Give every test a unique tenant, schema, record namespace, or transaction whose visibility matches the application’s connection behavior. Generate identifiers inside test scope, pass them through all calls, and delete only those exact resources in awaited cleanup. Transactions are excellent when the system under test shares the transaction, but they do not isolate requests handled through unrelated connections. Monitor connection pool and lock pressure, then set concurrency below the database test environment’s sustainable capacity. Never use broad cleanup that can remove another active test’s data.

### Why does a concurrent test pass alone but fail in the full suite?

Another file or CI job probably shares a resource the isolated run does not reveal. Common examples are fixed ports, environment variables, singleton mocks, database keys, storage prefixes, test users, and background work that outlives its test. Add safe correlation identifiers to creation, access, and cleanup logs. Compare timing around the failure, run suspect files together, and inspect setup files for process-wide mutation. Retries may change the schedule and hide the symptom, so retain every attempt and fix the ownership boundary instead of treating an eventual pass as success.
`,
};
