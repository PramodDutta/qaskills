import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers for Integration Testing: The Complete Docker Testing Guide',
  description:
    'Complete guide to Testcontainers for Docker-based integration testing. Covers Java, Node.js, Python implementations, database testing, microservices testing, CI/CD integration, and best practices for 2026.',
  date: '2026-03-16',
  category: 'Tutorial',
  content: `
Integration testing has always been the awkward middle child of the testing pyramid. Unit tests are fast and isolated. End-to-end tests validate real user flows. But integration tests? They require real databases, message brokers, and external services -- and managing those dependencies has historically been painful. **Testcontainers** solves this problem by giving you throwaway, lightweight Docker containers that spin up automatically as part of your test suite. No more "works on my machine." No more shared staging databases. No more flaky tests caused by leftover state.

## Key Takeaways

- **Testcontainers** provides programmatic Docker container management for integration testing, supporting Java, Node.js, Python, Go, .NET, and Rust
- **Throwaway containers** guarantee test isolation -- each test run gets a fresh database, message broker, or service instance with zero leftover state
- **Language-specific modules** offer pre-configured containers for PostgreSQL, MongoDB, Redis, Kafka, RabbitMQ, Elasticsearch, and dozens more
- **CI/CD integration** is straightforward with GitHub Actions, GitLab CI, and Jenkins -- any environment with Docker access can run Testcontainers tests
- **Reusable containers** and parallel execution strategies can reduce test suite execution time by 60-80% compared to naive implementations
- **AI coding agents** equipped with Testcontainers patterns generate reliable integration tests that work consistently across local development and CI environments

---

## What Are Testcontainers?

**Testcontainers** is an open-source library that provides lightweight, throwaway instances of Docker containers for integration testing. Instead of mocking your database or connecting to a shared test server, Testcontainers spins up a real PostgreSQL, MongoDB, Redis, Kafka, or any other service inside a Docker container -- right from your test code.

The library was originally created for Java by Richard North in 2015 and has since expanded to support **Node.js/TypeScript**, **Python**, **Go**, **.NET**, and **Rust**. In 2023, Docker Inc. acquired the Testcontainers project, signaling its importance to the container ecosystem.

### Why Testcontainers Matter

Traditional integration testing approaches all have significant drawbacks:

| Approach | Problem |
|----------|---------|
| **Mocking** | Mocks drift from real behavior; false confidence in test results |
| **Shared test database** | State pollution between test runs; flaky tests; team conflicts |
| **In-memory alternatives** (H2, SQLite) | Behavior differences from production database; SQL dialect mismatches |
| **Docker Compose** | Manual lifecycle management; not integrated with test framework; port conflicts |
| **Local installations** | "Works on my machine"; version mismatches; complex setup for new developers |

Testcontainers eliminates all of these problems by:

- **Running the real thing**: Your tests hit actual PostgreSQL, not an in-memory fake
- **Providing isolation**: Each test suite gets its own container with a fresh state
- **Automating lifecycle**: Containers start before tests and are cleaned up after -- no manual management
- **Using random ports**: No port conflicts, even when running tests in parallel
- **Being portable**: If Docker runs, your tests run -- locally, in CI, everywhere

---

## How Testcontainers Work

Understanding the Testcontainers lifecycle is essential for writing efficient tests. Here is what happens when you run a test that uses Testcontainers:

### Container Lifecycle

**1. Docker Environment Detection**
Testcontainers first checks for a working Docker environment. It looks for the Docker socket, checks Docker Desktop status, and can also connect to remote Docker hosts via \`DOCKER_HOST\` or Testcontainers Cloud.

**2. Ryuk Container Launch**
Before starting your requested containers, Testcontainers launches a special container called **Ryuk** (named after the Death Note character). Ryuk is a resource reaper -- it monitors all containers created by Testcontainers and ensures they are cleaned up even if your test process crashes or is killed. This prevents orphaned containers from accumulating.

**3. Container Creation and Start**
Your requested container image is pulled (if not cached), a container is created with the specified configuration (environment variables, port mappings, volume mounts), and the container is started.

**4. Wait Strategy Execution**
Testcontainers waits for the container to be "ready" using a configurable **wait strategy**. The default strategies include:
- **Port-based**: Wait until a TCP port is listening
- **Log-based**: Wait until a specific log message appears
- **HTTP-based**: Wait until an HTTP endpoint returns a success status
- **Health check-based**: Wait until the Docker health check passes

**5. Dynamic Port Mapping**
Instead of binding to fixed ports (which cause conflicts), Testcontainers maps container ports to random available host ports. Your test code retrieves the mapped port dynamically.

**6. Test Execution**
Your tests run against the containerized service using the dynamically assigned host and port.

**7. Cleanup**
After tests complete, containers are stopped and removed. Ryuk handles cleanup for any containers missed by normal shutdown.

\`\`\`
Test Start
    |
    v
[Detect Docker] --> [Start Ryuk] --> [Pull Image] --> [Create Container]
    |                                                         |
    v                                                         v
[Configure Ports/Env] --> [Start Container] --> [Wait for Ready]
    |                                                         |
    v                                                         v
[Run Tests Against Container] --> [Stop Container] --> [Ryuk Cleanup]
\`\`\`

---

## Setting Up Testcontainers

### Java with JUnit 5

Java has the most mature Testcontainers ecosystem. Here is a complete setup with JUnit 5 and a PostgreSQL container:

\`\`\`java
// build.gradle.kts
dependencies {
    testImplementation("org.testcontainers:testcontainers:1.20.4")
    testImplementation("org.testcontainers:junit-jupiter:1.20.4")
    testImplementation("org.testcontainers:postgresql:1.20.4")
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.3")
}
\`\`\`

\`\`\`java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test")
        .withInitScript("schema.sql");

    @Test
    void shouldInsertAndRetrieveUser() throws Exception {
        Connection conn = DriverManager.getConnection(
            postgres.getJdbcUrl(),
            postgres.getUsername(),
            postgres.getPassword()
        );

        conn.createStatement().execute(
            "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')"
        );

        ResultSet rs = conn.createStatement().executeQuery(
            "SELECT name FROM users WHERE email = 'alice@example.com'"
        );

        assertTrue(rs.next());
        assertEquals("Alice", rs.getString("name"));
    }

    @Test
    void shouldHandleDuplicateEmail() throws Exception {
        Connection conn = DriverManager.getConnection(
            postgres.getJdbcUrl(),
            postgres.getUsername(),
            postgres.getPassword()
        );

        conn.createStatement().execute(
            "INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')"
        );

        assertThrows(Exception.class, () -> {
            conn.createStatement().execute(
                "INSERT INTO users (name, email) VALUES ('Bob2', 'bob@example.com')"
            );
        });
    }
}
\`\`\`

The \`@Testcontainers\` annotation integrates with JUnit 5 lifecycle, and \`@Container\` marks the container field for automatic start/stop management. The \`static\` keyword means the container is shared across all tests in the class -- started once before all tests, stopped after all tests.

### Node.js with Vitest

The **testcontainers** npm package brings the same capabilities to the Node.js ecosystem:

\`\`\`bash
npm install -D testcontainers @testcontainers/postgresql
\`\`\`

\`\`\`typescript
// user-repository.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

describe('UserRepository Integration', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('testdb')
      .withUsername('test')
      .withPassword('test')
      .start();

    pool = new Pool({
      connectionString: container.getConnectionUri(),
    });

    // Run migrations
    await pool.query(\\\`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    \\\`);
  }, 60_000); // 60s timeout for container startup

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it('should insert and retrieve a user', async () => {
    await pool.query(
      'INSERT INTO users (name, email) VALUES (\\\$1, \\\$2)',
      ['Alice', 'alice@test.com']
    );

    const result = await pool.query(
      'SELECT name FROM users WHERE email = \\\$1',
      ['alice@test.com']
    );

    expect(result.rows[0].name).toBe('Alice');
  });

  it('should reject duplicate emails', async () => {
    await pool.query(
      'INSERT INTO users (name, email) VALUES (\\\$1, \\\$2)',
      ['Bob', 'unique-bob@test.com']
    );

    await expect(
      pool.query(
        'INSERT INTO users (name, email) VALUES (\\\$1, \\\$2)',
        ['Bob2', 'unique-bob@test.com']
      )
    ).rejects.toThrow();
  });
});
\`\`\`

### Python with pytest

Python developers use the **testcontainers** PyPI package:

\`\`\`bash
pip install testcontainers[postgres] pytest
\`\`\`

\`\`\`python
# test_user_repository.py
import pytest
import psycopg2
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        postgres.with_env("POSTGRES_DB", "testdb")
        yield postgres

@pytest.fixture(scope="module")
def db_connection(postgres_container):
    conn = psycopg2.connect(
        host=postgres_container.get_container_host_ip(),
        port=postgres_container.get_exposed_port(5432),
        user=postgres_container.username,
        password=postgres_container.password,
        dbname=postgres_container.dbname,
    )
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL
        )
    """)
    conn.commit()
    yield conn
    conn.close()

def test_insert_and_retrieve_user(db_connection):
    cursor = db_connection.cursor()
    cursor.execute(
        "INSERT INTO users (name, email) VALUES (%s, %s)",
        ("Alice", "alice@test.com")
    )
    db_connection.commit()

    cursor.execute("SELECT name FROM users WHERE email = %s", ("alice@test.com",))
    result = cursor.fetchone()
    assert result[0] == "Alice"

def test_reject_duplicate_email(db_connection):
    cursor = db_connection.cursor()
    cursor.execute(
        "INSERT INTO users (name, email) VALUES (%s, %s)",
        ("Charlie", "charlie@test.com")
    )
    db_connection.commit()

    with pytest.raises(psycopg2.errors.UniqueViolation):
        cursor.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s)",
            ("Charlie2", "charlie@test.com")
        )
        db_connection.commit()
\`\`\`

---

## Database Testing with Testcontainers

Database testing is the most common use case for Testcontainers. Here are patterns for the three most popular databases.

### PostgreSQL -- Schema Migration Testing

\`\`\`java
@Testcontainers
class MigrationIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void shouldApplyAllMigrationsSuccessfully() {
        Flyway flyway = Flyway.configure()
            .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
            .locations("classpath:db/migration")
            .load();

        flyway.migrate();

        // Verify final schema state
        try (Connection conn = DriverManager.getConnection(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())) {
            ResultSet rs = conn.getMetaData().getTables(null, "public", "%", new String[]{"TABLE"});
            List<String> tables = new ArrayList<>();
            while (rs.next()) {
                tables.add(rs.getString("TABLE_NAME"));
            }
            assertTrue(tables.contains("users"));
            assertTrue(tables.contains("orders"));
            assertTrue(tables.contains("order_items"));
        }
    }

    @Test
    void shouldHandleRollbackAndReapply() {
        Flyway flyway = Flyway.configure()
            .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
            .locations("classpath:db/migration")
            .load();

        flyway.migrate();
        flyway.undo();   // Roll back last migration
        flyway.migrate(); // Re-apply -- should succeed cleanly
    }
}
\`\`\`

### MongoDB -- Document Store Testing

\`\`\`typescript
import { MongoDBContainer } from '@testcontainers/mongodb';
import { MongoClient } from 'mongodb';

describe('Product Catalog Integration', () => {
  let container: any;
  let client: MongoClient;

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), {
      directConnection: true,
    });
    await client.connect();
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  it('should perform full-text search on products', async () => {
    const db = client.db('catalog');
    const products = db.collection('products');

    await products.createIndex({ name: 'text', description: 'text' });
    await products.insertMany([
      { name: 'Wireless Mouse', description: 'Ergonomic Bluetooth mouse', price: 29.99 },
      { name: 'Mechanical Keyboard', description: 'Cherry MX switches', price: 89.99 },
      { name: 'USB-C Hub', description: 'Multi-port adapter for laptops', price: 49.99 },
    ]);

    const results = await products
      .find({ \\\$text: { \\\$search: 'wireless bluetooth' } })
      .toArray();

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Wireless Mouse');
  });

  it('should enforce unique constraints', async () => {
    const db = client.db('catalog');
    const products = db.collection('products_unique');

    await products.createIndex({ sku: 1 }, { unique: true });
    await products.insertOne({ sku: 'ABC-123', name: 'Widget' });

    await expect(
      products.insertOne({ sku: 'ABC-123', name: 'Different Widget' })
    ).rejects.toThrow(/duplicate key/);
  });
});
\`\`\`

### Redis -- Cache and Session Testing

\`\`\`python
from testcontainers.redis import RedisContainer
import redis
import json
import pytest

@pytest.fixture(scope="module")
def redis_client():
    with RedisContainer("redis:7-alpine") as container:
        client = redis.Redis(
            host=container.get_container_host_ip(),
            port=container.get_exposed_port(6379),
            decode_responses=True,
        )
        yield client

def test_cache_set_and_get(redis_client):
    user_data = {"id": 1, "name": "Alice", "role": "admin"}
    redis_client.setex("user:1", 3600, json.dumps(user_data))

    cached = json.loads(redis_client.get("user:1"))
    assert cached["name"] == "Alice"
    assert cached["role"] == "admin"

def test_cache_expiration(redis_client):
    redis_client.setex("temp:token", 1, "abc123")  # 1 second TTL
    assert redis_client.get("temp:token") == "abc123"

    import time
    time.sleep(1.1)
    assert redis_client.get("temp:token") is None

def test_sorted_set_leaderboard(redis_client):
    redis_client.zadd("leaderboard", {"alice": 100, "bob": 85, "charlie": 92})

    top_players = redis_client.zrevrange("leaderboard", 0, 1, withscores=True)
    assert top_players[0] == ("alice", 100.0)
    assert top_players[1] == ("charlie", 92.0)
\`\`\`

---

## Testing Microservices with Testcontainers

Modern microservice architectures often depend on message brokers, event streams, and multi-service communication. Testcontainers handles these scenarios with dedicated modules.

### Kafka -- Event-Driven Testing

\`\`\`java
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.utility.DockerImageName;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;

@Testcontainers
class OrderEventIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.7.1")
    );

    @Test
    void shouldPublishAndConsumeOrderEvent() throws Exception {
        Properties producerProps = new Properties();
        producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");

        KafkaProducer<String, String> producer = new KafkaProducer<>(producerProps);
        producer.send(new ProducerRecord<>("orders", "order-1",
            "{\\"id\\":\\"order-1\\",\\"total\\":99.99}")).get();

        Properties consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "test-group");
        consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProps);
        consumer.subscribe(List.of("orders"));

        ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(10));
        assertEquals(1, records.count());
        assertTrue(records.iterator().next().value().contains("order-1"));
    }
}
\`\`\`

### RabbitMQ -- Message Queue Testing

\`\`\`typescript
import { GenericContainer, Wait } from 'testcontainers';
import amqplib from 'amqplib';

describe('Notification Service Integration', () => {
  let container: any;
  let connection: amqplib.Connection;

  beforeAll(async () => {
    container = await new GenericContainer('rabbitmq:3.13-management-alpine')
      .withExposedPorts(5672, 15672)
      .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
      .start();

    const port = container.getMappedPort(5672);
    const host = container.getHost();
    connection = await amqplib.connect(\\\`amqp://guest:guest@\\\${host}:\\\${port}\\\`);
  }, 90_000);

  afterAll(async () => {
    await connection.close();
    await container.stop();
  });

  it('should route messages to correct queue', async () => {
    const channel = await connection.createChannel();

    await channel.assertExchange('notifications', 'topic', { durable: false });
    const emailQueue = await channel.assertQueue('email-notifications', { durable: false });
    const smsQueue = await channel.assertQueue('sms-notifications', { durable: false });

    await channel.bindQueue(emailQueue.queue, 'notifications', 'notify.email.*');
    await channel.bindQueue(smsQueue.queue, 'notifications', 'notify.sms.*');

    channel.publish('notifications', 'notify.email.welcome',
      Buffer.from(JSON.stringify({ to: 'user@test.com', template: 'welcome' }))
    );

    const message = await new Promise<amqplib.ConsumeMessage | null>((resolve) => {
      channel.consume(emailQueue.queue, (msg) => resolve(msg), { noAck: true });
    });

    expect(message).not.toBeNull();
    const payload = JSON.parse(message!.content.toString());
    expect(payload.template).toBe('welcome');
  });
});
\`\`\`

### Multi-Container Setup with Docker Network

For testing interactions between multiple services, Testcontainers supports custom Docker networks:

\`\`\`java
@Testcontainers
class FullStackIntegrationTest {

    static Network network = Network.newNetwork();

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withNetwork(network)
        .withNetworkAliases("db");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withNetwork(network)
        .withNetworkAliases("cache")
        .withExposedPorts(6379);

    @Container
    static GenericContainer<?> app = new GenericContainer<>("my-app:latest")
        .withNetwork(network)
        .withExposedPorts(8080)
        .withEnv("DATABASE_URL", "jdbc:postgresql://db:5432/test")
        .withEnv("REDIS_URL", "redis://cache:6379")
        .dependsOn(postgres, redis)
        .waitingFor(Wait.forHttp("/health").forStatusCode(200));

    @Test
    void shouldServeRequestsWithDatabaseAndCache() {
        String baseUrl = "http://" + app.getHost() + ":" + app.getMappedPort(8080);
        // Test your application's API endpoints against real dependencies
    }
}
\`\`\`

---

## Testcontainers vs Docker Compose for Testing

Both Testcontainers and Docker Compose can manage containers for testing, but they serve different purposes:

| Feature | **Testcontainers** | **Docker Compose** |
|---------|-------------------|-------------------|
| **Integration** | Embedded in test code | External YAML file |
| **Port management** | Automatic random ports | Manual port mapping |
| **Lifecycle** | Managed by test framework | Manual start/stop |
| **Wait strategies** | Built-in, programmable | Depends on healthchecks |
| **Cleanup** | Automatic (Ryuk) | Manual cleanup needed |
| **Dynamic config** | Programmatic in test | Static YAML |
| **CI/CD** | Just run tests | Extra compose up/down steps |
| **Parallel tests** | Each gets own containers | Port conflicts likely |
| **Learning curve** | Language-specific API | Docker Compose YAML |
| **Best for** | Integration tests in CI | Local development environments |

**When to use Testcontainers**: Integration tests, CI/CD pipelines, anywhere you need programmatic container control from test code.

**When to use Docker Compose**: Local development environments, manual testing setups, complex multi-service stacks that developers start once and use all day.

**Hybrid approach**: Many teams use Docker Compose for local development and Testcontainers for automated tests. This gives you fast feedback during development and reliable isolation in CI.

---

## CI/CD Integration

### GitHub Actions

Testcontainers works out of the box with GitHub Actions because the runners include Docker:

\`\`\`yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Pull test images (cache optimization)
        run: |
          docker pull postgres:16-alpine &
          docker pull redis:7-alpine &
          docker pull confluentinc/cp-kafka:7.7.1 &
          wait

      - name: Run integration tests
        run: ./gradlew integrationTest

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-reports
          path: build/reports/tests/integrationTest/
\`\`\`

For Node.js projects:

\`\`\`yaml
  integration-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          TESTCONTAINERS_RYUK_DISABLED: 'false'
\`\`\`

### Parallel Test Execution

Running integration tests in parallel requires careful container management. Here is a pattern using JUnit 5 parallel execution:

\`\`\`java
// junit-platform.properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.mode.classes.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=4
\`\`\`

Each test class with \`@Container\` annotations gets its own container instances, so parallel execution is safe by default. The key is ensuring your Docker host has enough resources (CPU, memory, disk) to run multiple containers simultaneously.

---

## Performance Optimization

Testcontainers can add significant time to test suite execution if not optimized. Here are proven strategies to keep integration tests fast.

### Reusable Containers

Instead of starting and stopping containers for every test class, you can reuse containers across the entire test suite:

\`\`\`java
public class SharedContainers {
    static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withReuse(true);
        POSTGRES.start();
    }
}

// In your tests:
class OrderRepositoryTest {
    static PostgreSQLContainer<?> postgres = SharedContainers.POSTGRES;

    @BeforeEach
    void cleanDatabase() {
        // Clean tables between tests instead of recreating the container
        try (Connection conn = getConnection()) {
            conn.createStatement().execute("TRUNCATE orders, order_items CASCADE");
        }
    }
}
\`\`\`

Enable reuse in \`~/.testcontainers.properties\`:
\`\`\`
testcontainers.reuse.enable=true
\`\`\`

### Image Caching in CI

Pre-pull images before running tests to avoid download time during test execution:

\`\`\`yaml
- name: Cache Docker images
  uses: actions/cache@v4
  with:
    path: /tmp/docker-images
    key: docker-images-\\\${{ hashFiles('**/build.gradle.kts') }}

- name: Load cached Docker images
  run: |
    if [ -d /tmp/docker-images ]; then
      for img in /tmp/docker-images/*.tar; do
        docker load -i "\\\$img" || true
      done
    fi

- name: Run tests
  run: ./gradlew integrationTest

- name: Save Docker images
  if: always()
  run: |
    mkdir -p /tmp/docker-images
    docker save postgres:16-alpine -o /tmp/docker-images/postgres.tar
    docker save redis:7-alpine -o /tmp/docker-images/redis.tar
\`\`\`

### Testcontainers Cloud

For teams that need faster CI execution, **Testcontainers Cloud** offloads container execution to dedicated cloud infrastructure. Instead of running containers on the CI runner, they run on optimized remote Docker hosts. This can reduce test time significantly and avoids the resource constraints of standard CI runners.

---

## QA Skills for Docker Testing

If you are using **AI coding agents** like Claude Code, Cursor, or GitHub Copilot for test development, equipping them with Docker testing patterns ensures they generate reliable integration tests from the start.

**QA Skills** on [qaskills.sh](https://qaskills.sh) provides installable testing knowledge for AI agents. Install Testcontainers-specific patterns with:

\`\`\`bash
npx @qaskills/cli add testcontainers-patterns
\`\`\`

This skill teaches your AI agent:
- Proper container lifecycle management for each language ecosystem
- Database-specific testing patterns (schema migration testing, data isolation)
- Message broker testing patterns (Kafka, RabbitMQ event verification)
- Performance optimization techniques (reusable containers, parallel execution)
- CI/CD configuration for Testcontainers in GitHub Actions and GitLab CI

Browse the full QA skills directory to find complementary skills:

\`\`\`bash
npx @qaskills/cli search docker
npx @qaskills/cli search integration-testing
\`\`\`

Your AI agent will generate tests that follow Testcontainers best practices instead of falling back to mocks or in-memory fakes -- resulting in integration tests that catch real bugs and work consistently across all environments.

---

## Best Practices

**1. Use specific image tags, not \`latest\`.**
Always pin container images to specific versions (e.g., \`postgres:16-alpine\`, not \`postgres:latest\`). This ensures reproducible test results and prevents surprise breakages when upstream images update.

**2. Prefer module-specific containers over GenericContainer.**
Use \`PostgreSQLContainer\`, \`MongoDBContainer\`, \`KafkaContainer\` instead of \`GenericContainer\` whenever available. Module containers provide convenience methods, sensible defaults, and proper wait strategies.

**3. Share containers across tests in the same class.**
Use \`static\` containers shared across all test methods in a class. Starting a new container for each test is unnecessary and slow -- clean the data between tests instead.

**4. Use init scripts for schema setup.**
Pass SQL init scripts to database containers using \`.withInitScript()\` rather than running DDL in \`@BeforeAll\`. This keeps test setup clean and reusable.

**5. Set appropriate timeouts.**
Container startup can take 10-60 seconds depending on the image and host performance. Set generous timeouts for test setup (especially in CI) to avoid flaky failures:

\`\`\`typescript
beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
}, 120_000); // 2 minutes
\`\`\`

**6. Clean up data between tests, not containers.**
Truncate tables or drop and recreate schemas between tests. This is orders of magnitude faster than stopping and starting containers.

**7. Use Docker networks for multi-container tests.**
When containers need to communicate, create a shared Docker network and use network aliases. This mirrors production networking behavior.

**8. Configure resource limits.**
Set memory and CPU limits on containers to prevent a single test from consuming all Docker host resources:

\`\`\`java
new GenericContainer<>("heavy-service:latest")
    .withCreateContainerCmdModifier(cmd ->
        cmd.getHostConfig()
            .withMemory(512 * 1024 * 1024L)  // 512MB
            .withCpuCount(1L)
    );
\`\`\`

**9. Log container output for debugging.**
Enable container log forwarding in development to quickly diagnose startup failures or test issues:

\`\`\`java
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
    .withLogConsumer(new Slf4jLogConsumer(LoggerFactory.getLogger("postgres")));
\`\`\`

**10. Separate unit and integration tests.**
Keep Testcontainers tests in a separate source set or test configuration. This allows running fast unit tests frequently and slower integration tests on demand or in CI.

---

## Anti-Patterns to Avoid

**1. Starting containers in every test method.**
This is the most common performance killer. A single PostgreSQL container takes 3-5 seconds to start. Multiply that by 50 test methods and you have added 4+ minutes of pure startup time.

**2. Using in-memory database alternatives "just for speed."**
H2 or SQLite in-memory modes seem faster, but they hide real bugs. SQL syntax differences, missing features (JSONB, window functions), and different locking behavior mean passing tests and failing production.

**3. Hardcoding container ports.**
Never use \`.withFixedPort()\`. Hardcoded ports cause conflicts in parallel execution and CI environments. Always use \`.getMappedPort()\` to get the dynamically assigned port.

**4. Ignoring Ryuk (the resource reaper).**
Some teams disable Ryuk (\`TESTCONTAINERS_RYUK_DISABLED=true\`) to avoid issues. This is dangerous -- crashed tests will leave orphaned containers that consume resources and may cause subsequent failures.

**5. Not testing database migrations.**
If you use Flyway, Liquibase, or Drizzle migrations, test them with Testcontainers. It is the only way to verify that migrations work correctly against the real database engine.

**6. Using Docker Compose from tests.**
While Testcontainers has a Docker Compose module, using it loses most benefits of Testcontainers (dynamic ports, programmatic wait strategies, Ryuk cleanup). Use native Testcontainers modules instead.

**7. Sharing mutable state between parallel tests.**
When running tests in parallel with shared containers, ensure tests do not write to the same rows. Use unique identifiers (UUIDs) for test data or use separate schemas per test.

**8. Skipping integration tests in CI.**
Teams sometimes skip Testcontainers tests in CI because they are "too slow" or "Docker is not available." Fix the root cause instead -- optimize container startup, use reusable containers, or switch to CI runners with Docker support.

---

## Common Pitfalls and Solutions

### "Docker is not available" in CI

**Symptom**: Tests fail with "Could not find a valid Docker environment."

**Solution**: Ensure your CI runner has Docker installed and the Docker socket is accessible. For GitHub Actions, use \`ubuntu-latest\` runners (Docker is pre-installed). For Kubernetes-based CI, use Docker-in-Docker (DinD) sidecar or Testcontainers Cloud.

### Container startup timeout

**Symptom**: Tests fail with "Container startup timeout" even though the image is correct.

**Solution**: Increase the startup timeout and check that your wait strategy matches the container's actual readiness signal:

\`\`\`java
new GenericContainer<>("slow-service:latest")
    .withStartupTimeout(Duration.ofMinutes(3))
    .waitingFor(Wait.forHttp("/health").forStatusCode(200)
        .withStartupTimeout(Duration.ofMinutes(2)));
\`\`\`

### Port conflicts with fixed ports

**Symptom**: "Bind for 0.0.0.0:5432 failed: port is already allocated."

**Solution**: Never use fixed port mappings. Remove any \`.withFixedPort()\` calls and use \`.getMappedPort()\` to get the dynamically assigned port.

### Slow image pulls in CI

**Symptom**: First test run takes 5+ minutes pulling Docker images.

**Solution**: Pre-pull images in a separate CI step, use Docker layer caching, or configure a Docker registry mirror. See the performance optimization section above.

### Tests pass locally, fail in CI

**Symptom**: Testcontainers tests work on developer machines but fail in CI.

**Solution**: Common causes include insufficient memory on CI runners (increase runner size), missing Docker socket permissions, or Ryuk being unable to clean up (check firewall rules for Ryuk's port).

---

## Related QA Skills

Enhance your Docker-based integration testing with these complementary skills from [qaskills.sh](https://qaskills.sh):

\`\`\`bash
# Core Testcontainers patterns for AI agents
npx @qaskills/cli add testcontainers-patterns

# Database testing automation and migration verification
npx @qaskills/cli add database-testing

# API integration testing patterns
npx @qaskills/cli add api-testing

# CI/CD pipeline testing with GitHub Actions
npx @qaskills/cli add cicd-testing

# Microservices testing strategies
npx @qaskills/cli add microservices-testing

# Performance testing with container-based load generation
npx @qaskills/cli add performance-testing
\`\`\`

Browse the full directory at [qaskills.sh/skills](https://qaskills.sh/skills) or search from your terminal:

\`\`\`bash
npx @qaskills/cli search --category integration
\`\`\`
`,
};
