import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Reusable Containers Speed: Fast Tests Without State Leaks',
  description: 'Improve Testcontainers reusable containers speed while controlling state, readiness, parallelism, and cleanup, so faster integration suites remain trustworthy.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Testcontainers Reusable Containers Speed: Fast Tests Without State Leaks

Testcontainers reusable containers improve speed by avoiding repeated image startup, service initialization, and readiness waits. There are two distinct techniques: share a running container within one test process or suite, and reuse a matching container across separate runs where the Testcontainers implementation supports that experimental mode. Suite-scoped sharing is the safer default. Cross-run reuse is mainly a local-development optimization and demands deliberate state reset.

The goal is not the smallest startup number at any cost. The goal is lower feedback latency while every test still begins from a known logical state. This guide shows how to measure startup cost, choose a lifecycle, reset databases, handle parallel workers, diagnose stale state, and give AI coding agents enough constraints to optimize the suite without weakening isolation.

## Break the runtime into costs you can actually remove

Measure before changing lifecycle. A slow integration suite can spend time pulling an image, creating a container, waiting for readiness, applying migrations, seeding data, compiling tests, or running the test body. Reusing the container addresses only some of these.

Instrument coarse phases in the test bootstrap:

\`\`\`ts
const marks = new Map<string, number>();

function startPhase(name: string): void {
  marks.set(name, performance.now());
}

function endPhase(name: string): void {
  const started = marks.get(name);
  if (started === undefined) throw new Error(\`Missing phase: \${name}\`);
  const elapsedMs = Math.round(performance.now() - started);
  console.info(JSON.stringify({ event: 'test_setup_phase', name, elapsedMs }));
}
\`\`\`

Capture cold and warm runs separately. A cold run may pull layers and initialize an empty volume. A warm run benefits from the local image cache even without container reuse. Compare at least five runs and report medians rather than celebrating one unusually fast execution.

| Observed bottleneck | Does container reuse help? | Better first action |
|---|---:|---|
| Image pull on new CI workers | Rarely | Pre-pull, cache where supported, or choose a smaller appropriate image |
| Database process startup | Yes | Share the container within the suite |
| Migration execution | Sometimes | Cache migrated template state or optimize migrations carefully |
| Per-test data cleanup | No | Improve reset strategy and schema design |
| Test compilation | No | Tune the test runner or build graph |
| Slow assertions or polling | No | Diagnose application behavior and waits |

Track setup time independently from total suite time. Otherwise a faster container start can be hidden by new contention from more parallel tests.

## Choose one of three lifecycle boundaries

Container lifecycle is an isolation decision. Use the narrowest lifecycle that meets the feedback target.

| Lifecycle | Startup frequency | Isolation strength | Recommended use |
|---|---:|---:|---|
| Per test | Every test | Highest process isolation | Destructive configuration tests or small focused suites |
| Per suite or worker | Once per test process or worker | Strong if logical state resets | Normal integration and component tests |
| Across separate runs | Reattach to matching running service | Lowest by default | Opt-in local development only |

Per-test containers are straightforward but expensive for services with long initialization. Suite-scoped sharing amortizes startup while keeping CI runs independently reproducible. Cross-run reuse preserves service processes beyond one test command, which saves more local time but also preserves everything the service retains unless the harness resets it.

This distinction is what people most often get wrong. “Reusable container” is used to mean both a singleton held by test code and Testcontainers' special cross-run reuse feature. They have different cleanup, failure, and ownership behavior. Name them separately in architecture notes and CI logs.

## Share one container safely inside a JavaScript suite

For Node.js tests, build a suite environment that starts a container once, exposes connection details, and stops it after the suite. The exact hook location depends on Vitest, Jest, or another runner, but the ownership rule is the same: one bootstrap creates the resource, and tests consume configuration rather than starting their own copy.

\`\`\`ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let database: StartedPostgreSqlContainer | undefined;

export async function startDatabase(): Promise<StartedPostgreSqlContainer> {
  if (!database) {
    database = await new PostgreSqlContainer('postgres:16-alpine').start();
  }
  return database;
}

export async function stopDatabase(): Promise<void> {
  if (database) {
    await database.stop();
    database = undefined;
  }
}
\`\`\`

The image tag above is an example pin, not a claim about a required Testcontainers version. In a real repository, pin the image family and digest or tag according to your dependency policy. Avoid an unqualified moving image tag because an unrelated image update can change startup behavior and test semantics.

Pass the mapped connection data returned by the started container. Do not assume a fixed host port. Dynamic port mapping avoids collisions between developers and parallel jobs.

\`\`\`ts
export async function integrationEnvironment() {
  const container = await startDatabase();
  return {
    databaseUrl: container.getConnectionUri(),
    host: container.getHost(),
    port: container.getPort()
  };
}
\`\`\`

Initialize the application only after the container reports readiness and migrations complete. A started container process is not always an application-ready service. Prefer the module's documented readiness behavior or an explicit wait strategy that observes the real service condition.

## Reset logical state without restarting the process

Once a database container is shared, isolation moves from process lifecycle to data lifecycle. Each test needs a known database state. There is no universal best reset; choose based on transaction boundaries, schema complexity, parallelism, and whether the test starts multiple connections.

| Reset method | Speed | Works across connections? | Main limitation |
|---|---:|---:|---|
| Roll back an enclosing transaction | Very high | Often no | Application connections may not share the test transaction |
| Truncate owned tables | High | Yes | Requires correct ordering or cascade policy |
| Drop and recreate schema | Medium | Yes | Reinitialization cost and permissions |
| Create database from migrated template | High after template | Yes | Database-specific setup and template maintenance |
| Restore a known snapshot | Varies | Yes | Tooling complexity and image/storage coupling |

A transparent PostgreSQL reset can enumerate only application-owned tables and truncate them. Keep the allowlist or schema scope explicit so a test does not erase migration metadata unintentionally.

\`\`\`ts
const mutableTables = [
  'order_items',
  'orders',
  'customers'
] as const;

export async function resetData(client: DatabaseClient): Promise<void> {
  const quoted = mutableTables.map((name) => \`"\${name}"\`).join(', ');
  await client.query(\`TRUNCATE TABLE \${quoted} RESTART IDENTITY CASCADE\`);
}
\`\`\`

Notice the two template-literal levels in published code.

Run migrations once per clean suite environment, then reset mutable data between tests. If a test verifies a migration itself, give that test a separate lifecycle. Mixing migration tests with a shared already-migrated database creates order dependence.

## Seed data through builders, not one giant fixture

A reusable service tends to accumulate a universal seed dataset. That dataset becomes hidden global state: tests rely on rows they did not create, identifiers collide, and a change for one scenario breaks another.

Prefer scenario builders that insert only relevant records and return generated identifiers:

\`\`\`ts
type CustomerSeed = {
  email?: string;
  status?: 'active' | 'suspended';
};

export async function seedCustomer(
  db: DatabaseClient,
  overrides: CustomerSeed = {}
) {
  const email = overrides.email ?? \`customer-\${crypto.randomUUID()}@example.test\`;
  const status = overrides.status ?? 'active';
  return db.one(
    'INSERT INTO customers(email, status) VALUES ($1, $2) RETURNING id, email, status',
    [email, status]
  );
}
\`\`\`

Random values prevent collisions, but randomness must not determine expected behavior. Return every generated value and print a safe seed when generation affects failure reproduction. For time-sensitive records, inject a fixed clock or insert explicit timestamps.

Do not seed through a mocked repository if the suite is meant to verify mappings, constraints, or transactions. Direct SQL builders are appropriate for arranging data outside the behavior under test. When the public API creation flow itself matters, arrange through that API in the relevant test and accept the additional cost.

## Allocate resources per parallel worker

A single shared database with parallel tests can be faster or much slower depending on contention. It can also introduce cross-test interference. Decide whether workers share one schema, receive separate schemas, or own separate containers.

| Parallel model | Resource cost | Isolation | Good fit |
|---|---:|---:|---|
| One database, shared tables | Lowest | Weak unless tests are carefully partitioned | Read-heavy immutable fixtures |
| One container, schema per worker | Low | Good for database state | Moderate parallel suites |
| Container per worker | Medium | Strong | Suites with destructive database behavior |
| Container per test | Highest | Strongest | Rare configuration and lifecycle cases |

Create deterministic worker namespaces from the runner-provided worker identity. Validate and quote identifiers rather than concatenating untrusted strings into SQL.

\`\`\`ts
function schemaForWorker(workerId: number): string {
  if (!Number.isInteger(workerId) || workerId < 0) {
    throw new Error('Worker ID must be a non-negative integer');
  }
  return \`test_worker_\${workerId}\`;
}

async function prepareWorkerSchema(db: DatabaseClient, workerId: number) {
  const schema = schemaForWorker(workerId);
  await db.query(\`CREATE SCHEMA IF NOT EXISTS "\${schema}"\`);
  return schema;
}
\`\`\`

If the runner uses separate OS processes, a module-level singleton exists once per process, not once for the whole test command. That can start multiple containers unexpectedly. Use the runner's documented global setup or accept one container per worker and size parallelism accordingly.

For browser tests that need the backend, a shared service container can coexist with isolated browser contexts. The broader [JavaScript testing frameworks comparison](/blog/javascript-testing-frameworks-complete-guide-2026) helps identify which setup and worker lifecycle your runner exposes.

## Understand cross-run reuse before opting in

Testcontainers for Java documents reusable containers as an experimental feature. The documented pattern requires opting in through the user's Testcontainers properties and marking a compatible container for reuse with \`.withReuse(true)\`. It is not enabled by default, and the official guidance does not recommend this mode for CI.

An illustrative Java definition looks like this:

\`\`\`java
PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
    .withDatabaseName("app")
    .withUsername("test")
    .withPassword("test")
    .withReuse(true);

postgres.start();
\`\`\`

The user-level opt-in is documented as a property in \`~/.testcontainers.properties\`:

\`\`\`properties
testcontainers.reuse.enable=true
\`\`\`

Do not commit a developer's home-directory property file into a repository and assume every environment enables reuse. Treat the preference as local machine configuration. Also consult the official documentation for the language implementation you use, because lifecycle APIs and reuse support are not identical across Testcontainers projects.

Cross-run reuse matches container configuration, not your application's abstract idea of compatibility. Changing the image, exposed ports, environment, command, or other configuration can produce a different reusable resource. Conversely, an unchanged configuration can reconnect to a service containing yesterday's rows. Always run a health check, validate expected service identity, and reset application state at the start of the command.

## Keep CI hermetic even when local runs are warm

CI should start from a declared environment. Ephemeral workers already remove much cross-run opportunity, while long-lived workers make leaked state especially dangerous. Use suite or worker sharing inside a job, but stop resources normally afterward.

Separate local and CI policy visibly:

\`\`\`yaml
test_lifecycle:
  local:
    allow_cross_run_reuse: true
    reset_before_suite: true
  ci:
    allow_cross_run_reuse: false
    share_within_worker: true
    reset_between_tests: true
\`\`\`

This is an example policy document, not a supported Testcontainers configuration schema. Its purpose is to stop a convenience toggle from silently changing release evidence.

The CI job should publish phase timings and container logs on failure. Do not dump environment variables or connection strings containing secrets. A local integration database can use test-only credentials, while dependencies that require real credentials should receive them through CI secrets and have logs redacted.

## Diagnose the test that passes only after a fresh container

Suppose \`creates an order for a new customer\` passes when the database container is recreated but fails on the second suite run with a unique-email violation. The temptation is to add a random sleep, change the email, or disable reuse. Those actions can hide the underlying isolation defect.

Diagnose in this sequence:

1. Print the lifecycle mode, container identity, database name, schema, and worker identity.
2. Query for the conflicting row before test arrangement.
3. Confirm the reset hook ran and awaited completion.
4. Confirm the application connects to the same schema the reset cleaned.
5. Check whether another worker can insert the same fixture concurrently.
6. Inspect failure hooks that may skip cleanup.

A common failure is reset-after-test. If the test process crashes, times out, or is terminated, cleanup never runs and a reusable container keeps the data. Reset-before-test is more defensive because it establishes the precondition at the point of use. You may still clean afterward for developer convenience, but do not rely on it exclusively.

\`\`\`ts
beforeEach(async () => {
  await resetData(db);
  await seedRequiredReferenceRows(db);
});

afterEach(async () => {
  await assertNoOpenApplicationTransactions(db);
});
\`\`\`

Another common failure is a connection pool created before the test environment chooses its dynamic port. The application continues using a stale URL from a previous run. Construct the application after container startup, and close pools when suite ownership ends.

## Verify readiness and failure, not only happy startup

Container reuse can conceal startup defects because a warm service is already ready. Keep a cold-start test path in CI or a scheduled job. It should prove the image can initialize, migrations apply from an empty state, and the configured readiness condition eventually succeeds.

Test these failure modes at the appropriate layer:

| Failure | Expected harness behavior | Evidence to retain |
|---|---|---|
| Image cannot start | Fail setup, do not run misleading tests | Container logs and image reference |
| Service starts but never becomes ready | Time out at readiness boundary | Wait condition and recent service logs |
| Migration fails | Stop suite before test bodies | Migration name and database error |
| Reused service has incompatible schema | Recreate or migrate under explicit policy | Detected schema version and decision |
| Container disappears mid-suite | Fail affected tests with infrastructure classification | Runtime event and connection failure |

Do not catch setup errors and continue with undefined connection values. A clear infrastructure failure is cheaper than hundreds of application failures caused by one missing dependency.

## Combine service containers with Playwright without coupling tests

Browser tests often start an API and database once per worker, then create a fresh browser context per test. Keep service identity in fixture configuration and use accessible UI locators for the browser layer.

\`\`\`ts
import { test as base } from '@playwright/test';

type Fixtures = { apiBaseUrl: string };

export const test = base.extend<Fixtures>({
  apiBaseUrl: [async ({}, use) => {
    const environment = await startWorkerEnvironment();
    await use(environment.apiBaseUrl);
    await environment.stop();
  }, { scope: 'worker' }]
});
\`\`\`

The fixture owns cleanup and exposes only what tests need. Tests should arrange their own data through worker-isolated helpers. For UI interaction, follow the [Playwright locator practices guide](/blog/playwright-best-practices-locators-2026) so container optimization does not get mixed with fragile selector debugging.

If an end-to-end test requires a pristine service configuration, mark it for a dedicated project or worker instead of restarting the shared dependency midway through unrelated tests.

## Let AI agents optimize against guardrail tests

An agent asked to “make Testcontainers faster” may move startup outside the test process, remove cleanup, hardcode a port, or replace the real dependency with a mock. Supply a performance baseline and isolation invariants.

\`\`\`text
Target: reduce median local integration setup from baseline while preserving CI isolation.
Allowed: one PostgreSQL container per test worker; schema reset before each test.
Forbidden: fixed host ports, cross-run reuse in CI, removing migration coverage.
Acceptance: isolation sentinel passes in random order and cold-start job remains green.
Report: cold setup, warm setup, reset, and total suite medians.
\`\`\`

Add an isolation sentinel that deliberately writes a recognizable row in one test and asserts it is absent in the next clean context. Run the suite in shuffled order where the runner supports it. The sentinel converts an architectural promise into executable evidence.

Review changes to global setup particularly carefully. A few lines there affect every test and can cause hanging processes, leaked resources, or misleading results. The fastest trustworthy configuration is usually boring: pinned images, dynamic ports, readiness checks, one clear owner, and deterministic resets.

## Use a decision checklist before enabling reuse

Enable suite-scoped sharing when startup is a measured bottleneck, tests can reset logical state, and worker ownership is clear. Consider cross-run reuse only when local startup remains costly after those improvements and developers accept an explicit opt-in cleanup model.

Before merging, answer these questions:

- What exact phase becomes faster, and by how much at the median?
- Who starts and stops each container?
- Does every test begin with reset-before-test?
- How are parallel workers separated?
- Can a warm service conceal a broken cold initialization?
- What detects an incompatible schema or image change?
- Is cross-run reuse impossible in CI by policy?
- Which logs explain readiness and state-reset failures?

Speed is a property of the whole feedback loop. A reusable database that saves ten seconds but causes one unreproducible state leak per week is not an optimization. A suite-owned container with deterministic cleanup often captures most of the benefit without surrendering reliability.

## Budget memory and ports as part of the speed decision

More worker containers can reduce elapsed time until the host runs out of memory, CPU scheduling becomes saturated, or connection limits create contention. Measure peak resource use alongside duration. A configuration that is fast on a large developer workstation may stall a modest CI worker and trigger infrastructure retries.

Dynamic host ports prevent binding collisions, but internal service ports and network aliases still need deliberate ownership when several containers communicate. Give each worker environment a unique network scope or naming convention where the implementation supports it, then pass resolved endpoints through fixtures. Never let tests discover a dependency by selecting the first running container with a familiar image name.

Set parallelism from observed capacity rather than the number of test files. Increase workers gradually, record total time and peak resource consumption, and stop when added concurrency no longer reduces the median. This resource curve belongs in the optimization evidence because reusable containers change both startup cost and the number of services alive simultaneously.

## Frequently Asked Questions

### Are Testcontainers reusable containers safe for continuous integration?

Cross-run reusable-container mode is not the right default for CI, and the Java documentation describes it as experimental and not recommended for CI. Share containers within a CI job or worker when logical state can be reset, then let normal cleanup occur. This retains a reproducible job boundary. If long-lived CI workers are unavoidable, do not infer cleanliness from a running process. Validate image, schema, ownership, and data state explicitly before tests begin.

### Is one container per test worker faster than one container for the whole suite?

It depends on startup cost, database contention, and isolation overhead. One suite-wide container minimizes processes but may serialize resets or allow workers to interfere. A container per worker costs more startup time and memory but often enables safe parallel execution. Measure setup, reset, and total elapsed time for both designs. Schema-per-worker inside one container is a useful middle ground when the database supports clean namespace isolation and tests do not change global service configuration.

### What state must be reset when a container is reused?

Reset every application-visible mutable resource, not only the main tables. That can include sequences, secondary schemas, caches, message topics, object-storage buckets, scheduled jobs, and service-side idempotency records. Preserve migration metadata only when the suite intentionally shares a migrated schema. Define an allowlist of owned resources and verify cleanliness with sentinel queries. For cross-run local reuse, perform validation and reset at suite start because cleanup after a previous crashed run may never have executed.

### How can a team prove that reuse actually improved test speed?

Record named phases for image availability, container startup, readiness, migration, reset, test execution, and teardown. Compare multiple cold and warm runs using median values on representative machines or workers. Report both setup and total elapsed time, plus failure and retry rates. Keep an isolation sentinel and a cold-start path green while measuring. This prevents a misleading improvement where startup falls but parallel contention, stale-state reruns, or readiness flakes make the complete feedback loop slower.
`,
};
