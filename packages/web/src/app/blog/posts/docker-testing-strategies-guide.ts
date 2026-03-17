import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Docker Testing Strategies: From Containers to CI/CD Pipelines in 2026',
  description:
    'Complete guide to Docker testing strategies for 2026. Covers container testing fundamentals, Docker Compose test environments, Testcontainers comparison, CI/CD pipeline integration, security scanning, and best practices.',
  date: '2026-03-17',
  category: 'Guide',
  content: `
Docker has fundamentally reshaped how teams build, ship, and **test** software. Yet most testing guides treat Docker as an afterthought -- a deployment target rather than a first-class testing tool. In reality, Docker containers provide the most reliable, reproducible, and scalable foundation for every layer of the testing pyramid. From spinning up ephemeral databases for integration tests to running entire microservice stacks locally, Docker eliminates the "works on my machine" problem that has plagued QA teams for decades.

This guide covers everything you need to know about Docker testing strategies in 2026: fundamentals, Docker Compose test environments, Testcontainers patterns, CI/CD integration, security scanning, performance testing, and how AI coding agents can accelerate the entire workflow.

## Key Takeaways

- **Docker containers provide deterministic test environments** that eliminate environment drift between local development, CI, and production -- the leading cause of "it works on my machine" failures
- **Docker Compose orchestrates multi-service test environments** with a single YAML file, letting you spin up database + cache + API + queue combinations in seconds
- **Testcontainers and Docker Compose serve different purposes**: Testcontainers excels at programmatic container management inside test code, while Compose is ideal for static multi-service environments
- **Multi-stage Docker builds** allow you to embed test stages directly into your build pipeline, ensuring tests run against the exact same artifact that ships to production
- **CI/CD caching strategies** (layer caching, image pre-pulling, BuildKit) can reduce Docker-based test pipeline execution time by 60-80%
- **AI coding agents equipped with Docker testing skills** generate reliable container-based tests that follow production-grade patterns from the start

---

## Why Docker Changed Testing Forever

Before Docker, setting up a test environment meant installing databases, message brokers, and services directly on developer machines or shared staging servers. This approach created three persistent problems:

**Environment drift.** Developer machines ran different OS versions, database versions, and configurations. A test that passed on macOS with PostgreSQL 14 might fail in CI running PostgreSQL 16 on Ubuntu.

**State pollution.** Shared test databases accumulated stale data from previous test runs. One engineer's failed migration could break the entire team's test suite for hours.

**Setup complexity.** Onboarding a new developer meant following a 20-step README with OS-specific instructions. Missing a single step meant hours of debugging cryptic connection errors.

Docker solves all three by packaging dependencies into portable, isolated containers:

| Problem | Pre-Docker | With Docker |
|---------|-----------|-------------|
| **Environment drift** | "Use the same OS/versions" docs | Identical container images everywhere |
| **State pollution** | Shared databases with cleanup scripts | Fresh container per test run |
| **Setup complexity** | 20-step README | \\\`docker compose up\\\` |
| **Dependency conflicts** | Port collisions, version mismatches | Isolated namespaces per container |
| **CI/CD parity** | "Staging is close to prod" | Same image runs in dev, CI, and prod |

---

## Docker Testing Fundamentals

Before diving into strategies, it is important to understand the Docker primitives that matter most for testing.

### Images -- Your Test Environment Blueprint

A Docker image is a read-only template that defines your test environment. For testing purposes, images serve as **immutable snapshots** of your application and its dependencies at a specific point in time.

\\\`\\\`\\\`dockerfile
# Test-optimized Dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS test
COPY . .
RUN pnpm test

FROM base AS build
COPY . .
RUN pnpm build
\\\`\\\`\\\`

Key testing concepts:
- **Tag pinning**: Always use specific tags (\\\`node:22-alpine\\\`, not \\\`node:latest\\\`) for reproducible test results
- **Layer caching**: Docker caches each instruction layer, so ordering matters -- install dependencies before copying source code
- **Alpine variants**: Use \\\`-alpine\\\` images to reduce pull times in CI (50-80% smaller than full images)

### Containers -- Ephemeral Test Instances

Containers are running instances of images. For testing, their key property is **ephemerality** -- each container starts with a clean filesystem and isolated network namespace.

\\\`\\\`\\\`bash
# Start a PostgreSQL container for testing
docker run -d \\
  --name test-db \\
  -e POSTGRES_DB=testdb \\
  -e POSTGRES_USER=test \\
  -e POSTGRES_PASSWORD=test \\
  -p 5433:5432 \\
  postgres:16-alpine

# Run tests against it
DATABASE_URL="postgresql://test:test@localhost:5433/testdb" pnpm test

# Destroy when done -- no cleanup needed
docker rm -f test-db
\\\`\\\`\\\`

### Volumes -- Persistent Test Data

Volumes allow data to survive container restarts. For testing, use them to:
- Mount test fixtures into containers
- Persist build caches between CI runs
- Share data between test containers

\\\`\\\`\\\`bash
# Mount test fixtures into a container
docker run -v ./test-fixtures:/app/fixtures my-app:test

# Named volume for build cache persistence
docker volume create test-cache
docker run -v test-cache:/app/node_modules my-app:test
\\\`\\\`\\\`

### Networks -- Isolated Test Communication

Docker networks enable containers to communicate using service names instead of IP addresses. This mirrors production networking behavior.

\\\`\\\`\\\`bash
# Create an isolated test network
docker network create test-net

# Start services on the same network
docker run -d --network test-net --name db postgres:16-alpine
docker run -d --network test-net --name cache redis:7-alpine
docker run -d --network test-net \\
  -e DATABASE_URL="postgresql://postgres:postgres@db:5432/postgres" \\
  -e REDIS_URL="redis://cache:6379" \\
  my-app:test
\\\`\\\`\\\`

---

## Testing with Docker Compose

Docker Compose is the most practical tool for orchestrating multi-service test environments. A single \\\`docker-compose.test.yml\\\` file defines your entire test stack.

### Multi-Service Test Environment

\\\`\\\`\\\`yaml
# docker-compose.test.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d testdb"]
      interval: 5s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  queue:
    image: rabbitmq:3.13-management-alpine
    ports:
      - "5673:5672"
      - "15673:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 10s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: test
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
      queue:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgresql://test:test@db:5432/testdb"
      REDIS_URL: "redis://cache:6379"
      RABBITMQ_URL: "amqp://guest:guest@queue:5672"
      NODE_ENV: test
    volumes:
      - ./test-results:/app/test-results
\\\`\\\`\\\`

### Running the Test Stack

\\\`\\\`\\\`bash
# Start all services and run tests
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Exit code from the app service propagates -- CI can detect pass/fail
echo "Test exit code: \\\$?"

# Tear down completely
docker compose -f docker-compose.test.yml down -v --remove-orphans
\\\`\\\`\\\`

### Environment-Specific Overrides

Use Compose file layering to maintain separate configurations for development, testing, and production:

\\\`\\\`\\\`yaml
# docker-compose.yml (base)
services:
  db:
    image: postgres:16-alpine

# docker-compose.test.yml (test overrides)
services:
  db:
    environment:
      POSTGRES_DB: testdb
    tmpfs:
      - /var/lib/postgresql/data  # RAM-backed storage for speed
\\\`\\\`\\\`

\\\`\\\`\\\`bash
# Merge configurations
docker compose -f docker-compose.yml -f docker-compose.test.yml up
\\\`\\\`\\\`

---

## Testcontainers vs Docker Compose

Both tools manage containers for testing, but they solve different problems. Here is a detailed comparison:

| Feature | **Testcontainers** | **Docker Compose** |
|---------|-------------------|-------------------|
| **Definition** | Programmatic container management in test code | Declarative YAML-based orchestration |
| **Port management** | Automatic random ports -- zero conflicts | Manual port mapping -- conflicts in parallel |
| **Lifecycle control** | Managed by test framework hooks | Manual \\\`up\\\`/\\\`down\\\` commands |
| **Wait strategies** | Built-in: port, log, HTTP, healthcheck | Depends on YAML healthcheck definitions |
| **Cleanup** | Automatic via Ryuk reaper | Manual \\\`down -v\\\` required |
| **Dynamic configuration** | Full programmatic control | Static YAML (env var substitution only) |
| **Per-test isolation** | Each test class gets own containers | Shared across all tests |
| **CI/CD integration** | Just run tests -- no extra steps | Requires \\\`compose up\\\` before tests |
| **Language support** | Java, Node.js, Python, Go, .NET, Rust | Language-agnostic |
| **Best for** | Integration tests in CI | Local dev environments, E2E test stacks |

### When to Use Each

**Choose Testcontainers when:**
- You need programmatic container control from within test code
- Tests run in CI and you need automatic cleanup
- You need per-test-class isolation with fresh containers
- Your team uses Java, Node.js, or Python (mature SDKs)

**Choose Docker Compose when:**
- You need a full multi-service stack for local development
- E2E tests require the entire application running as containers
- Your test framework does not have Testcontainers support
- You want a language-agnostic solution

**Hybrid approach (recommended):**
Most teams benefit from using Docker Compose for local development environments and Testcontainers for automated integration tests in CI. This gives developers a consistent local stack while ensuring CI tests are fully isolated.

---

## Building Test-Optimized Docker Images

Multi-stage Docker builds let you embed testing directly into the image build pipeline. This ensures tests run against the exact artifact that will be deployed.

### Multi-Stage Build with Test Stage

\\\`\\\`\\\`dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Stage 2: Test
FROM deps AS test
COPY . .
# Run linting
RUN pnpm lint
# Run type checking
RUN pnpm tsc --noEmit
# Run unit tests
RUN pnpm test -- --reporter=junit --outputFile=test-results/junit.xml
# Run coverage check
RUN pnpm test -- --coverage --coverage.thresholds.lines=80

# Stage 3: Build (only reached if tests pass)
FROM deps AS build
COPY . .
RUN pnpm build

# Stage 4: Production
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
\\\`\\\`\\\`

### Layer Caching Strategy

Order your Dockerfile instructions from least-frequently-changed to most-frequently-changed:

\\\`\\\`\\\`dockerfile
# 1. Base image (changes rarely)
FROM node:22-alpine

# 2. System dependencies (changes rarely)
RUN apk add --no-cache curl

# 3. Package manifests (changes when deps change)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 4. Source code (changes every commit)
COPY . .

# 5. Build/test (runs on source changes)
RUN pnpm test && pnpm build
\\\`\\\`\\\`

### BuildKit Cache Mounts

Docker BuildKit enables persistent caches that survive between builds:

\\\`\\\`\\\`dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS test
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \\
    corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN --mount=type=cache,target=/app/.vitest \\
    pnpm test
\\\`\\\`\\\`

---

## Database Testing with Docker

Ephemeral database containers are one of Docker's most powerful testing capabilities. Each test run gets a fresh database with zero leftover state.

### PostgreSQL -- Migration and Query Testing

\\\`\\\`\\\`typescript
// db-test-setup.ts
import { GenericContainer, Wait } from 'testcontainers';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export async function createTestDatabase() {
  const container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: 'testdb',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/ready to accept connections/))
    .start();

  const connectionString = \\\`postgresql://test:test@\\\${container.getHost()}:\\\${container.getMappedPort(5432)}/testdb\\\`;
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  // Run all migrations against fresh database
  await migrate(db, { migrationsFolder: './drizzle' });

  return { container, pool, db, connectionString };
}
\\\`\\\`\\\`

\\\`\\\`\\\`typescript
// user-repository.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from './db-test-setup';

describe('User Repository', () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  }, 60_000);

  afterAll(async () => {
    await ctx.pool.end();
    await ctx.container.stop();
  });

  it('should create and retrieve a user', async () => {
    const result = await ctx.pool.query(
      'INSERT INTO users (name, email) VALUES (\\\$1, \\\$2) RETURNING id, name, email',
      ['Alice', 'alice@test.com']
    );
    expect(result.rows[0].name).toBe('Alice');

    const found = await ctx.pool.query('SELECT * FROM users WHERE id = \\\$1', [result.rows[0].id]);
    expect(found.rows[0].email).toBe('alice@test.com');
  });

  it('should enforce unique email constraint', async () => {
    await ctx.pool.query(
      'INSERT INTO users (name, email) VALUES (\\\$1, \\\$2)',
      ['Bob', 'unique@test.com']
    );

    await expect(
      ctx.pool.query(
        'INSERT INTO users (name, email) VALUES (\\\$1, \\\$2)',
        ['Bob2', 'unique@test.com']
      )
    ).rejects.toThrow(/duplicate key/);
  });
});
\\\`\\\`\\\`

### MongoDB -- Document Validation Testing

\\\`\\\`\\\`yaml
# docker-compose.mongo-test.yml
services:
  mongo:
    image: mongo:7
    ports:
      - "27018:27017"
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.runCommand('ping').ok"]
      interval: 5s
      timeout: 5s
      retries: 5
    tmpfs:
      - /data/db  # RAM-backed for speed
\\\`\\\`\\\`

### Redis -- Cache and Session Testing

\\\`\\\`\\\`typescript
import { GenericContainer } from 'testcontainers';
import { createClient, RedisClientType } from 'redis';

describe('Cache Service', () => {
  let container: any;
  let client: RedisClientType;

  beforeAll(async () => {
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    client = createClient({
      url: \\\`redis://\\\${container.getHost()}:\\\${container.getMappedPort(6379)}\\\`,
    });
    await client.connect();
  }, 30_000);

  afterAll(async () => {
    await client.disconnect();
    await container.stop();
  });

  it('should cache and retrieve session data', async () => {
    const session = { userId: '123', role: 'admin', expiresAt: Date.now() + 3600000 };
    await client.setEx('session:abc', 3600, JSON.stringify(session));

    const cached = JSON.parse((await client.get('session:abc')) ?? '{}');
    expect(cached.userId).toBe('123');
    expect(cached.role).toBe('admin');
  });

  it('should handle TTL expiration', async () => {
    await client.setEx('temp:token', 1, 'short-lived');
    expect(await client.get('temp:token')).toBe('short-lived');

    await new Promise((r) => setTimeout(r, 1100));
    expect(await client.get('temp:token')).toBeNull();
  });
});
\\\`\\\`\\\`

---

## Testing Microservices Locally with Docker

Docker makes it possible to run your entire microservice architecture on a single developer machine. This is critical for testing inter-service communication, service discovery, and failure scenarios.

### Service Mesh Test Environment

\\\`\\\`\\\`yaml
# docker-compose.microservices-test.yml
services:
  api-gateway:
    build:
      context: ./services/api-gateway
      target: test
    ports:
      - "8080:8080"
    environment:
      USER_SERVICE_URL: "http://user-service:3001"
      ORDER_SERVICE_URL: "http://order-service:3002"
      INVENTORY_SERVICE_URL: "http://inventory-service:3003"
    depends_on:
      user-service:
        condition: service_healthy
      order-service:
        condition: service_healthy
      inventory-service:
        condition: service_healthy

  user-service:
    build:
      context: ./services/user-service
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: "postgresql://test:test@user-db:5432/users"
    depends_on:
      user-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 5s
      timeout: 3s
      retries: 10

  order-service:
    build:
      context: ./services/order-service
    ports:
      - "3002:3002"
    environment:
      DATABASE_URL: "postgresql://test:test@order-db:5432/orders"
      RABBITMQ_URL: "amqp://guest:guest@queue:5672"
    depends_on:
      order-db:
        condition: service_healthy
      queue:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 5s
      timeout: 3s
      retries: 10

  inventory-service:
    build:
      context: ./services/inventory-service
    ports:
      - "3003:3003"
    environment:
      REDIS_URL: "redis://cache:6379"
    depends_on:
      cache:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 5s
      timeout: 3s
      retries: 10

  user-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: users
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d users"]
      interval: 5s
      timeout: 3s
      retries: 5

  order-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d orders"]
      interval: 5s
      timeout: 3s
      retries: 5

  cache:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  queue:
    image: rabbitmq:3.13-alpine
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 10s
      retries: 5
\\\`\\\`\\\`

### Inter-Service Communication Testing

\\\`\\\`\\\`typescript
// e2e/order-flow.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

const GATEWAY_URL = 'http://localhost:8080';

describe('Order Flow - Cross-Service Integration', () => {
  let userId: string;
  let orderId: string;

  beforeAll(async () => {
    // Create a test user via the gateway
    const res = await fetch(\\\`\\\${GATEWAY_URL}/api/users\\\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
    });
    const user = await res.json();
    userId = user.id;
  });

  it('should create an order that triggers inventory check', async () => {
    const res = await fetch(\\\`\\\${GATEWAY_URL}/api/orders\\\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        items: [{ sku: 'WIDGET-001', quantity: 2 }],
      }),
    });

    expect(res.status).toBe(201);
    const order = await res.json();
    orderId = order.id;
    expect(order.status).toBe('pending');
  });

  it('should reflect inventory reduction after order processing', async () => {
    // Wait for async order processing via message queue
    await new Promise((r) => setTimeout(r, 2000));

    const res = await fetch(\\\`\\\${GATEWAY_URL}/api/inventory/WIDGET-001\\\`);
    const inventory = await res.json();

    expect(inventory.reserved).toBeGreaterThanOrEqual(2);
  });

  it('should update order status after processing', async () => {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(\\\`\\\${GATEWAY_URL}/api/orders/\\\${orderId}\\\`);
    const order = await res.json();

    expect(order.status).toBe('confirmed');
  });
});
\\\`\\\`\\\`

---

## Docker in CI/CD Pipelines

Docker-based testing in CI requires careful optimization to avoid slow builds and excessive resource consumption.

### GitHub Actions with Docker

\\\`\\\`\\\`yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm test -- --reporter=junit --outputFile=test-results/junit.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-results
          path: test-results/

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Pre-pull Docker images
        run: |
          docker pull postgres:16-alpine &
          docker pull redis:7-alpine &
          docker pull mongo:7 &
          wait

      - name: Run integration tests
        run: pnpm test:integration
        env:
          TESTCONTAINERS_RYUK_DISABLED: 'false'

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    steps:
      - uses: actions/checkout@v4

      - name: Build and test with Docker Compose
        run: |
          docker compose -f docker-compose.test.yml up \\
            --build \\
            --abort-on-container-exit \\
            --exit-code-from app

      - name: Collect test artifacts
        if: always()
        run: docker compose -f docker-compose.test.yml logs > test-logs.txt

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-test-logs
          path: test-logs.txt

      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.test.yml down -v --remove-orphans
\\\`\\\`\\\`

### Caching Strategies

#### Docker Layer Caching

\\\`\\\`\\\`yaml
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Cache Docker layers
        uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: docker-\\\${{ runner.os }}-\\\${{ hashFiles('**/Dockerfile') }}
          restore-keys: docker-\\\${{ runner.os }}-

      - name: Build with cache
        uses: docker/build-push-action@v6
        with:
          context: .
          target: test
          cache-from: type=local,src=/tmp/.buildx-cache
          cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max

      - name: Rotate cache
        run: |
          rm -rf /tmp/.buildx-cache
          mv /tmp/.buildx-cache-new /tmp/.buildx-cache
\\\`\\\`\\\`

### DinD vs Socket Mounting

Two approaches exist for running Docker inside CI containers:

| Approach | **Docker-in-Docker (DinD)** | **Socket Mounting** |
|----------|---------------------------|-------------------|
| **How it works** | Runs a full Docker daemon inside the CI container | Mounts the host's Docker socket into the container |
| **Isolation** | Full isolation -- inner Docker is independent | Shared daemon -- containers are siblings, not children |
| **Performance** | Slower (nested virtualization) | Faster (direct daemon access) |
| **Security** | More isolated | Host Docker socket access is a security risk |
| **Caching** | No layer cache sharing with host | Shares layer cache with host |
| **Best for** | Kubernetes-based CI (GitLab CI, Tekton) | GitHub Actions, Jenkins with trusted builds |

For GitHub Actions, **socket mounting is the default** and recommended approach -- Docker is pre-installed on \\\`ubuntu-latest\\\` runners.

---

## Performance Testing in Containers

Docker enables reproducible performance testing by providing controlled resource environments.

### Resource-Limited Containers

\\\`\\\`\\\`yaml
# docker-compose.perf-test.yml
services:
  app:
    build: .
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '1.0'
          memory: 512M
    ports:
      - "8080:8080"

  k6:
    image: grafana/k6:latest
    volumes:
      - ./perf-tests:/scripts
    command: run /scripts/load-test.js
    depends_on:
      - app
    environment:
      K6_OUT: json=/scripts/results.json
\\\`\\\`\\\`

### Container Monitoring During Tests

\\\`\\\`\\\`bash
# Monitor resource usage during test execution
docker stats --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}" \\
  app db cache

# Capture metrics to file
docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' > metrics.csv
\\\`\\\`\\\`

### Benchmarking with Controlled Resources

\\\`\\\`\\\`typescript
// perf-tests/load-test.js (k6 script)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up
    { duration: '1m', target: 50 },     // Steady state
    { duration: '30s', target: 100 },   // Peak load
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95th percentile under 500ms
    http_req_failed: ['rate<0.01'],     // Less than 1% errors
  },
};

export default function () {
  const res = http.get('http://app:8080/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(0.5);
}
\\\`\\\`\\\`

---

## Security Testing Docker Images

Container security scanning should be part of every Docker testing pipeline. Vulnerabilities in base images or dependencies can expose your entire infrastructure.

### Trivy -- Comprehensive Vulnerability Scanning

\\\`\\\`\\\`yaml
# GitHub Actions security scan
- name: Build Docker image
  run: docker build -t my-app:test .

- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'my-app:test'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # Fail pipeline on critical/high vulnerabilities

- name: Upload Trivy scan results
  uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: 'trivy-results.sarif'
\\\`\\\`\\\`

### Snyk Container Scanning

\\\`\\\`\\\`bash
# Local scanning
snyk container test my-app:test --severity-threshold=high

# Monitor for new vulnerabilities
snyk container monitor my-app:production
\\\`\\\`\\\`

### Image Best Practices for Security

\\\`\\\`\\\`dockerfile
# 1. Use minimal base images
FROM node:22-alpine AS production

# 2. Run as non-root user
RUN addgroup -g 1001 -S appgroup && \\
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# 3. No unnecessary packages
# (Alpine already minimal -- do NOT install extra tools in prod image)

# 4. Use COPY instead of ADD (ADD can fetch remote URLs)
COPY --chown=appuser:appgroup ./dist /app/dist

# 5. Set read-only filesystem where possible
# (configured at runtime: docker run --read-only)
\\\`\\\`\\\`

### Automated Security Gate

\\\`\\\`\\\`yaml
# docker-compose.security-test.yml
services:
  trivy:
    image: aquasec/trivy:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./security-reports:/reports
    command: >
      image --exit-code 1
      --severity CRITICAL,HIGH
      --format json
      --output /reports/scan-results.json
      my-app:test
\\\`\\\`\\\`

---

## AI-Assisted Docker Testing with QASkills

AI coding agents like Claude Code, Cursor, and GitHub Copilot can generate Docker-based test configurations -- but they produce significantly better results when equipped with specialized Docker testing knowledge.

**QA Skills** on [qaskills.sh](https://qaskills.sh) provides installable testing knowledge for AI agents. Install Docker testing patterns with:

\\\`\\\`\\\`bash
# Docker testing fundamentals and patterns
npx @qaskills/cli add docker-testing

# Testcontainers-specific patterns for integration tests
npx @qaskills/cli add testcontainers-patterns
\\\`\\\`\\\`

These skills teach your AI agent:
- How to structure multi-stage Dockerfiles with embedded test stages
- Docker Compose configurations for common test stacks (PostgreSQL + Redis + RabbitMQ)
- Testcontainers patterns for programmatic container management
- CI/CD caching strategies to keep Docker-based test pipelines fast
- Security scanning integration with Trivy and Snyk
- Performance testing configurations with k6 in containers

### Example: AI-Generated Docker Test Setup

After installing the Docker testing skill, asking your AI agent to "set up integration tests for a Node.js API with PostgreSQL and Redis" produces:

1. A properly structured \\\`docker-compose.test.yml\\\` with healthchecks
2. Testcontainers-based test setup files with proper lifecycle management
3. CI/CD workflow configuration with layer caching
4. Security scanning as part of the pipeline

Without the skill, most AI agents generate naive \\\`docker run\\\` commands without healthchecks, proper cleanup, or CI optimization.

Browse more skills:

\\\`\\\`\\\`bash
npx @qaskills/cli search docker
npx @qaskills/cli search integration-testing
npx @qaskills/cli search cicd
\\\`\\\`\\\`

---

## 10 Best Practices

**1. Pin image tags for reproducibility.**
Always use specific versions (\\\`postgres:16-alpine\\\`, not \\\`postgres:latest\\\`). This prevents tests from breaking when upstream images update.

**2. Use healthchecks, not sleep-based waits.**
Never use \\\`sleep 10\\\` to wait for a service. Define proper healthchecks in Docker Compose or use Testcontainers wait strategies that verify actual readiness.

**3. Isolate test networks.**
Create dedicated Docker networks for test environments to prevent interference with local development containers.

**4. Use tmpfs for database containers.**
Mount \\\`tmpfs\\\` on database data directories for test databases. This stores data in RAM, dramatically improving write-heavy test performance.

\\\`\\\`\\\`yaml
services:
  db:
    image: postgres:16-alpine
    tmpfs:
      - /var/lib/postgresql/data
\\\`\\\`\\\`

**5. Clean up containers and volumes after tests.**
Always run \\\`docker compose down -v --remove-orphans\\\` in CI pipeline cleanup steps, even when tests fail (use \\\`if: always()\\\` in GitHub Actions).

**6. Parallelize image pulls.**
Pre-pull Docker images in parallel before running tests:

\\\`\\\`\\\`bash
docker pull postgres:16-alpine &
docker pull redis:7-alpine &
wait
\\\`\\\`\\\`

**7. Use multi-stage builds to embed tests.**
Build and test in the same Dockerfile so that the production image is only created after all tests pass.

**8. Keep test images small.**
Use Alpine-based images and avoid installing unnecessary tools. Smaller images mean faster pulls and faster CI.

**9. Export test results as artifacts.**
Mount volumes to extract test results, coverage reports, and logs from containers for CI artifact storage.

**10. Version your Docker Compose test files.**
Commit \\\`docker-compose.test.yml\\\` to version control and review changes alongside application code. Test infrastructure is code.

---

## 8 Anti-Patterns

**1. Running Docker Compose in detached mode during CI without abort-on-exit.**
Using \\\`docker compose up -d\\\` means your CI pipeline cannot detect test failures. Always use \\\`--abort-on-container-exit --exit-code-from <service>\\\`.

**2. Using \\\`docker:latest\\\` or \\\`docker:dind\\\` without version pinning.**
This applies to CI images too. Pin your Docker-in-Docker sidecar versions to avoid surprise breakages.

**3. Skipping cleanup in CI.**
Orphaned containers from previous runs consume resources and cause port conflicts. Always add cleanup steps with \\\`if: always()\\\`.

**4. Mounting the Docker socket without understanding the security implications.**
\\\`/var/run/docker.sock\\\` gives full Docker daemon access. Never mount it in untrusted or multi-tenant environments.

**5. Hardcoding ports in test configurations.**
Fixed ports (\\\`5432:5432\\\`) cause conflicts when multiple test suites run simultaneously. Use dynamic port mapping or random host ports.

**6. Building production images in test jobs.**
Build once, test the built artifact. Do not rebuild the image in every test job. Use Docker registry caching to share images between CI jobs.

**7. Ignoring image vulnerability scan results.**
Adding Trivy or Snyk to your pipeline but not failing on critical vulnerabilities defeats the purpose. Set \\\`exit-code: 1\\\` for critical and high severity findings.

**8. Testing against the wrong database version.**
If production runs PostgreSQL 16, do not test against PostgreSQL 14 "because it starts faster." The minor performance difference is not worth the risk of version-specific behavior differences.

---

## Getting Started Checklist

Use this checklist to implement Docker testing strategies in your project:

- [ ] **Pin all Docker image tags** to specific versions in Dockerfiles and Compose files
- [ ] **Create a \\\`docker-compose.test.yml\\\`** with your core test dependencies (database, cache, queue)
- [ ] **Add healthchecks** to every service in your test Compose file
- [ ] **Implement a multi-stage Dockerfile** with a dedicated test stage
- [ ] **Set up Testcontainers** for integration tests that need programmatic container control
- [ ] **Configure CI/CD pipeline** with Docker layer caching and parallel image pulls
- [ ] **Add security scanning** (Trivy or Snyk) to your Docker build pipeline
- [ ] **Enable tmpfs** for test database containers to improve performance
- [ ] **Add cleanup steps** (\\\`docker compose down -v\\\`) with \\\`if: always()\\\` in CI
- [ ] **Install Docker testing QA skills** for your AI coding agent: \\\`npx @qaskills/cli add docker-testing\\\`
- [ ] **Mount test result volumes** for CI artifact collection
- [ ] **Document your test infrastructure** in the project README so team members can run tests locally with a single command

---

## Related QA Skills

Enhance your Docker testing workflow with complementary skills from [qaskills.sh](https://qaskills.sh):

\\\`\\\`\\\`bash
# Docker testing fundamentals
npx @qaskills/cli add docker-testing

# Testcontainers integration patterns
npx @qaskills/cli add testcontainers-patterns

# CI/CD pipeline testing with GitHub Actions
npx @qaskills/cli add cicd-testing

# Database testing automation
npx @qaskills/cli add database-testing

# API integration testing
npx @qaskills/cli add api-testing

# Microservices testing strategies
npx @qaskills/cli add microservices-testing

# Performance testing with k6
npx @qaskills/cli add performance-testing

# Security testing automation
npx @qaskills/cli add security-testing
\\\`\\\`\\\`

Browse the full directory at [qaskills.sh/skills](https://qaskills.sh/skills) or search from your terminal:

\\\`\\\`\\\`bash
npx @qaskills/cli search --category integration
npx @qaskills/cli search docker
\\\`\\\`\\\`
`,
};
