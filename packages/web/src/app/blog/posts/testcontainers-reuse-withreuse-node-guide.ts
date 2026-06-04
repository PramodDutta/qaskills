import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers withReuse in Node: Complete Guide 2026',
  description:
    'Master Testcontainers withReuse in Node and TypeScript: withReuse(true), TESTCONTAINERS_REUSE_ENABLE, the Ryuk reaper, and Postgres, MySQL, Kafka examples.',
  date: '2026-06-04',
  category: 'Guide',
  content: `
# Testcontainers withReuse in Node: The Complete Guide

Testcontainers is the standard way to spin up real databases, message brokers, and other dependencies inside your Node.js and TypeScript integration tests. The catch is speed. Starting a fresh PostgreSQL or Kafka container on every test run adds seconds, sometimes tens of seconds, of startup latency that compounds painfully during local development where you run the suite dozens of times an hour. Testcontainers solves this with container reuse: the \`.withReuse(true)\` API plus the \`TESTCONTAINERS_REUSE_ENABLE\` flag let a container survive between test runs so the second and subsequent runs attach to the already-running instance instead of paying the cold-start cost again. Used well, reuse turns a 30-second feedback loop into a 2-second one. Used carelessly, it leaks stale state between runs and produces baffling failures. This guide shows you exactly how to use it correctly.

We will cover what reuse actually does under the hood, how it interacts with the Ryuk reaper container that normally cleans everything up, how to opt in through both the code API and the \`~/.testcontainers.properties\` file, and complete, copy-pasteable TypeScript examples for the three containers people reuse most: PostgreSQL, MySQL, and Kafka. Crucially, we will also cover when *not* to use reuse, because the single most important rule is that reuse belongs in local development and is almost always wrong in CI. If you are new to Testcontainers entirely, start with our [Testcontainers Docker integration testing guide](/blog/testcontainers-docker-integration-testing) and the [Testcontainers PostgreSQL Node complete guide](/blog/testcontainers-postgresql-node-complete-guide), then come back here to make your local loop fast. For the Kafka-specific deep dive, see the [Testcontainers Kafka Node complete guide](/blog/testcontainers-kafka-node-complete-guide).

To have an AI coding agent wire up Testcontainers with reuse correctly in your project, install a [testing skill](/skills) into Claude Code or Cursor.

## What Container Reuse Actually Does

Normally, a Testcontainers lifecycle is: start container, run tests, stop and remove container. Reuse changes the middle and end. When you mark a container with \`.withReuse(true)\` and reuse is enabled in your environment, Testcontainers computes a **hash** of the container's configuration: its image, exposed ports, environment variables, command, copied files, wait strategy, and other settings. Before starting a new container, it checks whether a running container with a matching reuse hash already exists. If one does, it attaches to that container instead of starting a new one. If none exists, it starts a fresh container, labels it with the hash, and crucially does *not* tear it down at the end of the run.

That last part is the whole point and the whole danger. A reused container is intentionally left running after your tests finish, so the next \`npm test\` finds it and skips the startup. The container persists across process runs until you stop it manually or the Docker host restarts. This is why reuse delivers such a dramatic speedup locally: PostgreSQL's few seconds of initialization, or Kafka's even longer broker bootstrap, happens once and then never again until the configuration changes.

The reuse hash is configuration-sensitive. Change the image tag, add an environment variable, or alter the wait strategy, and the hash changes, so Testcontainers starts a new container rather than reusing the old one. This is correct behavior: a container configured differently is a different container. But it means that if you tweak settings frequently you will accumulate several stopped or running containers and should clean them up periodically.

| Aspect | Without reuse (default) | With reuse enabled |
|---|---|---|
| Container at end of run | Stopped and removed | Left running |
| Second run startup | Full cold start every time | Attaches to existing container |
| State between runs | Always clean | Persists; you must reset it |
| Managed by Ryuk | Yes, auto-cleaned | No, reuse opts out of Ryuk cleanup |
| Best environment | CI and local | Local development only |

## Enabling Reuse: Code API and Properties File

Reuse requires two things to both be true: the container must request it in code, and reuse must be enabled in your environment. Requesting it without enabling it is a no-op, which is a deliberate safety design so reuse never accidentally activates in CI.

**In code**, call \`.withReuse(true)\` on the container builder before \`.start()\`:

\`\`\`typescript
import { GenericContainer } from 'testcontainers';

const container = await new GenericContainer('redis:7-alpine')
  .withExposedPorts(6379)
  .withReuse(true)   // request reuse for this container
  .start();
\`\`\`

**To enable reuse in your environment**, you have two options. The recommended local approach is the properties file in your home directory, \`~/.testcontainers.properties\`, which applies to all your projects on this machine:

\`\`\`properties
# ~/.testcontainers.properties
testcontainers.reuse.enable=true
\`\`\`

Alternatively, set the environment variable, which is useful for a single shell session or a project-level \`.env\` consumed before tests:

\`\`\`bash
export TESTCONTAINERS_REUSE_ENABLE=true
npm test
\`\`\`

The two mechanisms are equivalent; the properties file persists across sessions while the environment variable is scoped to wherever you set it. Because reuse is enabled per-developer-machine rather than per-repo, your CI environment simply never sets either flag, so \`.withReuse(true)\` silently does nothing there and containers are cleaned up normally. This separation is intentional and is the foundation of the "reuse locally, never in CI" rule we return to below.

| Mechanism | Scope | Persistence | Recommended for |
|---|---|---|---|
| \`~/.testcontainers.properties\` | All projects on the machine | Across sessions | Default local setup |
| \`TESTCONTAINERS_REUSE_ENABLE\` env var | Current shell/process | Until shell closes | One-off sessions, scripts |
| \`.withReuse(true)\` in code | Per container | N/A (just requests it) | Always required to opt in |

## How Reuse Interacts with Ryuk

Testcontainers ships with a companion container called **Ryuk**, the resource reaper. Ryuk's job is to guarantee cleanup: it watches the containers Testcontainers creates and removes them when the test process exits or dies, even if your code crashes before its teardown runs. This is what makes Testcontainers safe by default; you never leak containers because Ryuk sweeps them.

Reuse and Ryuk are fundamentally at odds, because Ryuk wants to delete containers and reuse wants to keep them alive. The resolution is straightforward: **reused containers are excluded from Ryuk's cleanup.** When a container is started with reuse enabled, Testcontainers labels it so Ryuk leaves it alone. That is precisely why a reused container survives past the end of your test run; nothing reaps it. The trade-off is that the safety net is gone for those containers. You become responsible for stopping them when you are done, because neither Ryuk nor the normal teardown will.

In practice this means a reused PostgreSQL container can sit running on your machine for days across many test sessions. That is exactly what you want for speed, but you should know how to find and remove these containers when you change configuration or want a clean slate:

\`\`\`bash
# List Testcontainers-managed containers, including reused ones
docker ps --filter "label=org.testcontainers=true"

# Stop and remove all of them when you want a clean slate
docker rm -f $(docker ps -aq --filter "label=org.testcontainers=true")
\`\`\`

If you ever disable Ryuk entirely (via \`TESTCONTAINERS_RYUK_DISABLED=true\`), be aware you lose automatic cleanup for *all* containers, not just reused ones, which means non-reused containers will also leak. Do not disable Ryuk as a substitute for reuse; they solve different problems.

## Reusing a PostgreSQL Container

PostgreSQL is the most common reuse target because so many services use it and its startup, while only a few seconds, is paid on every run. Here is a complete TypeScript setup using the dedicated \`@testcontainers/postgresql\` module. The pattern is: build the container with a fixed configuration and \`.withReuse(true)\`, start it once, and reset state between tests yourself since reuse no longer gives you a fresh container.

\`\`\`typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

let container: StartedPostgreSqlContainer;
let client: Client;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('appdb')
    .withUsername('test')
    .withPassword('test')
    .withReuse(true)        // reuse across local runs
    .start();

  client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();

  // Idempotent schema: safe to run whether the container is fresh or reused
  await client.query(\`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE
    );
  \`);
});

beforeEach(async () => {
  // Critical with reuse: reset state so a previous run's rows do not leak
  await client.query('TRUNCATE users RESTART IDENTITY CASCADE;');
});

afterAll(async () => {
  await client.end();
  // Do NOT call container.stop() when reusing; leave it running for next time
});

test('inserts and reads a user', async () => {
  await client.query("INSERT INTO users (email) VALUES ('ada@example.com')");
  const { rows } = await client.query('SELECT email FROM users');
  expect(rows).toEqual([{ email: 'ada@example.com' }]);
});
\`\`\`

Two details make this work. First, the schema setup uses \`CREATE TABLE IF NOT EXISTS\` so it is idempotent: running it against a reused container that already has the table does not error. Second, \`beforeEach\` truncates the table so each test starts clean even though the container itself persists. With reuse, *you* own state hygiene; the container will not reset itself. Note that we deliberately do not call \`container.stop()\`, because stopping it would defeat reuse. For the non-reuse fundamentals, see the [Testcontainers PostgreSQL Node complete guide](/blog/testcontainers-postgresql-node-complete-guide).

## Reusing a MySQL Container

MySQL follows the identical pattern with the \`@testcontainers/mysql\` module. The same two principles apply: idempotent setup and per-test state reset.

\`\`\`typescript
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import mysql from 'mysql2/promise';

let container: StartedMySqlContainer;
let connection: mysql.Connection;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4')
    .withDatabase('appdb')
    .withUsername('test')
    .withUserPassword('test')
    .withReuse(true)
    .start();

  connection = await mysql.createConnection({
    host: container.getHost(),
    port: container.getPort(),
    user: 'test',
    password: 'test',
    database: 'appdb',
  });

  await connection.query(\`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    );
  \`);
});

beforeEach(async () => {
  await connection.query('TRUNCATE TABLE products;');
});

afterAll(async () => {
  await connection.end();
  // Leave the container running for reuse
});

test('stores a product', async () => {
  await connection.query("INSERT INTO products (name) VALUES ('Widget')");
  const [rows] = await connection.query('SELECT name FROM products');
  expect(rows).toEqual([{ name: 'Widget' }]);
});
\`\`\`

Because the reuse hash includes the database name, username, and password, keep those values fixed. If you parameterize them with random values per run, every run produces a different hash and reuse never kicks in. Stable configuration is a prerequisite for reuse to do anything.

## Reusing a Kafka Container

Kafka is where reuse pays off the most, because broker startup is genuinely slow, often the better part of ten seconds. Reusing a \`KafkaContainer\` across local runs removes that cost entirely. The state-reset strategy differs from databases: instead of truncating tables, you isolate runs by using unique topic names or consumer group IDs per test, since you cannot easily wipe a broker's log.

\`\`\`typescript
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka, logLevel } from 'kafkajs';

let container: StartedKafkaContainer;
let kafka: Kafka;

beforeAll(async () => {
  container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
    .withReuse(true)
    .start();

  kafka = new Kafka({
    brokers: [\`\${container.getHost()}:\${container.getMappedPort(9093)}\`],
    logLevel: logLevel.NOTHING,
  });
});

afterAll(async () => {
  // Leave the broker running for the next test run
});

test('produces and consumes a message', async () => {
  // Unique topic per test isolates runs against a reused broker
  const topic = \`orders-\${Date.now()}\`;
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic, numPartitions: 1 }] });
  await admin.disconnect();

  const producer = kafka.producer();
  await producer.connect();
  await producer.send({ topic, messages: [{ value: 'order-42' }] });
  await producer.disconnect();

  const messages: string[] = [];
  const consumer = kafka.consumer({ groupId: \`g-\${Date.now()}\` });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      messages.push(message.value!.toString());
    },
  });

  await new Promise((r) => setTimeout(r, 2000));
  await consumer.disconnect();

  expect(messages).toContain('order-42');
});
\`\`\`

The key isolation trick is the timestamped topic and consumer group names. Against a persistent reused broker, hard-coded topic names would accumulate messages across runs and break tests; unique names sidestep that entirely. For the full Kafka testing walkthrough including Avro and schema registry, read the [Testcontainers Kafka Node complete guide](/blog/testcontainers-kafka-node-complete-guide).

## When to Use Reuse, and When Not To

Reuse is a local-development optimization, full stop. The rule is simple: **enable reuse on developer machines, never in CI.** Here is why, and the broader guidance:

| Situation | Use reuse? | Reason |
|---|---|---|
| Local dev, running suite repeatedly | Yes | Huge speedup, you control cleanup |
| CI pipeline | No | Each run must start from a pristine, isolated state |
| Tests that mutate shared schema | Caution | Reset state in \`beforeEach\`; idempotent setup |
| Frequently changing container config | Caution | Each change spawns a new container; clean up periodically |
| Containers needing guaranteed teardown | No | Reuse opts out of Ryuk; no auto-cleanup |

In CI, every build should be reproducible and isolated, starting each container fresh so a flaky shared-state bug can never appear. Because reuse is gated behind the per-machine \`TESTCONTAINERS_REUSE_ENABLE\` flag and CI never sets it, your \`.withReuse(true)\` calls automatically become no-ops there, giving you fast local runs and clean CI runs from the same code. That is the elegant part of the design: you write reuse into the test once, and the environment decides whether it activates. The main caveats to internalize are state hygiene (always reset between tests because the container persists) and cleanup responsibility (you, not Ryuk, must eventually stop reused containers). Get those two right and reuse is pure upside for your local feedback loop. For broader patterns, see [Testcontainers best practices 2026](/blog/testcontainers-best-practices-2026) and our guidance on [fixing flaky tests](/blog/fix-flaky-tests-guide).

## Reuse Versus Other Speedup Strategies

Reuse is one of several ways to make integration tests faster, and it helps to know where it fits relative to the alternatives. Each strategy trades something different.

| Strategy | How it speeds things up | Trade-off |
|---|---|---|
| Container reuse | Skips cold start on repeat local runs | Persistent state; you reset and clean up |
| Singleton container | One container shared across the whole suite in one run | No cross-run benefit; needs careful state reset |
| In-memory substitute (e.g. SQLite) | No container at all | Lower fidelity; misses DB-specific behavior |
| Parallel test execution | Runs more tests at once | Needs isolated data per worker |
| Tuned wait strategy | Starts faster by waiting on the right signal | Per-image tuning effort |

Reuse and the singleton pattern are complementary, not competing. The singleton pattern keeps a single container alive for the duration of one test process so multiple test files share it; reuse keeps a container alive *across* processes so successive runs share it. You can combine them: a singleton within a run, reused between runs. In-memory substitutes like SQLite are faster still but sacrifice fidelity, which defeats the entire reason to use Testcontainers, namely testing against the real database engine your production code targets. Reuse gives you the speed of a warm container without giving up that fidelity, which is exactly why it is the preferred local optimization. Pairing reuse with parallel execution requires that each worker use isolated data (unique schemas, table prefixes, or topic names), the same hygiene reuse already demands.

## Debugging Reuse: When the Container Will Not Reuse

If you enable everything and reuse still cold-starts every time, work through this short diagnostic checklist. The cause is almost always one of these.

First, confirm the environment flag is actually visible to the test process. A flag exported in one terminal does not carry into your IDE's test runner. Verify with a quick check in your test setup or by printing the environment, and prefer the \`~/.testcontainers.properties\` file for IDE runs since it is read regardless of shell. Second, confirm the configuration is byte-stable across runs. The reuse hash incorporates every setting, so any value that varies per run, a random password, a dynamic database name, a timestamp in an environment variable, produces a different hash and a fresh container every time. Move random values out of the reused container's configuration. Third, confirm the container actually survived; run \`docker ps\` and look for it. If it is gone, something stopped it: a stray \`container.stop()\` call in teardown, a Docker daemon restart, or Ryuk not being properly bypassed because reuse was not enabled when the container started. Fourth, check that you did not change the image tag or a copied file; both alter the hash legitimately.

\`\`\`typescript
// A quick guard you can add while debugging reuse locally
const reuseEnabled =
  process.env.TESTCONTAINERS_REUSE_ENABLE === 'true';
console.log('Testcontainers reuse enabled:', reuseEnabled);
\`\`\`

Once these four checks pass, reuse activates reliably: the first run starts and labels the container, and every run after attaches in a fraction of the time. The mental model to keep is that reuse is deterministic on the configuration hash, so "it will not reuse" almost always means "the configuration changed" or "reuse was not really enabled for that run." For broader reliability guidance, see [Testcontainers best practices 2026](/blog/testcontainers-best-practices-2026).

## Frequently Asked Questions

### What does withReuse(true) do in Testcontainers for Node?

\`.withReuse(true)\` marks a container so that Testcontainers keeps it running after the test run ends and attaches to it on the next run instead of starting a fresh one. Testcontainers hashes the container's configuration and reuses any running container with a matching hash. This skips cold-start time on repeated local runs. It only takes effect when reuse is also enabled via the properties file or the \`TESTCONTAINERS_REUSE_ENABLE\` environment variable.

### How do I enable Testcontainers reuse?

Enable reuse two ways together: call \`.withReuse(true)\` on the container builder in code, and turn on reuse in your environment by adding \`testcontainers.reuse.enable=true\` to \`~/.testcontainers.properties\`, or by exporting \`TESTCONTAINERS_REUSE_ENABLE=true\` before running tests. Both code opt-in and environment enablement are required. The properties file persists across sessions, while the environment variable is scoped to the shell where you set it.

### How does reuse interact with the Ryuk reaper?

Ryuk is Testcontainers' cleanup container that removes containers when the test process exits. Reuse and Ryuk conflict because reuse wants containers to survive, so Testcontainers labels reused containers to exclude them from Ryuk's cleanup. That is why a reused container keeps running after your tests finish. The trade-off is that you become responsible for stopping reused containers manually, since Ryuk will no longer reap them.

### Should I use Testcontainers reuse in CI?

No. Reuse is a local-development optimization and should never run in CI, where every build must start from a pristine, isolated state for reproducibility. Because reuse is gated behind the per-machine \`TESTCONTAINERS_REUSE_ENABLE\` flag and CI environments do not set it, your \`.withReuse(true)\` calls automatically become no-ops in CI. This lets the same test code run fast locally and clean in CI without any conditional logic.

### How do I reuse a Kafka container in TypeScript?

Build a \`KafkaContainer\` with \`.withReuse(true)\`, start it once in \`beforeAll\`, and do not stop it in \`afterAll\`. Because you cannot easily wipe a broker's log between runs, isolate each test by using unique topic names and consumer group IDs, for example suffixing them with \`Date.now()\`. This prevents messages from previous runs leaking into a reused broker. Connect with kafkajs using the container's mapped port.

### Why is my Testcontainers reuse not working?

The most common causes are: reuse is not enabled in the environment (missing \`~/.testcontainers.properties\` entry or \`TESTCONTAINERS_REUSE_ENABLE\`), the container lacks \`.withReuse(true)\`, or the configuration changes between runs so the reuse hash differs each time. Random database names, passwords, or ports produce a new hash every run, defeating reuse. Keep the container configuration fixed and confirm both the code opt-in and environment flag are present.

### Do I need to reset state when reusing containers?

Yes. Because a reused container persists across runs, it retains all data from previous runs. You must reset state yourself, typically in a \`beforeEach\` hook: truncate tables for SQL databases, or use unique topic and group names for Kafka. Also make setup idempotent, for example with \`CREATE TABLE IF NOT EXISTS\`, so it succeeds whether the container is fresh or already initialized. With reuse, state hygiene is your responsibility, not the container's.

### How do I clean up reused Testcontainers containers?

Since Ryuk does not reap reused containers, remove them with Docker directly. List them with \`docker ps --filter "label=org.testcontainers=true"\`, then stop and delete all Testcontainers-managed containers with \`docker rm -f $(docker ps -aq --filter "label=org.testcontainers=true")\`. Do this when you change container configuration, want a clean slate, or notice accumulated containers from frequent config changes that each produced a new reuse hash.

## Conclusion

Testcontainers reuse is the right tool for a fast local integration-test loop. Mark containers with \`.withReuse(true)\`, enable reuse through \`~/.testcontainers.properties\` or \`TESTCONTAINERS_REUSE_ENABLE\`, and Testcontainers will keep a configuration-hashed container running across runs so PostgreSQL, MySQL, or the genuinely slow Kafka broker only ever cold-starts once. Remember the two responsibilities reuse hands you: reset state between tests with idempotent setup and per-test cleanup, and stop reused containers yourself since they are excluded from Ryuk. Above all, keep reuse local; the per-machine flag means CI automatically runs clean while you enjoy a fast feedback loop.

Keep going with the [Testcontainers Docker integration testing guide](/blog/testcontainers-docker-integration-testing), [Testcontainers best practices 2026](/blog/testcontainers-best-practices-2026), and the [Testcontainers Kafka Node complete guide](/blog/testcontainers-kafka-node-complete-guide). To have an AI coding agent set up Testcontainers with reuse correctly in your project, browse the skills directory:

\`\`\`bash
npx @qaskills/cli search testcontainers
\`\`\`

Explore all 450+ testing skills at [qaskills.sh/skills](/skills).
`,
};
