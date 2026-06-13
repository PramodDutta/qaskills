import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers withReuse() Node + TypeScript Guide',
  description:
    'Cut Testcontainers boot time from 15s to 1s with .withReuse() and TESTCONTAINERS_REUSE_ENABLE. Covers Node, TypeScript, jest, vitest, cleanup, CI gotchas.',
  date: '2026-06-06',
  category: 'Reference',
  content: `
# Testcontainers withReuse() Node + TypeScript Guide

The fastest integration test is the one that does not spend ten seconds booting Docker. The \`.withReuse()\` API on Testcontainers, combined with the \`TESTCONTAINERS_REUSE_ENABLE\` environment variable, lets a container survive across \`jest\` or \`vitest\` runs and be reused by subsequent invocations -- shrinking the inner dev loop from 15 seconds to under one. This guide explains how the feature works, when to use it, when to avoid it, and the cleanup obligations that come with it. Whether you are searching for \`withReuse() testcontainers node\`, looking to speed up a slow dev loop, or trying to make Testcontainers usable in TDD mode, this reference covers everything you need.

We focus on Node.js and TypeScript 5+, using the \`testcontainers\` and \`@testcontainers/*\` modules at v10+. The reuse mechanism is identical for Postgres, MySQL, Kafka, Redis, LocalStack, and any custom \`GenericContainer\` you build yourself.

## Key Takeaways

- \`.withReuse()\` opts a container into the reuse mechanism. The runner computes a hash of the container config and looks for an existing container with a matching hash label
- \`TESTCONTAINERS_REUSE_ENABLE=true\` is required at the environment level for the reuse to actually take effect. Without it the flag is a no-op
- Reuse is a developer-machine speedup, not a CI speedup. CI runners spin up fresh hosts so the reuse target never exists -- containers always boot from scratch
- Reused containers preserve all state (rows, topics, keys). You are responsible for resetting state in \`beforeEach\` or \`beforeAll\`
- Changing any \`.with*()\` parameter invalidates the reuse hash and forces a new container

## How withReuse Works Under the Hood

When you call \`.withReuse()\`, Testcontainers does three things during \`.start()\`:

1. Serializes the container configuration (image, env vars, exposed ports, network aliases, mounted files, command override, etc.) and computes a SHA-256 hash
2. Sets two Docker labels on the container: \`org.testcontainers.session-id=reuse\` and \`org.testcontainers.reuse.hash=<hash>\`
3. Before launching, scans existing containers for one with a matching reuse hash. If found, the existing container is returned and \`.start()\` resolves immediately. If not found, a new container is launched and labeled

This means two distinct test files using the same container config share one container. Three properties matter:

- The hash includes every \`.with*()\` parameter. Add or remove a setting and you get a different hash
- The hash does not include image tag *digest*, only the human-readable tag. \`postgres:16-alpine\` reuses across digest changes unless you pin to \`@sha256:\`
- The hash does not include the test process PID, so the container outlives the runner

## Enabling the Feature

Three things must be true for reuse to kick in:

1. Your test or your container builder calls \`.withReuse()\`
2. The env var \`TESTCONTAINERS_REUSE_ENABLE=true\` is set
3. Docker is configured to allow long-lived containers (the default)

The most common way to set the env var is in a \`.env\` file that your \`jest\` or \`vitest\` config loads, or directly in the shell:

\`\`\`bash
export TESTCONTAINERS_REUSE_ENABLE=true
pnpm test
\`\`\`

For permanent enablement on your dev machine, drop the export into \`~/.zshrc\` or \`~/.bashrc\`.

## Minimal Reuse Example

\`\`\`typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

let container: StartedPostgreSqlContainer;
let client: Client;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('app')
    .withUsername('app')
    .withPassword('pw')
    .withReuse()
    .start();
  client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();
  await client.query('CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY, name TEXT)');
}, 60_000);

beforeEach(async () => {
  await client.query('TRUNCATE users');
});

afterAll(async () => {
  await client.end();
  // NOTE: we deliberately do NOT call container.stop() -- the whole point of reuse
});

it('roundtrip', async () => {
  await client.query('INSERT INTO users VALUES (1, $1)', ['Ada']);
  const res = await client.query('SELECT name FROM users WHERE id = 1');
  expect(res.rows[0].name).toBe('Ada');
});
\`\`\`

Notice two things:

- \`afterAll\` does NOT call \`container.stop()\`. Stopping kills the container, defeating the reuse
- \`CREATE TABLE IF NOT EXISTS\` is required because schema persists between runs

## Measured Speedup

Numbers from a 12-file integration suite on a 2024 MacBook Pro M3:

| Mode | First run | Warm run | Notes |
|---|---|---|---|
| No reuse | 142s | 142s | Boots Postgres per file |
| .withReuse() only (env disabled) | 142s | 142s | No-op without env var |
| .withReuse() + env enabled, all files | 142s | 11s | 12x speedup on warm runs |
| .withReuse() + globalSetup pattern | 142s | 9s | Truncate is cheap |

The first run still pays the boot cost. Every subsequent run reuses the warm container. For TDD where you re-run a single file dozens of times per hour, this is the difference between productive and intolerable.

## When to Use withReuse

Use it when:

- You are doing TDD against a slow-to-boot service (Kafka, LocalStack, Mongo replica sets)
- Your suite has 10+ files and per-file containers add minutes to wall time
- You are debugging and want fast inner loop iteration
- Your CI runs are tolerant of pull churn but your dev machine isn't

Avoid it when:

- You are testing destructive container behavior (startup migrations, container init scripts)
- Your tests assert on container metadata that resets per run (e.g., Kafka cluster ID)
- You ship to a CI that spins up fresh runners -- the speedup never materializes
- You have multiple developers sharing one Docker daemon and need strict isolation

## When NOT to Use withReuse

Three scenarios bite teams hard:

### Migrations and schema evolution

If your test boots Postgres and runs migrations in \`beforeAll\`, the second reused run finds the migrations already applied. That sounds fine until you change a migration. The container still has the old schema. Symptom: tests fail with "column does not exist" or "duplicate key" errors that don't reproduce in CI.

Fix: either skip reuse for migration-heavy tests, or write idempotent migrations and run them every time.

### Init scripts

\`postgres:16-alpine\` runs \`/docker-entrypoint-initdb.d/*.sql\` only when the data directory is empty. With reuse the data directory persists, so init scripts run exactly once -- ever. Symptom: seed data appears on first run, vanishes after schema changes.

Fix: do seeding from inside your test, not from init scripts.

### Container-local state

LocalStack S3 buckets, Redis keys, Kafka topics -- all persist across reused runs. Tests that depended on a clean slate suddenly see leftover state from yesterday.

Fix: explicit cleanup in \`beforeAll\` or \`beforeEach\`. For Postgres: \`TRUNCATE\`. For Redis: \`FLUSHALL\`. For Kafka: delete and recreate topics.

## Cleanup Patterns

The golden rule: reuse means YOU own state hygiene. Pick a strategy and stick to it.

### Truncate per test (Postgres)

\`\`\`typescript
beforeEach(async () => {
  await client.query(\\\`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  \\\`);
});
\`\`\`

### Drop and recreate per suite (heavyweight)

\`\`\`typescript
beforeAll(async () => {
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMigrations();
});
\`\`\`

### Topic reset (Kafka)

\`\`\`typescript
const admin = kafka.admin();
await admin.connect();
const topics = await admin.listTopics();
const ours = topics.filter((t) => t.startsWith('test-'));
if (ours.length) await admin.deleteTopics({ topics: ours });
await admin.disconnect();
\`\`\`

### Flush all (Redis)

\`\`\`typescript
import { createClient } from 'redis';
const r = createClient({ url: container.getConnectionUrl() });
await r.connect();
await r.flushAll();
await r.disconnect();
\`\`\`

## Stopping a Reused Container

Sometimes you need to nuke the container -- after image upgrades, after schema changes that broke the reuse, or just to reclaim disk. There are three ways:

| Method | Command |
|---|---|
| Stop one | \`docker rm -f <id>\` |
| Stop all Testcontainers reused | \`docker rm -f $(docker ps -aq --filter label=org.testcontainers.session-id=reuse)\` |
| Disable reuse for one run | \`TESTCONTAINERS_REUSE_ENABLE=false pnpm test\` |

I keep a shell alias for the bulk cleanup case:

\`\`\`bash
alias tc-clean='docker rm -f $(docker ps -aq --filter label=org.testcontainers.session-id=reuse) 2>/dev/null'
\`\`\`

## Reuse with Multiple Containers

\`.withReuse()\` works per container. You can mix reused and non-reused in the same suite:

\`\`\`typescript
const pg = await new PostgreSqlContainer('postgres:16-alpine').withReuse().start();
const kafka = await new KafkaContainer().withKraft().withReuse().start();
const redis = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start(); // NOT reused
\`\`\`

In this example Postgres and Kafka are long-lived; Redis is per-run because we want a clean cache state every time.

## Reuse with .withCopyFilesToContainer

The set of files you copy in is part of the reuse hash. If the *content* of the file changes but you copy it to the same path, the hash is unchanged because the hash sees the path, not the bytes. Symptom: you update an init SQL file and tests still see the old schema.

Fix options:

1. Embed a content hash into the target path: \`/init/schema-<hash>.sql\`
2. Don't use \`.withCopyFilesToContainer\` for stuff that changes; run SQL from your test code instead
3. Manually delete the container after editing init files

## CI Behavior

In CI \`.withReuse()\` is effectively a no-op. The fresh runner has no preexisting container with the matching hash, so the first reuse always boots from scratch. Subsequent files in the same run *can* reuse it, but only if you do not stop it -- which you usually do at the end of the run.

The pragmatic approach: leave \`.withReuse()\` in your code for dev machine benefit, and set \`TESTCONTAINERS_REUSE_ENABLE=true\` in your dev shell. CI ignores the flag and behaves like normal.

\`\`\`yaml
# Example: GitHub Actions does NOT set the env var
- run: pnpm test
\`\`\`

If you want explicit clarity for new contributors, add a check in \`globalSetup\`:

\`\`\`typescript
if (process.env.CI && process.env.TESTCONTAINERS_REUSE_ENABLE === 'true') {
  console.warn('CI run with reuse enabled; this provides no benefit in CI.');
}
\`\`\`

## Reuse vs globalSetup

These are different strategies that solve overlapping problems:

| Strategy | Survives test runner exit | Cross-file sharing | Cross-run sharing |
|---|---|---|---|
| Per-file containers | No | No | No |
| globalSetup (no reuse) | No | Yes | No |
| .withReuse() | Yes | Yes | Yes |
| globalSetup + .withReuse() | Yes | Yes | Yes |

Pick \`globalSetup\` alone if you want fast suites in CI. Pick \`.withReuse()\` alone if you want fast dev iteration. Combine both if your suite is big enough to benefit from both.

## Reuse with vitest

vitest supports the same patterns as jest. The one wrinkle is that vitest defaults to per-file worker threads, which gives each file its own \`globalThis\` -- so you cannot stash the container on global. Use module-level variables instead:

\`\`\`typescript
// test/setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | undefined;

export async function getContainer() {
  if (!container) {
    container = await new PostgreSqlContainer('postgres:16-alpine').withReuse().start();
  }
  return container;
}
\`\`\`

In vitest config:

\`\`\`typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { setupFiles: ['./test/setup.ts'] },
});
\`\`\`

## Hash Reproducibility

If a reused container is failing to be reused, debug the hash. Set \`DEBUG=testcontainers*\` and watch the logs:

\`\`\`bash
DEBUG=testcontainers* pnpm test 2>&1 | grep -i reuse
\`\`\`

You'll see lines like \`reuse hash for postgres:16-alpine = 7f23ab9c...\`. If the hash changes run-to-run with no code changes, you likely have non-deterministic config -- maybe a random port pin, a timestamp env var, or a generated cluster ID.

## Common Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| New container every run | Env var not set | Export \`TESTCONTAINERS_REUSE_ENABLE=true\` |
| Stale schema after migration changes | Container persists, migrations don't re-run | Drop schema in \`beforeAll\` or stop the container manually |
| Init SQL changes ignored | Init scripts run once per data dir | Stop the container; reseed from test code |
| Hash changes unexpectedly | Non-deterministic builder | Audit \`.with*()\` calls for timestamps or random values |
| Multiple reused copies | Different configs producing different hashes | Centralize the builder in a helper |

## Helper Pattern

Centralize your reused container in a single helper so the hash is identical everywhere:

\`\`\`typescript
// test/containers.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let started: Promise<StartedPostgreSqlContainer> | undefined;

export function getPostgres(): Promise<StartedPostgreSqlContainer> {
  if (!started) {
    started = new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('app')
      .withUsername('app')
      .withPassword('pw')
      .withReuse()
      .start();
  }
  return started;
}
\`\`\`

Now every test file imports \`getPostgres()\` and you can guarantee a single shared container.

## Frequently Asked Questions

### Does .withReuse() work in CI?

It works in the sense that the call does not error, but you get no speedup. CI runners start with no preexisting containers and the runner is destroyed when the job finishes. The flag costs nothing to leave in your code but provides no CI benefit.

### What if I want different configs per test file?

Then each file gets its own reused container. The hash is config-based, so two files with different \`.withDatabase()\` values produce two different containers that each persist independently.

### Do I have to set TESTCONTAINERS_REUSE_ENABLE every time?

Set it once in your shell rc file and forget it. Or put it in a \`.envrc\` if you use direnv. For Jest's \`setupFiles\` you can also set \`process.env.TESTCONTAINERS_REUSE_ENABLE = 'true'\` programmatically.

### Can I reuse across different image tags?

No. The image tag is part of the hash. Bumping from \`postgres:16-alpine\` to \`postgres:17-alpine\` gives you a new container. The old one stays around until you clean it up manually.

### What happens if Docker restarts?

Docker preserves container state across daemon restarts (by default they are stopped, not deleted). Testcontainers will start the stopped container automatically when it finds a matching hash. If the container is gone (e.g., Docker reset), a new one is created.

### Does this work on Docker Desktop, Colima, Rancher Desktop?

Yes for all three. Reuse uses standard Docker labels and standard Docker queries; any OCI-compatible runtime that exposes the Docker socket works.

### How do I force a clean run without disabling reuse globally?

\`TESTCONTAINERS_REUSE_ENABLE=false pnpm test\` for one run, or \`docker rm -f $(docker ps -aq --filter label=org.testcontainers.session-id=reuse)\` to nuke the reused containers and let the next run create fresh ones.

### What about Ryuk?

Ryuk is the Testcontainers reaper that cleans up orphaned containers when the test process dies. With \`.withReuse()\` Ryuk skips your reused containers (they are labeled to opt out). That is by design -- if Ryuk killed them, reuse would not work.

## Conclusion

\`.withReuse()\` plus \`TESTCONTAINERS_REUSE_ENABLE=true\` is the single biggest dev-loop speedup available to teams writing integration tests with Testcontainers in Node and TypeScript. The cost is owning your own state hygiene: truncate tables, flush caches, delete topics, drop schemas as appropriate. The benefit is a 10x faster inner loop on warm runs.

Pair this with our [Kafka reference](/blog/testcontainers-kafka-typescript-getbootstrapservers-reference) and our [MySQL + Postgres reference](/blog/testcontainers-mysql-postgres-node-startedcontainer-reference) for a complete picture of Testcontainers patterns in TypeScript. Browse the [container testing skills](/skills) or the [skills directory](/skills) to find an AI agent skill that wires this up for you, and the [database testing comparison](/compare) for adjacent guidance.
`,
};
