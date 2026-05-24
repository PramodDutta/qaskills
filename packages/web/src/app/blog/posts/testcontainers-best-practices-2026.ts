import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Best Practices 2026 — Architecture Guide',
  description:
    'Architectural best practices for Testcontainers in 2026. Container reuse, parallelism, CI/CD optimization, debugging patterns, and team standards.',
  date: '2026-05-08',
  category: 'Reference',
  content: `
# Testcontainers Best Practices 2026

After years of working with Testcontainers across hundreds of projects, certain patterns have proven themselves and others have proven to be anti-patterns. This guide distills the architectural best practices for using Testcontainers in 2026 — across Node, Java, Go, Python, .NET, and Rust. The principles are language-agnostic; the code samples are illustrative.

Whether you are introducing Testcontainers to your team for the first time or scaling an existing test suite to 10,000+ integration tests, this guide covers the rules that prevent flakiness, accelerate test runs, simplify CI/CD configuration, and keep your test suite maintainable.

---

## Key Takeaways

- **Always pin image versions** — never use \`latest\`
- **Use container reuse for local dev, not CI** — they have opposite optimization goals
- **Prefer one container per test class/suite** over per-test
- **Use unique resource names** (queues, indexes, schemas) instead of cleanup
- **Run migrations inside the test setup** to catch schema drift
- **Parallelize test files, not tests within a file** to keep container counts manageable
- **Capture artifacts** (logs, screenshots, videos) on failure
- **Standardize on shared fixtures** across the team

---

## Best Practice 1: Pin Image Versions

Never use \`postgres:latest\` or \`mysql:latest\`. Always pin to a specific version that matches production:

\`\`\`typescript
// Good
new PostgreSqlContainer('postgres:16-alpine')

// Bad
new PostgreSqlContainer('postgres:latest')
\`\`\`

Why: when a new Postgres minor version releases overnight, your tests can break or pass differently. Pin to the exact tag, and update it in a deliberate PR.

---

## Best Practice 2: One Container Per Test Class

Spinning up a container per test costs 2-5 seconds and dominates suite runtime. Share containers across tests in the same class or describe block, and use isolation patterns:

| Pattern | When |
|---|---|
| Transactional rollback | Default — works for read/write tests without DDL |
| TRUNCATE between tests | Tests that issue DDL or use multiple transactions |
| Unique resource names | Tests that don't share resources at all |
| Container per test | Last resort — when other patterns don't work |

---

## Best Practice 3: Run Migrations in Setup

Run your schema migrations as part of the test setup, not as a separate script. This catches migration bugs immediately and mirrors production exactly:

\`\`\`typescript
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
});
\`\`\`

If migrations fail, tests fail immediately with clear errors.

---

## Best Practice 4: Use Container Reuse for Local Dev

Container reuse is the single biggest local-dev productivity gain. Enable it in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

And mark containers as reusable:

\`\`\`typescript
container = await new PostgreSqlContainer('postgres:16-alpine')
  .withReuse()
  .start();
\`\`\`

Local test startup drops from 5-30 seconds to under 1 second. Never enable reuse in CI — CI runs are fresh environments and reuse adds risk without benefit.

---

## Best Practice 5: Parallelize at the File Level

Most test runners can parallelize across test files. Don't parallelize within a file because each container costs RAM and CPU:

| Approach | Container Count | Total Cost |
|---|---|---|
| Parallel files, sequential tests within file | 1 per file | Low |
| Sequential files, parallel tests within file | 1 per file | Low |
| Parallel files AND tests | Many per file | High |
| Sequential everything | 1 per file | Low (but slow) |

The first option (parallel files, sequential tests within file) is the right default.

---

## Best Practice 6: Capture Logs on Failure

When tests fail, you need to know what happened in the container. Most Testcontainers SDKs offer a way to dump container logs:

\`\`\`typescript
afterEach(async (ctx) => {
  if (ctx.task.result?.state === 'fail') {
    const logs = await container.logs();
    console.log('Container logs:', logs);
  }
});
\`\`\`

For Selenium containers, configure video recording with \`RECORD_FAILING\` mode.

---

## Best Practice 7: Standardize on Shared Fixtures

Don't have every test file roll its own container setup. Build a small library of shared fixtures:

\`\`\`typescript
// test-helpers/postgres.ts
export async function startTestPostgres() {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const pool = new Pool({ connectionString: container.getConnectionUri() });
  await runMigrations(pool);
  return { container, pool };
}

export async function stopTestPostgres({ container, pool }) {
  await pool.end();
  await container.stop();
}
\`\`\`

Then use:

\`\`\`typescript
let env;
beforeAll(async () => { env = await startTestPostgres(); });
afterAll(async () => { await stopTestPostgres(env); });
\`\`\`

This ensures every test file uses the same Postgres version, migration runner, and connection pool config.

---

## Best Practice 8: Use Unique Names for Resources

For tests that create queues, indexes, topics, or buckets, give them unique names rather than cleaning up:

\`\`\`typescript
const queueName = \`test-queue-\${Date.now()}-\${Math.random().toString(36).slice(2)}\`;
\`\`\`

This avoids cleanup races and lets tests parallelize safely against a shared container.

---

## Best Practice 9: Wait for Readiness, Not Time

Never use \`sleep(5000)\` to wait for a container. Use the wait strategies built into Testcontainers:

\`\`\`typescript
await new GenericContainer('myapp:latest')
  .withExposedPorts(8080)
  .withWaitStrategy(Wait.forHttp('/health', 8080).forStatusCode(200))
  .start();
\`\`\`

For databases, the module containers (\`PostgreSqlContainer\`, \`MySqlContainer\`, etc.) already include the correct wait strategy. For custom containers, configure it explicitly.

---

## Best Practice 10: Optimize Image Pulls in CI

Pulling a 500 MB image on every CI run wastes 30+ seconds. Three strategies:

| Strategy | Cost | Win |
|---|---|---|
| Cache Docker layers in CI | Low (10 min setup) | 20-30s per run |
| Pre-warm runner with image | Medium | 30s per run |
| Use smaller images (alpine) | Free | 60% bandwidth reduction |

GitHub Actions caches images automatically on \`ubuntu-latest\`. For self-hosted runners, set up Docker Buildx caching.

---

## Best Practice 11: Limit Container RAM in Constrained Environments

If you run tests on a 4 GB CI runner with Postgres, Elasticsearch, and Kafka, you'll OOM. Set memory limits:

\`\`\`typescript
container = await new ElasticsearchContainer('elasticsearch:8.13.0')
  .withEnvironment({ ES_JAVA_OPTS: '-Xms512m -Xmx1g' })
  .start();
\`\`\`

Pick limits that match your production headroom.

---

## Best Practice 12: Handle Container Reaping Failures

Testcontainers ships a "Ryuk" sidecar that reaps containers when the test process exits. On some systems (Docker-in-Docker, certain CI), Ryuk doesn't work and containers leak. Two mitigations:

1. **Set \`TESTCONTAINERS_RYUK_DISABLED=true\`** and use \`docker container prune --filter "label=org.testcontainers=true"\` in CI cleanup.
2. **Use \`afterAll\` explicit cleanup**: always await \`container.stop()\`.

---

## Best Practice 13: Avoid Network Mode "host"

Tempting but problematic: \`host\` network mode bypasses Docker networking, but it makes parallel test runs impossible (port collisions) and works differently on macOS vs Linux. Stick with the default bridge network and use \`getMappedPort()\`.

---

## Best Practice 14: Use \`withCopyFilesToContainer\` for Fixtures

Don't bake test data into custom images. Use \`withCopyFilesToContainer\` to inject SQL fixtures, config files, or seed data:

\`\`\`typescript
container = await new PostgreSqlContainer('postgres:16-alpine')
  .withCopyFilesToContainer([
    { source: './fixtures/seed.sql', target: '/docker-entrypoint-initdb.d/seed.sql' },
  ])
  .start();
\`\`\`

Anything in \`/docker-entrypoint-initdb.d/\` runs automatically on Postgres startup.

---

## Best Practice 15: Test Container Configuration Itself

If your application depends on a specific Postgres extension, encode that in tests:

\`\`\`typescript
beforeAll(async () => {
  const result = await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  // verifies the extension is available in the image
});
\`\`\`

This catches misconfigured images before tests run.

---

## Anti-Pattern 1: Mocking Containers

Some teams "mock" Testcontainers by using a single shared container in CI. This defeats the purpose. Spin up real containers per suite.

---

## Anti-Pattern 2: Per-Test Containers Everywhere

Going to the other extreme — spinning up a fresh container for every single test — wastes 80% of suite runtime in container startup. Reserve per-test containers for the small fraction of tests that genuinely need isolation.

---

## Anti-Pattern 3: Mixed Versions Across Suites

If different test files use different Postgres versions, you'll see inconsistent behavior. Pick one version and use it everywhere.

---

## Anti-Pattern 4: Skipping Cleanup

Forgetting to await \`container.stop()\` leaks containers. In watch mode, leaks accumulate fast. Always have explicit cleanup.

---

## Anti-Pattern 5: Hardcoding Ports

Never assume Postgres is on 5432. Always use \`getMappedPort(5432)\` or \`getConnectionUri()\`.

---

## CI/CD Optimization Checklist

| Item | Done |
|---|---|
| Pin all image versions | [ ] |
| Cache Docker layers | [ ] |
| Use alpine variants where possible | [ ] |
| Limit container memory | [ ] |
| Disable Testcontainers logging at INFO+ in CI | [ ] |
| Parallel jobs across files, sequential within | [ ] |
| Upload artifacts (logs, videos) on failure | [ ] |
| Don't enable container reuse | [ ] |
| Pull images only once per workflow | [ ] |

---

## Local Dev Optimization Checklist

| Item | Done |
|---|---|
| Container reuse enabled | [ ] |
| Shared fixtures library | [ ] |
| Tests can run in watch mode | [ ] |
| Migrations cached if possible | [ ] |
| Vitest/pytest fork pool isolation | [ ] |
| Container logs captured in IDE | [ ] |

---

## Conclusion

Testcontainers is a powerful tool, but it has sharp edges. Pin versions, share containers per class, use unique resource names, run migrations in setup, parallelize at the file level, capture artifacts on failure, and standardize fixtures across the team. Follow these practices and your integration test suite will be fast, reliable, and maintainable for years.

Browse the [QA skills directory](/skills) for individual integration testing patterns, or read our deep dives on [PostgreSQL](/blog/testcontainers-postgresql-node-complete-guide), [Kafka](/blog/testcontainers-kafka-java-spring-boot-guide), and [Selenium](/blog/testcontainers-selenium-grid-guide).
`,
};
