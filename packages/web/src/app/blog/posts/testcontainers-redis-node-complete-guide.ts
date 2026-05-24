import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Redis Node.js — Complete Guide 2026',
  description:
    'Master Testcontainers for Redis in Node.js. Real cache and pub/sub tests with Docker, ioredis, node-redis, cluster mode, and CI/CD patterns.',
  date: '2026-05-02',
  category: 'Guide',
  content: `
# Testcontainers Redis Node.js Complete Guide

Redis powers caching, session storage, rate limiting, pub/sub messaging, distributed locks, leaderboards, and queue systems in nearly every modern Node.js application. The trouble is that Redis behavior — particularly around expiration, eviction policies, Lua scripts, and Streams — cannot be faithfully emulated by in-memory mocks like ioredis-mock. The mocks lag behind real Redis features, behave subtly differently around TTL precision, and let teams write tests that pass against the mock but fail in production. Testcontainers solves this by spinning up a real Redis container per test suite, with zero docker-compose overhead.

This guide is a hands-on walkthrough of Testcontainers with Redis in Node.js for 2026. We cover installation, container configuration, both ioredis and node-redis client setup, pub/sub testing, Streams, Lua scripting, cluster mode emulation, container reuse for fast local dev, and the patterns that scale to large monorepos. Every code example is working TypeScript with Vitest.

---

## Key Takeaways

- **GenericContainer** is used for Redis because Testcontainers does not ship a dedicated Redis module — the GenericContainer pattern is two lines longer
- **ioredis** and **node-redis** both work; ioredis has better cluster and Sentinel support, node-redis is the official client
- **TTL precision** in real Redis is millisecond-accurate, while mocks often round to seconds
- **Container reuse** drops startup from 3 seconds to under 500ms on warm machines
- **Cluster mode** requires multiple containers networked together — covered in this guide
- **CI/CD configuration** is one line in GitHub Actions because Docker is preinstalled

---

## Why Use Testcontainers for Redis

ioredis-mock and redis-mock have served as the default in-process test doubles for years, but they each have gaps. ioredis-mock does not fully implement Streams, behaves differently with expirations under load, and is missing several modules (RedisJSON, RediSearch, RedisBloom). redis-mock implements only the v4 protocol and is unmaintained. Both let you write tests that pass against the mock but fail against real Redis.

The alternative is a shared Redis instance in docker-compose. This works but couples test execution to a separate setup step, makes parallel test runs awkward (key collisions), and accumulates leftover data across runs.

Testcontainers gives every test suite a fresh, real Redis instance with a unique port, automatic cleanup, and one-line setup.

---

## Installation

\`\`\`bash
npm install --save-dev testcontainers
npm install --save-dev vitest ioredis
# or
npm install --save-dev vitest redis
\`\`\`

Verify Docker:

\`\`\`bash
docker info
\`\`\`

Configure Vitest:

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
  },
});
\`\`\`

---

## Your First Test (ioredis)

\`\`\`typescript
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

describe('Redis integration', () => {
  let container: StartedTestContainer;
  let redis: Redis;

  beforeAll(async () => {
    container = await new GenericContainer('redis:7.4-alpine')
      .withExposedPorts(6379)
      .start();
    redis = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),
    });
  });

  afterAll(async () => {
    redis.disconnect();
    await container.stop();
  });

  it('sets and gets a key', async () => {
    await redis.set('hello', 'world');
    const value = await redis.get('hello');
    expect(value).toBe('world');
  });

  it('expires keys correctly', async () => {
    await redis.set('temp', 'value', 'PX', 100);
    await new Promise(resolve => setTimeout(resolve, 200));
    const value = await redis.get('temp');
    expect(value).toBeNull();
  });
});
\`\`\`

The expiration test would be flaky against ioredis-mock because of how it rounds TTLs. Against real Redis it works perfectly.

---

## Reusable Setup Helper

Extract the boilerplate to a fixture so every test file is concise:

\`\`\`typescript
// test-helpers/redis.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';

export interface RedisFixture {
  container: StartedTestContainer;
  redis: Redis;
}

export async function startRedis(): Promise<RedisFixture> {
  const container = await new GenericContainer('redis:7.4-alpine')
    .withExposedPorts(6379)
    .start();
  const redis = new Redis({
    host: container.getHost(),
    port: container.getMappedPort(6379),
  });
  return { container, redis };
}

export async function stopRedis(fixture: RedisFixture): Promise<void> {
  fixture.redis.disconnect();
  await fixture.container.stop();
}
\`\`\`

Then in tests:

\`\`\`typescript
import { startRedis, stopRedis, RedisFixture } from './test-helpers/redis';

let fixture: RedisFixture;

beforeAll(async () => { fixture = await startRedis(); });
afterAll(async () => { await stopRedis(fixture); });
\`\`\`

---

## node-redis Client Variant

If you prefer the official node-redis client:

\`\`\`typescript
import { createClient, RedisClientType } from 'redis';

let client: RedisClientType;

beforeAll(async () => {
  container = await new GenericContainer('redis:7.4-alpine')
    .withExposedPorts(6379)
    .start();
  client = createClient({
    url: \`redis://\${container.getHost()}:\${container.getMappedPort(6379)}\`,
  });
  await client.connect();
});

afterAll(async () => {
  await client.quit();
  await container.stop();
});

it('sets and gets', async () => {
  await client.set('key', 'value');
  expect(await client.get('key')).toBe('value');
});
\`\`\`

---

## Per-Test Isolation

You have three options for isolating tests against the same Redis container.

**Option 1: FLUSHDB between tests.** Simple but slow if you have many keys:

\`\`\`typescript
afterEach(async () => {
  await redis.flushdb();
});
\`\`\`

**Option 2: Unique key prefixes per test.** Faster but requires discipline:

\`\`\`typescript
const prefix = \`test:\${expect.getState().currentTestName}:\`;
await redis.set(\`\${prefix}user:1\`, 'data');
\`\`\`

**Option 3: Multiple databases.** Redis has 16 logical databases. Each test can SELECT a different one:

\`\`\`typescript
let dbCounter = 0;
beforeEach(async () => {
  await redis.select(++dbCounter % 16);
  await redis.flushdb();
});
\`\`\`

For most test suites, option 1 is the right default.

---

## Testing Pub/Sub

Pub/sub testing is where mocks really struggle. With real Redis, it just works:

\`\`\`typescript
it('publishes and subscribes', async () => {
  const subscriber = new Redis({
    host: container.getHost(),
    port: container.getMappedPort(6379),
  });
  const messages: string[] = [];

  await subscriber.subscribe('events');
  subscriber.on('message', (channel, msg) => {
    messages.push(msg);
  });

  await redis.publish('events', 'hello');
  await redis.publish('events', 'world');

  await new Promise(r => setTimeout(r, 100));

  expect(messages).toEqual(['hello', 'world']);
  subscriber.disconnect();
});
\`\`\`

You need a separate subscriber connection because subscribers cannot run other commands.

---

## Testing Redis Streams

Streams are notoriously absent from most mocks:

\`\`\`typescript
it('appends and reads from a stream', async () => {
  await redis.xadd('events', '*', 'type', 'click', 'user', 'alice');
  await redis.xadd('events', '*', 'type', 'view', 'user', 'bob');

  const entries = await redis.xrange('events', '-', '+');
  expect(entries.length).toBe(2);
  expect(entries[0][1]).toContain('click');
});
\`\`\`

For consumer groups:

\`\`\`typescript
await redis.xgroup('CREATE', 'events', 'group1', '0');
const pending = await redis.xreadgroup(
  'GROUP', 'group1', 'consumer1',
  'COUNT', 10, 'STREAMS', 'events', '>'
);
\`\`\`

---

## Testing Lua Scripts

\`\`\`typescript
const script = \`
  local current = redis.call('GET', KEYS[1])
  if current == false then
    redis.call('SET', KEYS[1], ARGV[1])
    return 1
  end
  return 0
\`;

it('runs a Lua script atomically', async () => {
  const setIfNotExists = await redis.eval(script, 1, 'lockkey', 'lockvalue');
  expect(setIfNotExists).toBe(1);

  const setAgain = await redis.eval(script, 1, 'lockkey', 'newvalue');
  expect(setAgain).toBe(0);
});
\`\`\`

---

## Cluster Mode Testing

For Redis Cluster, run multiple containers on a shared network. The official redis image supports cluster mode via the \`--cluster-enabled yes\` flag, but configuring six containers (three primary, three replica) by hand is tedious. The pragmatic approach is to use the \`grokzen/redis-cluster\` Docker image which orchestrates a 6-node cluster in a single container:

\`\`\`typescript
container = await new GenericContainer('grokzen/redis-cluster:7.4.0')
  .withExposedPorts(7000, 7001, 7002, 7003, 7004, 7005)
  .withEnvironment({ IP: '0.0.0.0' })
  .start();

const cluster = new Redis.Cluster([
  { host: container.getHost(), port: container.getMappedPort(7000) },
  { host: container.getHost(), port: container.getMappedPort(7001) },
  { host: container.getHost(), port: container.getMappedPort(7002) },
]);
\`\`\`

---

## Configuration Options

| Configuration | Method | Use Case |
|---|---|---|
| Persistence | \`.withCommand(['redis-server', '--appendonly', 'yes'])\` | Test AOF behavior |
| Custom config file | \`.withCopyFilesToContainer([{ source: 'redis.conf', target: '/etc/redis.conf' }])\` | Test specific configs |
| Memory limit | \`.withCommand(['redis-server', '--maxmemory', '100mb'])\` | Test eviction |
| Eviction policy | \`.withCommand(['redis-server', '--maxmemory-policy', 'allkeys-lru'])\` | Test cache eviction |
| Password | \`.withCommand(['redis-server', '--requirepass', 'secret'])\` | Test authentication |
| Modules | Use \`redis/redis-stack:latest\` image | RediSearch, RedisJSON, etc. |

---

## Container Reuse

\`\`\`typescript
container = await new GenericContainer('redis:7.4-alpine')
  .withExposedPorts(6379)
  .withReuse()
  .start();
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

First run takes 3 seconds. Subsequent runs reconnect in 200ms.

---

## CI/CD Configuration

GitHub Actions:

\`\`\`yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
\`\`\`

---

## Common Pitfalls

**Forgetting to disconnect.** Both ioredis and node-redis hold open connections that keep the Node.js event loop alive. If you forget \`disconnect()\` or \`quit()\`, Vitest will hang at the end of the run. Always disconnect in \`afterAll\`.

**Subscriber on the same client.** A Redis client cannot publish and subscribe at the same time. Create separate clients for each role.

**Flush during pub/sub.** FLUSHDB does not unsubscribe active subscribers. If a previous test left a subscriber active, weird interference can happen. Disconnect subscribers in afterEach.

**Wrong Redis version.** Pin to a specific version. Redis 7.0 added Functions, 7.2 added Sharded Pub/Sub, 7.4 expanded Streams. Tests written for 7.4 features will fail on older containers.

---

## Conclusion

Testcontainers with Redis gives Node.js teams real, isolated Redis instances per test suite, eliminating the gap between mocks and production. Pub/sub, Streams, Lua scripting, cluster mode, and TTL precision all behave exactly like production. With container reuse, local iteration is fast, and CI integration requires zero configuration.

Browse our [QA skills directory](/skills) for related cache and queue testing patterns, or read the [Testcontainers Best Practices 2026](/blog/testcontainers-best-practices-2026) for advanced architecture patterns.
`,
};
