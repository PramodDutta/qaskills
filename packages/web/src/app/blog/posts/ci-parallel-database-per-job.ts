import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Parallel Database per Job Without Test Cross-Talk',
  description: 'Design a ci parallel database per job workflow that isolates shards, prevents data races, and keeps database-heavy test suites fast and debuggable.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# CI Parallel Database per Job Without Test Cross-Talk

CI parallel database per job means every parallel test job gets its own isolated database, schema, or containerized database instance. The goal is simple: make parallel test execution faster without allowing shard A to delete, migrate, seed, lock, or mutate data that shard B is currently using. If test failures disappear when you run the suite serially, shared database state is one of the first suspects.

For QA and test-automation engineers, database isolation is not a backend luxury. It is the difference between trustworthy CI and a parallel pipeline that produces random red builds. UI tests create users, API tests update orders, workers process jobs, and cleanup code truncates tables. If all shards point at the same database, your test suite becomes a race-condition generator.

This guide shows how to choose the right isolation unit, name databases safely in GitHub Actions and GitLab CI, run migrations per job, seed deterministically, preserve artifacts for debugging, and avoid the traps that make parallel database testing slower than serial execution. Pair the design with [canceling stale E2E runs on new commits](/blog/ci-cancel-stale-e2e-runs-on-new-commit) so old shards do not keep consuming environments, and publish failures through [GitLab CI JUnit reports for flaky tests](/blog/gitlab-ci-junit-report-flaky-tests) when you need trendable failure evidence.

## Pick the Isolation Unit That Matches Your Risk

You can isolate by database server, database, schema, tenant, transaction, or table prefix. The right choice depends on how your application connects, how migrations work, whether background jobs run, and how much setup time you can afford. Do not start with the most elaborate architecture. Start with the smallest unit that prevents cross-job interference and still matches production behavior.

| Isolation unit | What each job gets | Strength | Cost | Good fit |
|---|---|---|---|---|
| Separate database container | Own PostgreSQL or MySQL service | Strongest isolation, simple cleanup | Highest startup cost | E2E suites with background workers |
| Separate database on one server | Own database name | Strong isolation for most apps | Moderate setup | API and integration shards |
| Separate schema | Own schema in same database | Fast, easy to create | Search path and migration complexity | PostgreSQL monoliths |
| Tenant or account namespace | Shared database, unique tenant IDs | Fastest | Requires perfect test-data discipline | Mature multi-tenant apps |
| Transaction rollback | Shared database, per-test transaction | Very fast | Breaks with async workers and browser flows | Unit-level data access tests |

The dangerous middle ground is "we use unique test users" while cleanup still truncates shared tables. Namespacing test data helps, but it does not isolate schema migrations, sequences, background queues, full-table deletes, or advisory locks. If parallel jobs can perform destructive setup against the same database, unique users are not enough.

## Give Every CI Job a Stable Database Identity

Every job needs a deterministic identity. In GitHub Actions, the matrix value is usually enough. In GitLab CI, predefined parallel job variables can identify the node. The database name should include the pipeline or run identity and the shard identity so concurrent pipelines do not collide.

\`\`\`yaml
name: api-tests

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: app
          POSTGRES_DB: app_template
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      TEST_DATABASE_NAME: app_test_\${{ github.run_id }}_\${{ matrix.shard }}
      DATABASE_URL: postgresql://app:app@localhost:5432/app_test_\${{ github.run_id }}_\${{ matrix.shard }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run db:create:test
      - run: npm run db:migrate:test
      - run: npm run test:api -- --shard=\${{ matrix.shard }}/4
      - run: npm run db:drop:test
        if: always()
\`\`\`

The example uses one service container per job because GitHub Actions service containers are scoped to the job. Within that job, the database name still includes the run and shard, which makes logs and cleanup safer. If your CI provider schedules each matrix entry on a separate runner, container-level isolation may already be strong, but naming still matters for diagnostics.

## Create and Drop Databases Explicitly

Do not rely on application startup to create test databases implicitly unless your framework has a documented, reliable test database lifecycle. Explicit setup makes failures easier to diagnose: create failed, migration failed, seed failed, or tests failed. It also lets teardown run under \`always()\` conditions.

\`\`\`bash
set -euo pipefail

if [ -z "$TEST_DATABASE_NAME" ]; then
  echo "TEST_DATABASE_NAME is required"
  exit 1
fi

createdb "$TEST_DATABASE_NAME"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/test-seed.sql
\`\`\`

Teardown should terminate active connections before dropping the database if your database engine requires it. For PostgreSQL, teams often connect to a maintenance database and terminate sessions for the target database before \`dropdb\`. Keep that logic in a script owned by the platform or QA infrastructure team so every suite uses the same cleanup.

\`\`\`sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_setting('app.drop_database_name', true)
  AND pid <> pg_backend_pid();
\`\`\`

That SQL is a pattern, not a complete script. The important point is that teardown should be deliberate and observable. A failed drop should not hide the original test failure, but it should produce enough log output for cleanup jobs to remove stale databases later.

## Migrations Belong Inside Each Job Boundary

A parallel job must run migrations against its own isolated database before tests begin. Sharing a migrated database snapshot can be fast, but only if the snapshot is immutable for the job. Letting one shard run migrations while another shard reads or writes the same database is a direct path to nondeterministic failures.

| Migration strategy | Speed | Failure clarity | Risk |
|---|---:|---|---|
| Run full migrations per job | Moderate | High | Slow if migrations are heavy |
| Restore a schema-only dump per job | Fast | High | Dump can drift if not regenerated |
| Clone a template database per job | Very fast | Medium | Requires careful connection handling |
| Run migrations once on shared DB | Fast setup | Low | Unsafe for parallel jobs |

For most teams, full migrations per job are acceptable until they become a measurable bottleneck. When they do, optimize setup without weakening isolation. A schema-only dump generated from the same migration set gives speed while keeping each job independent.

\`\`\`bash
set -euo pipefail

template_url="postgresql://app:app@localhost:5432/app_template"

npm run db:migrate -- --database-url "$template_url"
pg_dump --schema-only "$template_url" > schema.sql

createdb "$TEST_DATABASE_NAME"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f schema.sql
\`\`\`

Do not invent a separate test schema by hand. If production migrations are the source of truth, CI should exercise them or a faithful artifact produced from them. Hand-maintained test DDL eventually drifts and masks migration defects.

## Seed Data Deterministically Per Job

Parallel database jobs need deterministic seed data that will not collide across shards. The simplest pattern is a small baseline seed plus factories that include the job identity in unique fields. Avoid global emails like \`admin@example.test\` unless each job has a separate database. If jobs share a server but use separate databases, global emails are fine inside each database. If jobs share a database with schema or tenant isolation, uniqueness needs a namespace.

\`\`\`ts
type TestIdentity = {
  runId: string;
  shard: string;
};

export function testEmail(identity: TestIdentity, label: string) {
  return \`\${label}+\${identity.runId}-\${identity.shard}@example.test\`;
}

export function testTenantSlug(identity: TestIdentity, label: string) {
  return [label, identity.runId, identity.shard].join('-');
}
\`\`\`

In your application code, use normal template strings or your factory library of choice.

| Seed type | Scope | Recommendation |
|---|---|---|
| Reference data | Countries, currencies, roles | Load once per isolated database |
| Synthetic users | Login identities and personas | Generate per job or per test |
| Mutable business objects | Orders, invoices, messages | Create inside test setup |
| Background jobs | Queue rows and schedules | Clear or namespace per job |
| Feature flags | Experiment states | Seed explicit state for each flow |

The main failure mode is accidental dependency on test order. If test B assumes user data created by test A, parallel sharding will expose it. A per-job database does not fix that. Each test still needs its own setup or an explicit fixture contract.

## Split Work Across Jobs and Workers Deliberately

There are two layers of parallelism: CI jobs and test-runner workers inside each job. A per-job database isolates one CI shard from another, but workers inside the same job can still collide if they share database rows. Decide whether worker-level isolation is necessary.

For browser E2E tests with shared login users, worker-level isolation usually helps. Playwright exposes a worker index to tests, and other runners have equivalent concepts. Use it to allocate unique accounts, schemas, or tenants inside the job database.

\`\`\`ts
import { test as base } from '@playwright/test';

type WorkerFixtures = {
  tenantSlug: string;
};

export const test = base.extend<WorkerFixtures>({
  tenantSlug: [
    async ({}, use, workerInfo) => {
      const runId = process.env.GITHUB_RUN_ID ?? process.env.CI_PIPELINE_ID ?? 'local';
      await use(['tenant', runId, String(workerInfo.workerIndex)].join('-'));
    },
    { scope: 'worker' },
  ],
});
\`\`\`

If you isolate by database per CI job and by tenant per worker, keep teardown aligned. Drop the whole database at job end, and avoid expensive per-worker cleanup unless a worker needs to reset state during the job.

## GitLab CI Matrix Example With Database Names

GitLab CI supports parallel jobs and exposes job identity variables for parallel execution. The exact syntax you choose depends on whether you use numeric parallelism or a matrix. The pattern remains the same: build the database name from the pipeline identity and the node identity, run setup, execute the shard, then clean up.

\`\`\`yaml
api_tests:
  image: node:22
  parallel: 4
  services:
    - name: postgres:16
      alias: postgres
  variables:
    POSTGRES_USER: app
    POSTGRES_PASSWORD: app
    POSTGRES_DB: app_template
    TEST_DATABASE_NAME: "app_test_\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"
    DATABASE_URL: "postgresql://app:app@postgres:5432/app_test_\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"
  before_script:
    - npm ci
    - npm run db:create:test
    - npm run db:migrate:test
  script:
    - npm run test:api -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  after_script:
    - npm run db:drop:test
  artifacts:
    when: always
    reports:
      junit: reports/junit.xml
\`\`\`

Make sure the test runner's shard numbering matches the CI variable convention. Some tools count shards from one, others expose zero-based worker indexes. Do not guess. Add a log line at the start of every job that prints the shard identity, total shard count, database name, and test selection command.

## Testcontainers for Job-Scoped Databases

Testcontainers is useful when you want each integration test process to start its own database container through code. In CI, it can simplify local parity because developers and CI use the same container lifecycle. The tradeoff is startup time and Docker availability. Use it when the suite benefits from realistic dependencies more than from raw speed.

\`\`\`ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export async function startTestDatabase() {
  const container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('app')
    .withUsername('app')
    .withPassword('app')
    .start();

  return {
    url: container.getConnectionUri(),
    stop: () => container.stop(),
  };
}
\`\`\`

Do not mix Testcontainers-managed databases with a shared CI service database unless the ownership is clear. One suite should not drop a database that another suite created. If you use Testcontainers for integration tests and service containers for E2E tests, give them separate environment variables and logs.

## Debug the Classic Failure: Unique Constraint Fails Only in CI

A common symptom is a unique constraint violation that appears only in CI parallel runs. The test creates \`qa@example.test\`, passes locally, and fails in CI because four shards create the same user in a shared database or shared tenant. Another variant is a cleanup job that deletes the user while another shard is logging in.

Diagnose with evidence. Log the database name, schema, tenant slug, test worker, and generated unique fields at creation time. Then inspect the failing row and the job that created it. If the database name is identical across shards, fix job isolation first. If the database is unique but tenant or email still collides inside a worker, fix factory namespacing.

| Symptom | Likely cause | Fix |
|---|---|---|
| Unique email collision across shards | Shared database or global factory value | Per-job database plus namespaced factories |
| Missing row during assertion | Cleanup from another test | Per-test setup or worker tenant isolation |
| Migration table locked | Multiple jobs migrating same database | Database per job |
| Sequence values surprise snapshots | Shared mutable sequence | Avoid asserting raw IDs or isolate database |
| Background worker processed another shard's job | Shared queue namespace | Queue per database or per worker |

The wrong fix is adding retries. Retries hide the race and extend CI time. Isolation removes the race.

## Keep Background Workers Inside the Same Boundary

Modern product tests often involve async workers: email delivery, report generation, billing webhooks, search indexing, and notification fanout. If the web app points at a per-job database but the worker points at a shared database or shared queue, your isolation is incomplete. The worker must receive the same \`DATABASE_URL\` and queue namespace as the test job.

\`\`\`yaml
services:
  postgres:
    image: postgres:16
  redis:
    image: redis:7

env:
  DATABASE_URL: postgresql://app:app@localhost:5432/app_test_\${{ github.run_id }}_\${{ matrix.shard }}
  QUEUE_PREFIX: app_test_\${{ github.run_id }}_\${{ matrix.shard }}
\`\`\`

This is where teams often get fooled. The API tests pass because HTTP writes are isolated, but assertions involving email, exports, or queues fail because workers share Redis keys or object storage paths. Treat every mutable dependency like the database: it needs a per-job namespace or a job-scoped instance.

## Make Teardown Observable, Not Magical

Teardown must run even when tests fail, but it should also leave enough information for investigation. If a database drop fails due to open connections, log the active sessions. If a migration fails, keep schema and migration logs as artifacts. If a test fails after creating important rows, dump a small diagnostic subset rather than the whole database.

\`\`\`bash
set +e

npm run test:api
test_status=$?

npm run db:diagnostics:test
npm run db:drop:test
drop_status=$?

if [ "$test_status" -ne 0 ]; then
  exit "$test_status"
fi

exit "$drop_status"
\`\`\`

That structure preserves the original test failure while still surfacing teardown problems when tests pass. It also gives CI logs a predictable shape for agents and humans to parse.

## What People Get Wrong About Per-Job Databases

The first mistake is isolating the database but sharing external state. Object storage buckets, Redis queues, search indexes, email inboxes, and feature flag stores can create the same cross-talk as SQL tables. Put their namespaces in the same identity model as the database.

The second mistake is creating one database per test when one per job would be enough. That makes the suite slow and pushes developers to bypass tests. Use per-test database isolation only for destructive migration tests or cases where tests cannot cleanly own their data.

The third mistake is hiding setup cost. If migrations take four minutes per job and you run eight jobs, measure it. A schema dump, template database, or Testcontainers reuse strategy may be justified, but only after isolation is correct.

## A Decision Matrix for Your Pipeline

Use this matrix when deciding where to invest. It keeps the discussion concrete and avoids the false choice between "one shared database" and "expensive container for every test."

| Suite type | Recommended isolation | Runner parallelism | Notes |
|---|---|---|---|
| Unit tests with mocked persistence | No real database | High | Keep out of database lifecycle entirely |
| Repository integration tests | Transaction or schema per worker | Medium | Avoid async workers inside transaction rollback |
| API contract tests | Database per CI job | Medium to high | Seed only contract fixtures |
| Browser E2E tests | Database per job, tenant per worker | Controlled | Keep login accounts and queues namespaced |
| Migration rollback tests | Fresh database per test or job | Low | Prioritize correctness over speed |
| Data export tests | Database plus object-store namespace per job | Medium | Preserve export artifacts on failure |

Review this matrix quarterly. As suites grow, the bottleneck moves. A design that was fine at two shards may fail at twelve because database server CPU, connection limits, or migration time becomes dominant.

Connection limits deserve their own check before you increase shard count. Four CI jobs with six test workers each can open more connections than a small database service allows, especially when the application pool, migration tool, and background worker each create their own pool. Record the maximum pool size per process and multiply it by jobs and workers. If the number is unrealistic, reduce pool size in test, cap runner workers, or move to one database container per job so failures stay local. A per-job database name does not help if every job still overwhelms the same shared database server.

## Frequently Asked Questions

### Is a schema per job enough isolation?

Sometimes. Schema-per-job isolation works well in PostgreSQL when your application can set the schema search path reliably and migrations are schema-aware. It is weaker when code uses hard-coded schema names, extensions, cross-schema queries, shared queues, or database-level objects. If background workers, migrations, and tests all respect the schema boundary, it can be fast and effective. If not, use separate databases or containers.

### Should every test create its own database?

Usually no. A database per test gives strong isolation but can make CI painfully slow, especially with full migrations. Start with a database per CI job and unique data per test or worker. Move to per-test databases only for migration tests, destructive integration tests, or suites where test setup cannot be made independent. The default should balance isolation, speed, and developer willingness to run the suite locally.

### How do I clean stale CI databases?

Name databases with pipeline or run identifiers and shard identifiers, then run a scheduled cleanup that drops databases older than your retention window. The cleanup should match only the test database naming prefix and should never run against production credentials. Keep logs of what was removed. Teardown in each job is still required; scheduled cleanup is a backstop for canceled jobs, runner crashes, and failed drop operations.

### Why do failures disappear when I run tests serially?

Serial execution hides shared-state races. Tests that pass one by one may still delete each other's rows, consume each other's jobs, reuse the same login user, or run migrations against the same database when parallelized. Treat "passes serially, fails in CI" as evidence to inspect database names, worker IDs, factories, queues, and cleanup hooks. Fix the isolation boundary before adding retries or longer waits.
`,
};
