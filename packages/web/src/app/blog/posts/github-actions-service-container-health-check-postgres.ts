import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Add a PostgreSQL Service-Container Health Check in GitHub Actions',
  description:
    'Add a PostgreSQL service-container health check in GitHub Actions so migrations and tests wait for readiness instead of racing database startup.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Add a PostgreSQL Service-Container Health Check in GitHub Actions

PostgreSQL prints "database system is ready to accept connections" a moment after the test process has already failed with connection refused. On the next rerun, everything passes. The container started successfully, but startup and readiness were treated as the same event.

GitHub Actions service containers accept Docker create options through \`options\`. A PostgreSQL health command based on \`pg_isready\` lets the runner wait for the container's health state before executing job steps.

## A complete runner-job configuration

When a job runs directly on a GitHub-hosted runner, publish the PostgreSQL port and connect through \`127.0.0.1\`. The service is not addressed by its label from the host network.

\`\`\`yaml
name: integration-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: app_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: app_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U app_test -d app_test"
          --health-interval 2s
          --health-timeout 5s
          --health-retries 10

    env:
      DATABASE_URL: postgresql://app_test:test_password@127.0.0.1:5432/app_test

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run db:migrate
      - run: npm test
\`\`\`

The health command runs inside the PostgreSQL container, so \`pg_isready\` is already present. Its user and database match initialization variables. No host client installation is required for Docker's health probe.

Pin the major PostgreSQL version your application supports. A floating \`latest\` tag can turn a routine dependency refresh into an unplanned database upgrade.

## What \`pg_isready\` proves

\`pg_isready\` checks whether a PostgreSQL server is accepting connections. It does not authenticate a password, run migrations, confirm extensions, or prove that an application query succeeds.

| Readiness layer | Example check | Failure it isolates |
|---|---|---|
| Docker process | Container remains running | Entry-point crash |
| PostgreSQL readiness | \`pg_isready -U app_test -d app_test\` | Server still starting or rejecting connections |
| Credential connection | \`psql "$DATABASE_URL" -c 'select 1'\` | Password, host, or database mismatch |
| Schema readiness | Migration command completes | Missing tables, extensions, or migration defects |
| Application readiness | Repository smoke query | Driver, TLS, pool, and SQL integration |

Use the health check as the first gate, then let migrations and a small application query provide deeper evidence. Do not expand the Docker health command into an entire migration system; repeated health probes must be fast and side-effect free.

## Job containers use different networking

If the job itself declares \`container:\`, GitHub connects the job container and service containers on a Docker network. Services are reachable by their label, and ports do not need to be published for container-to-container communication.

\`\`\`yaml
jobs:
  test-in-container:
    runs-on: ubuntu-latest
    container: node:22-bookworm

    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: app_test
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: app_test
        options: >-
          --health-cmd "pg_isready -U app_test -d app_test"
          --health-interval 2s
          --health-timeout 5s
          --health-retries 15

    env:
      DATABASE_URL: postgresql://app_test:test_password@postgres:5432/app_test

    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
\`\`\`

Using \`localhost\` here points back to the Node job container, not to PostgreSQL. Conversely, a runner job cannot normally resolve the service label as a host name and should use the published host port.

| Job execution mode | Database host | Port mapping needed? |
|---|---|---:|
| Steps run on runner VM | \`127.0.0.1\` | Yes |
| Steps run in job container | \`postgres\` service label | No |
| Another service container | \`postgres\` service label | No |

Many "health check did not work" reports are actually a network-address mismatch after readiness succeeded.

## Avoid fixed host-port collisions

On a fresh GitHub-hosted runner, \`5432:5432\` is usually uncomplicated. Self-hosted runners may already run PostgreSQL or execute multiple jobs. GitHub Actions can assign a random host port when only the container port is specified:

\`\`\`yaml
services:
  postgres:
    image: postgres:17-alpine
    env:
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: app_test
    ports:
      - 5432

steps:
  - name: Run integration tests
    env:
      PGPORT: \${{ job.services.postgres.ports[5432] }}
    run: npm run test:integration
\`\`\`

Construct the URL in the application or step using that context value. Inside a TypeScript template literal, the workflow expression must remain escaped in this article source, but the generated YAML contains the normal GitHub expression.

Random publication is irrelevant for job containers because they use the container port over the shared network.

## Tune probe timing from evidence

Docker health settings have distinct meanings:

| Option | Purpose | Bad configuration symptom |
|---|---|---|
| \`--health-interval\` | Delay between checks | Very short intervals add noise and load |
| \`--health-timeout\` | Maximum time for one check | Too short under a loaded runner produces false failures |
| \`--health-retries\` | Consecutive failures before unhealthy | Too few cannot absorb cold startup |
| \`--health-start-period\` | Grace period before failures count | Useful for unusually slow initialization |

The example's numbers are starting points, not universal performance claims. Measure cold starts on the slowest supported runner class. Keep the overall allowance short enough that a bad image or configuration fails promptly.

A long retry budget can hide a crash loop until minutes have passed. Container logs are the primary evidence when health never becomes green.

## Migrations begin after readiness, not before

Once GitHub starts steps, run migrations as an explicit step. That gives migration failures their own log section and exit status. Starting migrations in the PostgreSQL health command risks repeated, concurrent execution because Docker invokes that command many times.

Migration tools should use an advisory lock or their own locking mechanism if several job processes can migrate the same database. In this service-container pattern, a single migration step followed by tests is simpler.

Seed only reference data required by the suite. Large SQL imports can make the database accept connections while the application state is not ready, so treat import completion as a separate setup step.

The [GitHub Actions testing and CI/CD guide](/blog/github-actions-testing-ci-cd-guide) covers job matrices, caching, and artifacts. For application-managed ephemeral databases, the [Testcontainers PostgreSQL guide for Node](/blog/testcontainers-postgres-node-guide) explains a different lifecycle model.

## Health checks in a matrix

Each matrix job gets its own service container on GitHub-hosted runners. That isolation makes it safe to test multiple Node or PostgreSQL versions, subject to runner capacity. Include the database version in the image expression only from a controlled matrix value.

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    postgres: ['16-alpine', '17-alpine']

services:
  postgres:
    image: postgres:\${{ matrix.postgres }}
    env:
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: app_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U postgres -d app_test"
      --health-interval 2s
      --health-timeout 5s
      --health-retries 15
\`\`\`

On self-hosted infrastructure, confirm jobs truly receive isolated Docker daemons or nonconflicting ports. A matrix definition alone does not guarantee host isolation.

## Authentication subtleties in the official image

The official PostgreSQL image initializes a new data directory using \`POSTGRES_USER\`, \`POSTGRES_PASSWORD\`, and \`POSTGRES_DB\`. Those variables do not rewrite an already initialized persistent data directory. Service containers in typical GitHub-hosted jobs are fresh, but mounted volumes on self-hosted runners can surprise you.

\`pg_isready -U name\` can report that the server accepts connections even if that role would later fail authentication. The readiness utility intentionally checks server status. Follow with a real driver or \`psql\` connection when validating credentials matters.

Do not use production passwords. GitHub service containers are disposable and should use dedicated test credentials. If a secret is genuinely necessary, use GitHub secrets and ensure command tracing does not print the URL. A URL-encoded password must be encoded correctly if it contains reserved characters.

## Extensions, locale, and server settings

Readiness says nothing about required extensions. If the application needs PostGIS, use an appropriate trusted image and test the exact supported version. For ordinary extensions included with PostgreSQL, create them in migrations and let migration failure expose missing packages.

Server configuration can be supplied with the image command only when the workflow syntax and image entry point support it. Avoid undocumented environment keys. For a small change, a migration or explicit \`postgres -c name=value\` command is more transparent, but validate it against the official image documentation.

Locale and collation can affect ordering tests. A container default may differ from production. Prefer assertions that do not rely on unspecified ordering, or provision the relevant locale intentionally.

## Diagnosing unhealthy services

When a job never reaches its first step, inspect the service-container logs included by Actions. Common causes are a malformed health command, an invalid image tag, required password missing, incompatible data files on a mounted volume, or insufficient disk space.

When steps start but the client cannot connect, print safe topology facts: whether the job is containerized, selected host, selected port, and database name. Do not print the full connection string because it contains a password.

When the first query fails intermittently even though health passed, check whether the application launches another dependent service, whether migrations run concurrently, and whether connection pool configuration resolves IPv4 versus IPv6 differently. \`127.0.0.1\` is an explicit IPv4 choice for runner jobs.

## Service containers versus Testcontainers

GitHub service containers are declared in workflow YAML and exist for the job. They are easy to inspect and shared by all test processes. Testcontainers starts dependencies from test code, can allocate random ports, and can create several independent databases for suites that need stronger isolation.

| Decision | Actions service | Testcontainers |
|---|---|---|
| Lifecycle owner | GitHub runner | Test process/library |
| Configuration location | Workflow YAML | Test code |
| Local parity | Requires Compose or manual equivalent | Same library can run locally |
| One DB for whole job | Natural | Possible |
| DB per test suite or worker | Awkward | More natural, with higher startup cost |

Neither approach removes the need for readiness. Testcontainers has wait strategies; Actions uses Docker health status. Choose based on ownership and isolation rather than assuming one is categorically faster.

## A resilient workflow review

Confirm the health probe uses identifiers that exist after image initialization. Match the application's URL to the job network mode. Pin the database major version. Separate migration output from test output. Ensure the suite resets state or allocates namespaces when parallel processes share the database.

Test the failure path by temporarily using a bad database name in the application URL and confirm the logs identify authentication or database selection rather than timing. Temporarily break the health user and observe whether the job fails before steps. Restore both changes immediately.

Finally, remember that a healthy PostgreSQL service is infrastructure readiness, not test isolation. Parallel test workers can still collide in one schema. Health removes a startup race; fixtures and data ownership remove state races.

## Initialization scripts versus migrations

The official image executes files placed in its initialization directory only when creating a new data directory. GitHub Actions service syntax does not provide a direct inline file mount, so teams often build a small derived image or run SQL from a workflow step. Prefer the application's migration tool for application schema because it exercises the same path used in deployment.

Initialization scripts are appropriate for database-level setup that must exist before an application role can migrate, such as creating an additional database or role. Keep the image versioned and auditable. A script that succeeds on an empty database says nothing about upgrading an existing supported version, so retain a separate migration-upgrade test.

Never put secret expansion into a checked-in SQL file expecting the PostgreSQL image to substitute arbitrary variables. Use documented mechanisms, constrained test credentials, or a setup client with parameters.

## Parallel test workers after startup

All workers in a job connect to the same service unless the suite provisions separate schemas or databases. A healthy container can therefore host a deeply flaky suite. Give each worker a namespace, prevent concurrent migrations, and define whether cleanup truncates tables, rolls back transactions, or drops the namespace.

PostgreSQL connection limits also apply across workers. Four test processes with large default pools can exhaust a small service container. Configure a modest pool for CI and close it in test teardown. Readiness probes use brief extra connections, but they are rarely the dominant count.

If isolation requires a server per worker, a single workflow service is the wrong abstraction. Start per-worker containers through a test library or split work into matrix jobs, accepting the extra startup cost.

## Capturing diagnostics when tests fail

Actions automatically exposes service logs in its job diagnostics, but an explicit failure step can collect safe database facts before the runner is torn down. Use a client query for server version, current database, migration version, and connection counts. Do not dump application tables containing test credentials or personal-like fixtures.

Guard the diagnostic step with \`if: failure()\` and install or use a PostgreSQL client intentionally. The fact that \`pg_isready\` exists inside the service container does not mean \`psql\` exists on a custom job image.

Database logs can reveal SQL values. Review artifact retention and access before uploading them. Prefer targeted queries and correlation IDs over indiscriminate log bundles.

## Image pull and supply-chain considerations

A health check begins only after the image is pulled and the container is created. Registry outages, rate limits, or digest changes are not readiness failures. Separate those messages during triage.

Pinning a major tag controls compatibility but still allows patch updates. Teams needing fully reproducible infrastructure can pin an image digest and update it through a reviewed dependency process. That trades automatic security patches for deliberate maintenance, so the update process must be real.

Use trusted images and review derived Dockerfiles. Service containers execute with access to the job network, so an untrusted database image is not merely disposable test data.

## Resource sizing on hosted runners

PostgreSQL shares CPU, memory, and disk bandwidth with the build, browser tests, and other services in the job. A health check may pass, then queries slow dramatically while a compiler or browser saturates the runner. Increasing health retries does not solve post-start resource contention.

Measure migration time and representative query latency. Reduce excessive worker and pool counts before applying arbitrary statement timeouts. If the production schema or seed is legitimately large, use a larger runner or split jobs rather than making every timeout enormous.

Keep performance assertions out of a noisy shared integration job unless they use broad, evidence-based thresholds. The health gate is about availability, not a performance certification.

If tests are terminated, GitHub removes the service with the job, but application pools should still close normally. Clean shutdown catches leaked clients locally and prevents teardown errors from being mistaken for database startup problems. Use step-level timeouts for genuinely stuck suites while retaining enough time for failure diagnostics.

## Frequently Asked Questions

### Why use \`pg_isready\` instead of sleeping for ten seconds?

The probe advances as soon as PostgreSQL accepts connections and keeps waiting on slower starts. A fixed sleep is unnecessarily slow on fast runs and still insufficient under load.

### Why does \`postgres:5432\` work in a job container but not on the runner?

Container jobs join the service-container Docker network, where the service label resolves as a hostname. Runner-hosted steps use the published port on \`127.0.0.1\`.

### Does a healthy status prove the configured password works?

No. \`pg_isready\` reports server acceptance and does not need to complete authenticated SQL. Let the migration or a \`select 1\` connection check validate credentials.

### Should migrations run inside \`--health-cmd\`?

No. Health commands run repeatedly and should be fast and free of side effects. Run migrations once in a named workflow step after the service is healthy.

### How can a self-hosted runner avoid port 5432 collisions?

Publish only container port 5432 and use \`job.services.postgres.ports[5432]\` to obtain the assigned host port, or run the job in a container and connect over the service network without publishing a port.
`,
};
