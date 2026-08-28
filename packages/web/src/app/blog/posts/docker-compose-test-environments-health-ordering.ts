import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Environments with Docker Compose: Healthchecks, Ordering, Teardown',
  description: 'docker compose test environment patterns for healthchecks, startup ordering, and teardown help QA teams get repeatable integration runs in CI without stale state.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Test Environments with Docker Compose: Healthchecks, Ordering, Teardown

A docker compose test environment is a reproducible set of containers, networks, volumes, healthchecks, and test commands used to run integration tests against real dependencies. For QA teams, the payoff is simple: start services in a known state, wait for real readiness, run tests once, collect evidence, and tear everything down without carrying stale data into the next run.

Compose is not only for local development. It is often the most practical way to run database, cache, queue, browser, and API dependencies in CI when the full production platform is too heavy. The hard part is not writing a YAML file. The hard part is making startup ordering and teardown honest.

## Define Readiness, Not Just Startup

Container startup means the process was launched. Readiness means the dependency can answer the operation your tests need. Those are different. A PostgreSQL container can be running before it accepts connections. A web app can bind a port before migrations finish. A queue worker can start before the queue exists.

| Dependency | Weak readiness signal | Better healthcheck |
|---|---|---|
| PostgreSQL | Port 5432 is open | \`pg_isready\` against the test database |
| Redis | Container is running | \`redis-cli ping\` returns PONG |
| API | Port responds | \`/health\` verifies database and migrations |
| Worker | Process exists | Health endpoint or command proves queue subscription |
| Browser service | HTTP port open | WebDriver or browser status endpoint responds |

The Compose file should encode readiness close to the service definition. That makes the contract visible to both developers and CI.

\`\`\`yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app_test"]
      interval: 2s
      timeout: 3s
      retries: 20
    volumes:
      - db-data:/var/lib/postgresql/data

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 20

volumes:
  db-data:
\`\`\`

The exact image versions should match your support policy. The important test idea is stable: a healthcheck should verify the dependency behavior, not merely the existence of a process.

## Use One-Shot Services For Migrations

Tests should not race migrations. A clean Compose pattern is a one-shot migration service that waits for the database to be healthy, runs migrations, exits successfully, and then lets the test service start.

\`\`\`yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app_test"]
      interval: 2s
      timeout: 3s
      retries: 20

  migrator:
    image: node:22-bookworm-slim
    working_dir: /workspace
    volumes:
      - .:/workspace
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app_test
    command: ["sh", "-lc", "npm ci && npm run db:migrate"]
    depends_on:
      db:
        condition: service_healthy

  tests:
    image: node:22-bookworm-slim
    working_dir: /workspace
    volumes:
      - .:/workspace
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app_test
      REDIS_URL: redis://redis:6379
    command: ["sh", "-lc", "npm test"]
    depends_on:
      db:
        condition: service_healthy
      migrator:
        condition: service_completed_successfully
      redis:
        condition: service_healthy

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 20
\`\`\`

The official Compose documentation is at https://docs.docker.com/compose/. Use it for syntax details, especially when your CI image has an older Compose plugin.

## Run Tests As A Container, Not A Host Guess

When tests run on the host and dependencies run in containers, the host has to know mapped ports, environment files, and timing. That can work, but it creates two paths: local host tests and CI container tests. Running the test command as a Compose service keeps the network names and environment consistent.

\`\`\`bash
docker compose -f compose.test.yml up \\
  --abort-on-container-exit \\
  --exit-code-from tests \\
  tests
\`\`\`

\`--abort-on-container-exit\` stops the environment when the test container exits. \`--exit-code-from tests\` makes the Compose command return the test service result, which is what CI needs.

| Choice | When it works | Risk |
|---|---|---|
| Host runs tests, Compose runs dependencies | Fast local loops with stable port mapping | CI differs from local network behavior |
| Compose test service runs tests | Integration CI and onboarding | Image build or npm install time |
| Testcontainers creates dependencies | Per-test isolation in code | More runner-specific setup |
| Full deployed environment | Release confidence | Slow feedback and harder cleanup |

For suites that need per-test dependency lifecycles inside code, [Testcontainers and Docker integration testing](/blog/testcontainers-docker-integration-testing) may be a better fit. Compose shines when the environment is shared across a focused integration suite.

## Make Healthchecks Match The Failure You Care About

A healthcheck that is too shallow gives false confidence. A healthcheck that is too deep makes unrelated dependencies block startup. Keep it honest and scoped.

For an API, a test environment health endpoint should verify the dependency path needed by tests. If the suite needs database reads and migrations, check both. If it does not need a third-party payment sandbox, do not block readiness on that external service.

\`\`\`ts
import http from "node:http";

type Health = {
  ok: boolean;
  database: "ok" | "error";
  migrations: "ok" | "error";
};

export function startHealthServer(check: () => Promise<Health>) {
  const server = http.createServer(async (_request, response) => {
    try {
      const health = await check();
      response.statusCode = health.ok ? 200 : 503;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(health));
    } catch (error) {
      response.statusCode = 503;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ ok: false, error: "health_check_failed" }));
    }
  });

  server.listen(3000);
  return server;
}
\`\`\`

The matching Compose healthcheck can call that endpoint from inside the container.

\`\`\`yaml
services:
  api:
    build:
      context: .
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app_test
    healthcheck:
      test: ["CMD-SHELL", "node scripts/check-health.mjs http://localhost:3000/health"]
      interval: 3s
      timeout: 3s
      retries: 30
    depends_on:
      db:
        condition: service_healthy
\`\`\`

A tiny Node health checker avoids assuming curl or wget is installed in every image.

\`\`\`js
import http from "node:http";

const url = process.argv[2];

if (!url) {
  console.error("usage: node scripts/check-health.mjs <url>");
  process.exit(2);
}

const request = http.get(url, (response) => {
  if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
    process.exit(0);
  }

  console.error("health check failed with status", response.statusCode);
  process.exit(1);
});

request.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

request.setTimeout(2500, () => {
  request.destroy(new Error("health check timed out"));
});
\`\`\`

That script runs with Node's standard library. No extra package is needed.

## Keep The Network Contract Visible

Inside a Compose network, services reach each other by service name. The API should use \`db\`, not \`localhost\`, to reach PostgreSQL. The browser running inside a test container should use the API service name if it is not testing a host-published port.

\`\`\`yaml
services:
  api:
    build:
      context: .
    environment:
      DATABASE_URL: postgres://app:app@db:5432/app_test
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  e2e:
    image: mcr.microsoft.com/playwright:v1.46.0-jammy
    working_dir: /workspace
    volumes:
      - .:/workspace
    environment:
      BASE_URL: http://api:3000
    command: ["sh", "-lc", "npm ci && npx playwright test --grep checkout"]
    depends_on:
      api:
        condition: service_healthy
\`\`\`

Before adopting a vendor image, check its current official tags in that vendor's docs. Do not update test images casually. Browser and OS changes can alter screenshots, font rendering, and TLS behavior.

## Teardown Must Match State Risk

Teardown is not cleanup theater. It is risk control. Decide what state can survive and what must be destroyed.

| State | Keep between runs? | Teardown action |
|---|---|---|
| Database volume with test rows | Usually no in CI | \`docker compose down --volumes\` |
| Build cache | Yes when CI cache is controlled | Leave to builder or CI cache |
| Named network | No | \`down\` removes project network |
| Test artifacts | Yes on failure | Upload logs, traces, screenshots |
| External sandbox data | Depends | Use API cleanup or unique test namespace |

The safest default for CI integration tests is to remove volumes. That prevents yesterday's migration residue from making today's test pass.

\`\`\`bash
set -euo pipefail

compose_file="compose.test.yml"

cleanup() {
  docker compose -f "$compose_file" down --volumes --remove-orphans
}

trap cleanup EXIT

docker compose -f "$compose_file" up \\
  --abort-on-container-exit \\
  --exit-code-from tests \\
  tests
\`\`\`

This script runs teardown even when tests fail. Keep it in the repo so developers and CI use the same path.

## Capture Evidence Before Containers Disappear

If teardown runs too early, you lose the logs needed to diagnose failures. Capture logs and artifacts before calling \`down --volumes\`.

\`\`\`bash
set -euo pipefail

compose_file="compose.test.yml"
artifact_dir="test-artifacts"
mkdir -p "$artifact_dir"

status=0
docker compose -f "$compose_file" up \\
  --abort-on-container-exit \\
  --exit-code-from tests \\
  tests || status=$?

docker compose -f "$compose_file" logs --no-color > "$artifact_dir/compose.log" || true
docker compose -f "$compose_file" down --volumes --remove-orphans

exit "$status"
\`\`\`

In GitHub Actions, upload the artifacts only when the job fails.

\`\`\`yaml
name: integration

on:
  pull_request:

jobs:
  compose-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: ./scripts/run-compose-tests.sh
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: compose-test-artifacts
          path: test-artifacts
\`\`\`

The artifact should answer the first diagnostic question: did a dependency fail readiness, did migrations fail, or did the test assertions fail?

## A Failure Story: The App Was Up, The Schema Was Old

The symptom was a CI test that failed once or twice a week with "column not found" from the API. The wrong theory was that PostgreSQL was starting slowly. The team increased sleeps from five seconds to thirty. The failure became less frequent, but it did not disappear.

The actual cause was startup ordering. The API container became healthy when \`/health\` returned 200, but that endpoint checked only the HTTP process. Migrations were running in another container at the same time. Sometimes tests hit the API before the migration container added the new column.

The fix was to make migrations a one-shot service and make the test service depend on \`service_completed_successfully\` for the migrator. The API healthcheck also started verifying the migration version needed by the app. The sleeps were removed. The failure stopped because readiness finally meant "ready for this test," not "a port answered."

That pattern is common. Sleep hides missing contracts. Healthchecks document them.

## Compose Files Should Stay Test-Specific

Do not overload the development Compose file with every CI behavior. Development environments often keep volumes, expose ports, and run hot reload. Test environments often need one-shot startup, no interactive ports, and hard teardown. Split the files when the goals differ.

\`\`\`yaml
services:
  tests:
    image: node:22-bookworm-slim
    working_dir: /workspace
    volumes:
      - .:/workspace
    environment:
      NODE_ENV: test
      DATABASE_URL: postgres://app:app@db:5432/app_test
    command: ["sh", "-lc", "npm ci && npm test"]
    depends_on:
      db:
        condition: service_healthy
\`\`\`

Keep secrets out of the Compose file. Test passwords like \`app\` are fine for local containers. Real credentials belong in CI secrets or a local environment file that is not committed.

## Test Data Reset: Volume Removal Is Not Always Enough

Removing volumes resets container storage, but it does not reset external services. If your Compose test environment calls a payment sandbox, email sandbox, object store, or shared auth tenant, use unique namespaces and cleanup APIs.

| Resource | Isolation technique | Assertion to add |
|---|---|---|
| Database | Fresh volume or schema | No rows exist before seed |
| Object storage | Prefix per run | Only prefixed objects are deleted |
| Email sandbox | Unique recipient domain or tag | Expected message count for run id |
| Auth tenant | Dedicated test tenant | User count returns to baseline |
| Cache | Flush test database or use namespace | No keys from previous run id |

For database-heavy features, test teardown should also cover cascading deletes when the suite depends on cleanup SQL. If a delete leaves child rows behind, later Compose runs can fail in confusing ways. See [database cascade delete behavior](/blog/database-testing-cascade-delete-behavior) when cleanup correctness is part of the risk.

## What Practitioners Get Wrong

The mistake I see most is using \`depends_on\` as if it always meant "ready." Basic dependency order is not the same as health-gated readiness. If tests rely on a database, queue, or API, write the healthcheck that proves the specific dependency is usable.

The second mistake is keeping volumes in CI to save seconds. That can be reasonable for build caches, but it is dangerous for data stores unless the suite is designed for persistent state. A test database that survives across pull requests is not a test fixture. It is a shared environment with memory.

The third mistake is hiding Compose commands in CI YAML only. Developers then debug a different environment locally. Put the run script in the repo, and let CI call it.

## Give Every Run Its Own Project Name

Compose uses a project name to prefix networks, volumes, and containers. If two CI jobs share the same project name on the same runner, they can collide. The failure may look like a port conflict, a missing container, or a test reading another job's database volume. Use a unique project name for CI runs and keep it readable enough for logs.

\`\`\`bash
set -euo pipefail

compose_file="compose.test.yml"
project_name="qa_\${GITHUB_RUN_ID:-local}_\${GITHUB_RUN_ATTEMPT:-1}"

docker compose -p "$project_name" -f "$compose_file" up \\
  --abort-on-container-exit \\
  --exit-code-from tests \\
  tests

docker compose -p "$project_name" -f "$compose_file" down --volumes --remove-orphans
\`\`\`

In the source for a real script, keep the variable expansion exactly as your shell expects. The key test-environment rule is simpler: one run should not share networks or volumes with another run unless sharing is an intentional performance tradeoff.

Project names also help when developers run focused tests locally. A developer can keep a dev stack running under one project name and run destructive integration tests under another. That separation prevents a test teardown from deleting the database volume used for manual debugging.

| Collision symptom | Likely cause | Fix |
|---|---|---|
| Test reads unexpected rows | Reused named volume | Unique project name plus volume teardown |
| Port already allocated | Multiple projects publish same host port | Avoid host ports or assign unique ports |
| Logs include old container names | Stale project resources | \`down --remove-orphans\` with the right project |
| CI passes after a failed migration | Previous volume already had schema | Remove volumes for test runs |

Avoid publishing ports unless the host needs them. Containers in the same Compose project can talk over service names, so most test services do not need host ports at all.

## Seed Data Should Prove The Reset Worked

Seeding is part of the environment contract. If seed data assumes an empty database, assert emptiness before seeding. If it updates existing rows, make that idempotent by design and test the count after seeding.

\`\`\`sql
DO $$
DECLARE
  existing_users integer;
BEGIN
  SELECT count(*) INTO existing_users FROM users;

  IF existing_users <> 0 THEN
    RAISE EXCEPTION 'test database is not empty before seed: % users', existing_users;
  END IF;
END;
$$;

INSERT INTO users (id, email, role)
VALUES
  ('user_owner', 'owner@example.test', 'owner'),
  ('user_member', 'member@example.test', 'member');
\`\`\`

That check turns stale state into an immediate setup failure. Without it, stale state becomes a mystery assertion later in the suite.

For larger systems, split seed data into baseline and scenario data. Baseline data belongs in the environment startup because many tests need it. Scenario data belongs in the test itself so the condition under test remains visible. A checkout test should create its own cart. A permission test should create its own role assignment. The Compose environment should not hide the reason a test passes.

## Know When Compose Is The Wrong Boundary

Compose is a good environment boundary. It is not always a good test isolation boundary. If tests mutate shared database rows in parallel, one Compose stack for the whole suite may be too coarse. Either run the suite serially, isolate each test with transactions or schemas, or move dependency lifecycle into the test runner.

Use this decision rule: if the dependency state is expensive to start but cheap to reset, Compose plus per-test cleanup works well. If state is cheap to start and hard to reset, create it per test. If the suite needs to prove startup behavior itself, Compose is the right subject of the test and should stay visible.

This distinction keeps teams from blaming Compose for fixture problems. Compose can provide a clean PostgreSQL instance. It cannot make two tests stop updating the same account row at the same time.

## Use Profiles To Keep Optional Services Honest

Compose profiles are useful when one suite needs a browser service, cache, or extra emulator and another suite does not. Keep profiles named after test needs, not team names. A profile called \`cache\` is easier to understand than \`qa\` because it says why the service starts.

\`\`\`yaml
services:
  cache:
    image: redis:7
    profiles: ["cache"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 20

  cache-tests:
    image: node:22-bookworm-slim
    working_dir: /workspace
    volumes:
      - .:/workspace
    environment:
      REDIS_URL: redis://cache:6379
    command: ["sh", "-lc", "npm ci && npm test -- cache"]
    profiles: ["cache"]
    depends_on:
      cache:
        condition: service_healthy
\`\`\`

Profiles should not hide required dependencies. If every integration test needs PostgreSQL, PostgreSQL should not sit behind an optional profile. Use profiles only for services that are genuinely conditional, and make the run script pass the profile explicitly so CI logs show which environment was requested.

## A Practical Review Checklist

Use this when reviewing a Compose test environment.

| Review item | Pass signal | Failure signal |
|---|---|---|
| Healthcheck depth | Checks the operation tests need | Port-only or process-only readiness |
| Migration ordering | Tests wait for migration success | API and migrator race |
| Exit code | Compose returns test service status | CI passes after failed tests |
| Teardown | Volumes removed when state matters | Data leaks between runs |
| Artifacts | Logs captured before down | Failure has no evidence |
| Network names | Containers use service DNS names | localhost confusion inside containers |
| Local parity | Developer and CI run same script | CI-only orchestration |

The highest signal review question is direct: if the slowest dependency starts late, which line prevents the test from racing it? If nobody can point to that line, the environment is not ready for CI.

## Frequently Asked Questions

### Should integration tests run inside Docker Compose or on the host?

Run tests inside Compose when network names, dependency versions, and CI parity matter more than local speed. Host-run tests can be fine for quick loops, but they need careful port mapping and environment setup. A Compose test service gives the suite the same service DNS names and dependency paths in local and CI runs. For complex per-test dependency lifecycles, Testcontainers may be a better fit than one shared Compose environment.

### Does depends_on wait until a service is ready?

Plain startup order is not the same as readiness. Use healthchecks and dependency conditions when a service must be usable before another service starts. For example, a test service can wait for a database service to be healthy and a migration service to complete successfully. The healthcheck itself still needs to be meaningful. A port check only proves that a socket opened, not that the schema or queue is ready.

### Should CI remove Docker Compose volumes after every test run?

Usually yes for integration test databases, caches, and queues. Removing volumes prevents old rows, old migrations, and stale cache keys from affecting the next run. Keep build caches separately if speed matters, but do not preserve mutable test data unless the suite is explicitly designed for that. Always capture logs and test artifacts before teardown, because \`down --volumes\` removes the state you may need for diagnosis.

### What should a Docker Compose healthcheck verify?

A healthcheck should verify the dependency behavior required by the tests. For PostgreSQL, that usually means accepting a connection to the test database. For an API, it may mean the HTTP process is alive, the database is reachable, and migrations are at the expected version. Do not make healthchecks depend on unrelated external services unless the tests need those services. Good healthchecks are specific enough to prevent races and small enough to avoid false blockers.
`,
};
