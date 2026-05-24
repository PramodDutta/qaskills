import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers MySQL Node.js — Integration Testing Guide 2026',
  description:
    'Complete guide to Testcontainers for MySQL in Node.js. Real integration tests with Docker, migrations, fixtures, character sets, and CI/CD patterns.',
  date: '2026-05-01',
  category: 'Guide',
  content: `
# Testcontainers MySQL Node.js Integration Testing Guide

MySQL remains the most-deployed open-source database in the world, powering everything from WordPress to massive transactional systems at Shopify, Uber, and Facebook. When you are building a Node.js application that talks to MySQL, your integration tests must validate against the real engine — its specific quirks around character sets, collation, strict mode, JSON column behavior, and ON DUPLICATE KEY syntax simply cannot be faithfully reproduced by a mock. Testcontainers gives you a real, isolated MySQL instance for every test run, programmatically managed by your test runner, with zero docker-compose overhead.

This guide is a deep, hands-on walkthrough of using Testcontainers with MySQL and Node.js in 2026. We cover installation, container configuration, schema migrations, character set gotchas, transactional rollback, connection pooling for the mysql2 driver, and patterns for testing replication, JSON columns, and stored procedures. Every code sample is a working TypeScript snippet using Vitest, mysql2, and the official @testcontainers/mysql module. Patterns translate cleanly to Jest, Knex, TypeORM, Sequelize, Prisma, and Kysely.

---

## Key Takeaways

- **MySqlContainer** provides one-line setup for real MySQL 5.7, 8.0, or 8.4 in tests
- **Character set defaults differ between MySQL versions** — always pin to a specific image tag
- **mysql2** is the recommended driver because it supports prepared statements and Promises natively
- **Container reuse** reduces local test startup from 8 seconds to under 1 second
- **MariaDbContainer** is a drop-in for projects that target MariaDB
- **CI/CD setup is trivial** because Docker is available on GitHub Actions ubuntu runners

---

## Why Use Testcontainers for MySQL

The standard alternatives all have severe drawbacks. SQLite-in-memory mocking breaks down the moment you use a MySQL-specific feature: JSON_TABLE, generated columns, full-text indexes, partitioning, or even the simple INSERT ... ON DUPLICATE KEY UPDATE syntax. Shared development databases bleed state, do not parallelize, and corrupt over time. Docker-compose requires a separate startup step and couples test execution to environment setup.

Testcontainers fixes all of this. A fresh, isolated MySQL container is started by your test runner, the connection URI is exposed as a string, and the container is automatically reaped when the test process exits.

---

## Installation

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/mysql
npm install --save-dev vitest mysql2
\`\`\`

Verify Docker is running with \`docker info\`. If that prints version info, Testcontainers will work.

Configure Vitest with longer timeouts to accommodate container startup:

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
  },
});
\`\`\`

---

## Your First Test

\`\`\`typescript
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import mysql, { Connection } from 'mysql2/promise';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

describe('MySQL integration', () => {
  let container: StartedMySqlContainer;
  let conn: Connection;

  beforeAll(async () => {
    container = await new MySqlContainer('mysql:8.4').start();
    conn = await mysql.createConnection({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getUserPassword(),
      database: container.getDatabase(),
    });
  });

  afterAll(async () => {
    await conn.end();
    await container.stop();
  });

  it('runs a query', async () => {
    const [rows] = await conn.query('SELECT 1 + 1 AS sum');
    expect((rows as any)[0].sum).toBe(2);
  });

  it('creates and queries a table', async () => {
    await conn.query(\`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    \`);
    await conn.query("INSERT INTO users (email) VALUES ('bob@example.com')");
    const [rows] = await conn.query('SELECT * FROM users');
    expect((rows as any[]).length).toBe(1);
  });
});
\`\`\`

First run pulls the MySQL image (about 500 MB). After that, runs use the cached image and complete in seconds.

---

## MySqlContainer API Reference

| Method | Purpose | Default |
|---|---|---|
| \`new MySqlContainer(image)\` | Constructor | \`mysql:8.0.31\` |
| \`.withDatabase(name)\` | Override database name | \`test\` |
| \`.withUsername(name)\` | Override username (not root) | \`test\` |
| \`.withUserPassword(pwd)\` | Override password for the user | \`test\` |
| \`.withRootPassword(pwd)\` | Override root password | \`test\` |
| \`.withCommand(cmd)\` | Override Docker CMD | mysqld default |
| \`.withEnvironment(env)\` | Set additional env vars | none |
| \`.withReuse()\` | Reuse container across runs | disabled |

After start:

| Method | Returns |
|---|---|
| \`getHost()\` | Hostname |
| \`getPort()\` | Mapped host port |
| \`getDatabase()\` | Database name |
| \`getUsername()\` | Username |
| \`getUserPassword()\` | User password |
| \`getRootPassword()\` | Root password |
| \`getConnectionUri()\` | Full mysql:// connection URI |

---

## Character Set and Collation

MySQL's character set defaults have been a source of bugs for two decades. Always force \`utf8mb4\` to support emoji, CJK characters, and the full Unicode range:

\`\`\`typescript
container = await new MySqlContainer('mysql:8.4')
  .withCommand(['--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci'])
  .start();
\`\`\`

For MySQL 8.0+, the default is already \`utf8mb4_0900_ai_ci\`, which is fine for most cases but differs from MySQL 5.7. If your production uses 5.7, test against 5.7.

---

## Running Migrations

With Knex:

\`\`\`typescript
import knex from 'knex';

let db: knex.Knex;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4').start();
  db = knex({
    client: 'mysql2',
    connection: {
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getUserPassword(),
      database: container.getDatabase(),
    },
  });
  await db.migrate.latest({ directory: './migrations' });
});
\`\`\`

With TypeORM:

\`\`\`typescript
import { DataSource } from 'typeorm';

let dataSource: DataSource;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4').start();
  dataSource = new DataSource({
    type: 'mysql',
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getUserPassword(),
    database: container.getDatabase(),
    entities: [User, Order],
    migrations: ['migrations/*.ts'],
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
});
\`\`\`

---

## Transactional Rollback Pattern

The fastest way to isolate tests is to wrap each in a transaction and roll it back:

\`\`\`typescript
let conn: Connection;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4').start();
  conn = await mysql.createConnection(container.getConnectionUri());
  await conn.query(\`CREATE TABLE accounts (id INT PRIMARY KEY, balance INT)\`);
});

beforeEach(async () => {
  await conn.beginTransaction();
});

afterEach(async () => {
  await conn.rollback();
});

it('updates balance', async () => {
  await conn.query('INSERT INTO accounts VALUES (1, 100)');
  await conn.query('UPDATE accounts SET balance = balance - 10 WHERE id = 1');
  const [rows] = await conn.query('SELECT balance FROM accounts WHERE id = 1');
  expect((rows as any)[0].balance).toBe(90);
});
\`\`\`

Caveat: rollback does not undo DDL (CREATE TABLE, ALTER TABLE) in MySQL. If your tests issue DDL, use the truncate-and-seed pattern instead.

---

## Connection Pooling

For tests that exercise concurrent code paths, use a pool:

\`\`\`typescript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: container.getHost(),
  port: container.getPort(),
  user: container.getUsername(),
  password: container.getUserPassword(),
  database: container.getDatabase(),
  connectionLimit: 5,
  waitForConnections: true,
});
\`\`\`

Keep \`connectionLimit\` low (5 to 10). MySQL's default max_connections is 151. If you run 20 test files in parallel and each opens a 20-connection pool, you will exhaust the limit and see "Too many connections" errors.

---

## JSON Column Testing

MySQL 5.7+ supports JSON columns with rich functions. Test these against real MySQL, never a mock:

\`\`\`typescript
it('queries JSON column', async () => {
  await conn.query(\`
    CREATE TABLE products (
      id INT PRIMARY KEY,
      attributes JSON
    )
  \`);
  await conn.query(\`
    INSERT INTO products VALUES (1, '{"color": "red", "size": "L"}')
  \`);
  const [rows] = await conn.query(\`
    SELECT JSON_EXTRACT(attributes, '$.color') AS color FROM products WHERE id = 1
  \`);
  expect((rows as any)[0].color).toBe('red');
});
\`\`\`

JSON_TABLE (introduced in 8.0) is another area where mocks fall short. Always test the real query against the real engine.

---

## Container Reuse for Local Dev

\`\`\`typescript
container = await new MySqlContainer('mysql:8.4')
  .withReuse()
  .start();
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

First run starts a container in 8 seconds. Subsequent runs find the container by label hash and connect in under 1 second.

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

That is the full configuration. Docker is preinstalled on ubuntu runners.

For GitLab with Docker-in-Docker:

\`\`\`yaml
test:
  image: node:20
  services:
    - docker:24-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  script:
    - npm ci
    - npm test
\`\`\`

---

## Common Pitfalls

**Strict mode differences.** MySQL 8.0 has strict SQL mode enabled by default; 5.7 had it disabled. Tests that rely on lax behavior (truncated strings, zero dates) will pass on 5.7 and fail on 8.0. Pin to your production version.

**Authentication plugin.** MySQL 8.0 defaults to \`caching_sha2_password\`. Older mysql2 versions did not support it. Use mysql2 v3.0+ or override with \`--default-authentication-plugin=mysql_native_password\`.

**Time zones.** Container time zone defaults to UTC. If your production sets \`time_zone\` differently, override it with \`-e TZ=America/New_York\` or via \`SET time_zone\` after connecting.

**Forgotten cleanup.** Always await \`container.stop()\`. Failing to do so leaks containers, especially in watch mode.

---

## MariaDB Variant

Testcontainers also ships a MariaDB module:

\`\`\`typescript
import { MariaDbContainer } from '@testcontainers/mariadb';

const container = await new MariaDbContainer('mariadb:11.4').start();
\`\`\`

The API is symmetric to MySqlContainer. Most mysql2 queries work without changes, but mariadb has diverged on JSON, sequence functions, and a few storage engine internals. Test against the engine you deploy.

---

## Conclusion

Testcontainers solves MySQL integration testing in Node.js by giving you a real, isolated database per test run, with one-line setup and zero docker-compose overhead. Pair it with mysql2 (or your ORM of choice), pin your image version, set utf8mb4, and use transactional rollback or per-suite containers for isolation. The result is fast, reliable, deterministic tests that catch real MySQL bugs before they ship.

Browse the [QA skills directory](/skills) for related testing patterns, or compare with our [PostgreSQL guide](/blog/testcontainers-postgresql-node-complete-guide) for cross-engine projects.
`,
};
