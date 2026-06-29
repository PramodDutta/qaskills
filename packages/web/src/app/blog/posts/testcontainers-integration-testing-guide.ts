import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Integration Testing: 2026 Guide',
  description:
    'Use Testcontainers to spin up real Postgres, Redis, and Kafka in disposable Docker containers for integration tests. Java JUnit 5 and Python pytest examples, CI, and tuning.',
  date: '2026-06-29',
  category: 'Guide',
  content: `
# Testcontainers Integration Testing: The Complete 2026 Guide

For years the default way to "integration test" a service was to mock the database. You stubbed out the repository layer, asserted that some method was called with some arguments, and called it a day. The trouble is that mocks test your assumptions about the database, not the database itself. They cannot catch a broken SQL migration, a JSONB query that behaves differently on your real Postgres version, a unique-constraint violation, a transaction isolation surprise, or a Redis command that your client serializes incorrectly. The bugs that hurt most in production are exactly the ones living in the gap between your mock and reality.

Testcontainers closes that gap. It is a library, available for Java, Python, Go, .NET, Node, and more, that programmatically starts real services inside throwaway Docker containers for the duration of your tests, then tears them down. Your test talks to a genuine PostgreSQL 16, a genuine Redis, or a genuine Kafka broker, gets a real connection string at runtime, and runs assertions against actual behavior. When the test finishes, the container is destroyed, so there is no shared mutable state and no "works on my machine" drift.

In 2026 Testcontainers has become the default approach to integration testing for any team that takes correctness seriously, and it pairs naturally with the broader database-testing discipline we cover in our [database testing automation guide](/blog/database-testing-automation-guide). This guide explains why you should prefer it over mocks, how to install and use it in both Java (JUnit 5) and Python (pytest), a fully worked Postgres example in each, and the production-grade concerns that separate a slow flaky suite from a fast reliable one: container reuse, networks, wait strategies, CI configuration, and performance tuning. If you are building out a complete testing stack, the [QA skills directory](/skills) has agent-ready skills that complement this workflow.

## Why Real Containers Beat Mocks

The case for Testcontainers comes down to fidelity. A mock asserts behavior you wrote down; a container asserts behavior the real system exhibits.

| Concern | Mocked database | Testcontainers |
|---|---|---|
| Catches broken SQL/migrations | No | Yes |
| Tests real constraints and indexes | No | Yes |
| Validates dialect-specific features (JSONB, arrays) | No | Yes |
| Transaction/isolation behavior | No | Yes |
| Setup effort | Low | Low (Docker only) |
| Test speed | Fastest | Fast (seconds) |
| Confidence in production parity | Low | High |

The trade-off is real but small: containers take seconds to start, whereas a mock is instantaneous. In exchange you get tests that fail when production would fail. For unit tests of pure business logic, keep mocking. For anything that touches the data layer, a message broker, or a cache, run the real thing in a container. This is the same shift-left philosophy described in our [shift-left testing with AI agents](/blog/shift-left-testing-ai-agents) article: catch integration defects on a developer laptop, not in staging.

## Prerequisites

You need a running Docker daemon (Docker Desktop, Colima, Podman with the Docker API, or a Docker socket in CI). Testcontainers talks to that daemon to pull images and manage containers. That is the only infrastructure requirement; everything else is a library dependency in your build file.

## Testcontainers with Java and JUnit 5

The Java module is the most mature. Add the BOM and the modules you need to Maven:

\`\`\`xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>testcontainers-bom</artifactId>
      <version>1.20.4</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
\`\`\`

Or with Gradle:

\`\`\`groovy
dependencies {
    testImplementation platform('org.testcontainers:testcontainers-bom:1.20.4')
    testImplementation 'org.testcontainers:junit-jupiter'
    testImplementation 'org.testcontainers:postgresql'
    testImplementation 'org.postgresql:postgresql'
}
\`\`\`

### A worked Postgres example in JUnit 5

The \`@Testcontainers\` and \`@Container\` annotations manage the lifecycle. Mark the container \`static\` so it starts once for the whole class instead of per test method:

\`\`\`java
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("appdb")
                    .withUsername("app")
                    .withPassword("secret");

    Connection conn;

    @BeforeEach
    void setUp() throws Exception {
        conn = DriverManager.getConnection(
                postgres.getJdbcUrl(),
                postgres.getUsername(),
                postgres.getPassword());
        try (Statement st = conn.createStatement()) {
            st.execute("CREATE TABLE IF NOT EXISTS users (" +
                    "id SERIAL PRIMARY KEY, " +
                    "email TEXT UNIQUE NOT NULL, " +
                    "profile JSONB)");
            st.execute("TRUNCATE users RESTART IDENTITY");
        }
    }

    @Test
    void insertsAndReadsBackUser() throws Exception {
        try (Statement st = conn.createStatement()) {
            st.execute("INSERT INTO users (email, profile) VALUES " +
                    "('ada@example.com', '{\\"role\\":\\"admin\\"}')");
            ResultSet rs = st.executeQuery(
                    "SELECT email, profile->>'role' AS role FROM users");
            assertTrue(rs.next());
            assertEquals("ada@example.com", rs.getString("email"));
            assertEquals("admin", rs.getString("role"));
        }
    }

    @Test
    void enforcesUniqueEmailConstraint() throws Exception {
        try (Statement st = conn.createStatement()) {
            st.execute("INSERT INTO users (email) VALUES ('dup@example.com')");
        }
        boolean threw = false;
        try (Statement st = conn.createStatement()) {
            st.execute("INSERT INTO users (email) VALUES ('dup@example.com')");
        } catch (Exception e) {
            threw = true;
        }
        assertTrue(threw, "Expected unique constraint violation");
    }
}
\`\`\`

The second test is the whole point of Testcontainers: a mock would happily let you insert two rows with the same email, but real Postgres rejects the duplicate, and your test proves the constraint is enforced. The JSONB read in the first test is a dialect-specific feature that no generic mock reproduces faithfully.

### Spring Boot integration

If you use Spring Boot, the \`@ServiceConnection\` annotation wires the container straight into your application context with zero manual property plumbing:

\`\`\`java
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest
class OrderServiceIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine");

    // Spring auto-configures the DataSource from the container.
    // Inject your repositories and test against real Postgres.
}
\`\`\`

## Testcontainers with Python and pytest

The Python module is excellent and integrates cleanly with pytest fixtures. Install it:

\`\`\`bash
pip install testcontainers[postgres] psycopg pytest
\`\`\`

### A worked Postgres example in pytest

Use a session-scoped fixture so the container starts once for the whole test run, and a function-scoped fixture to give each test a clean schema:

\`\`\`python
import psycopg
import pytest
from testcontainers.postgres import PostgresContainer


@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


@pytest.fixture
def conn(postgres):
    url = postgres.get_connection_url(driver=None)  # postgresql://...
    with psycopg.connect(url, autocommit=True) as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    profile JSONB
                )
                """
            )
            cur.execute("TRUNCATE users RESTART IDENTITY")
        yield connection


def test_insert_and_read_back(conn):
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (email, profile) VALUES (%s, %s)",
            ("ada@example.com", '{"role": "admin"}'),
        )
        cur.execute("SELECT email, profile->>'role' FROM users")
        email, role = cur.fetchone()
    assert email == "ada@example.com"
    assert role == "admin"


def test_unique_email_constraint(conn):
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users (email) VALUES (%s)", ("dup@example.com",))
    with pytest.raises(psycopg.errors.UniqueViolation):
        with conn.cursor() as cur:
            cur.execute("INSERT INTO users (email) VALUES (%s)", ("dup@example.com",))
\`\`\`

The structure mirrors the Java example exactly: real schema, real constraint, real JSONB. If you want to go deeper on pytest patterns like fixtures, parametrization, and markers, our [pytest complete guide](/blog/pytest-testing-complete-guide) pairs well with this section.

### Redis and Kafka in Python

The same pattern extends to other services. A Redis container:

\`\`\`python
import redis
import pytest
from testcontainers.redis import RedisContainer


@pytest.fixture(scope="session")
def redis_client():
    with RedisContainer("redis:7-alpine") as rc:
        host = rc.get_container_host_ip()
        port = rc.get_exposed_port(6379)
        yield redis.Redis(host=host, port=int(port), decode_responses=True)


def test_cache_set_get(redis_client):
    redis_client.set("session:42", "active", ex=60)
    assert redis_client.get("session:42") == "active"
    assert redis_client.ttl("session:42") <= 60
\`\`\`

A Kafka container with the generic module follows the same shape, exposing a bootstrap-servers string you hand to your producer and consumer clients. Because the broker is real, you catch serialization, partitioning, and consumer-group bugs that an in-memory fake would hide.

## Container Reuse: Making the Suite Fast

Starting a fresh container per test class is safe but adds seconds each time. Two techniques keep the suite fast.

First, scope the container so it starts once. In JUnit 5 that means a \`static\` \`@Container\`; in pytest it means a \`scope="session"\` fixture, as shown above. This is the single biggest win.

Second, enable Testcontainers' reuse feature so a container survives across separate test-process runs during local development. Add this to a \`~/.testcontainers.properties\` file:

\`\`\`properties
testcontainers.reuse.enable=true
\`\`\`

Then mark the container reusable in code. In Java:

\`\`\`java
static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
                .withReuse(true);
\`\`\`

With reuse on, the container is not torn down at the end of the run; the next run finds the existing container and attaches to it instantly. Critically, you should only enable reuse locally, never in CI, because each CI job must be hermetic. The reference table below summarizes the lifecycle controls.

| Goal | Java (JUnit 5) | Python (pytest) |
|---|---|---|
| Start once per class/run | \`static\` field | \`scope="session"\` fixture |
| Fresh state per test | re-create schema in \`@BeforeEach\` | re-create schema in function fixture |
| Survive across runs (local) | \`.withReuse(true)\` + properties | \`with_reuse=True\` + properties |
| Custom startup wait | \`.waitingFor(...)\` | \`wait_for_logs(...)\` |
| Multi-container topology | shared \`Network\` | shared \`Network\` |

## Networks: Wiring Containers Together

When a test needs two containers to talk to each other (for example an app container that connects to a database container), put them on a shared Docker network and address them by alias instead of by host port:

\`\`\`java
import org.testcontainers.containers.Network;
import org.testcontainers.containers.GenericContainer;

Network net = Network.newNetwork();

PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16-alpine")
        .withNetwork(net)
        .withNetworkAliases("db");

GenericContainer<?> app = new GenericContainer<>("myorg/myapp:latest")
        .withNetwork(net)
        .withEnv("DB_HOST", "db")   // resolves to the postgres container
        .withExposedPorts(8080)
        .dependsOn(db);
\`\`\`

Inside the network, \`db\` resolves to the Postgres container's internal address on its native port (5432), independent of whatever random host port Testcontainers mapped for your test process. This is how you reproduce a realistic service-to-service topology, which is invaluable when testing microservices, a topic explored further in our [microservices testing strategies](/blog/microservices-testing-strategies) guide.

## Wait Strategies: Avoiding Flaky Startup

A container being "started" by Docker does not mean the service inside it is ready to accept connections. Testcontainers solves this with wait strategies, and choosing the right one is the difference between a reliable suite and an intermittently flaky one. The official database modules already wait correctly, but for generic containers you must declare readiness explicitly.

\`\`\`java
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import java.time.Duration;

GenericContainer<?> api = new GenericContainer<>("myorg/api:latest")
        .withExposedPorts(8080)
        // Wait until an HTTP health check returns 200
        .waitingFor(Wait.forHttp("/health")
                .forStatusCode(200)
                .withStartupTimeout(Duration.ofSeconds(60)));

GenericContainer<?> worker = new GenericContainer<>("myorg/worker:latest")
        // Wait until a specific log line appears
        .waitingFor(Wait.forLogMessage(".*Started worker.*", 1));
\`\`\`

In Python the equivalents are \`wait_for_logs\` and HTTP probing helpers. The rule of thumb: prefer a health-endpoint or log-message wait over a fixed sleep. A fixed \`Thread.sleep\` is the classic source of flakiness, the same anti-pattern we dissect in our guide to [fixing flaky tests](/blog/fix-flaky-tests-guide).

## Running Testcontainers in CI

Testcontainers needs a Docker daemon in CI. On GitHub Actions, Docker is already available on the standard Ubuntu runners, so no extra setup is required:

\`\`\`yaml
name: Integration Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - name: Run integration tests
        run: ./mvnw verify
\`\`\`

For Python:

\`\`\`yaml
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: |
          pip install -r requirements-dev.txt
          pytest -v
\`\`\`

Two CI tips that matter. First, do not enable container reuse in CI; each job should pull fresh and tear down cleanly so runs are hermetic and parallel-safe. Second, pin your image tags (use \`postgres:16-alpine\`, not \`postgres:latest\`) so a surprise upstream image change cannot turn your pipeline red. Image pinning is the same reproducibility discipline that keeps any CI green, as discussed in our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

## Performance Tips

Integration suites earn a reputation for being slow, but most of that is avoidable. The biggest levers:

- **Use Alpine images.** \`postgres:16-alpine\` is a fraction of the size of the default image and pulls and starts faster.
- **Share containers across tests.** A session-scoped container plus a per-test schema reset is far faster than a container per test.
- **Reset data, not the container.** \`TRUNCATE ... RESTART IDENTITY\` between tests is milliseconds; recreating the container is seconds.
- **Run test classes in parallel.** Independent container instances let you parallelize, dramatically cutting wall-clock time on multi-core CI runners.
- **Cache Docker image layers in CI.** Pulling \`postgres:16-alpine\` once and caching it removes a recurring multi-second cost from every run.
- **Enable reuse locally.** Developers get near-instant feedback because the container is already warm from the previous run.

| Anti-pattern | Cost | Fix |
|---|---|---|
| Container per test method | Seconds x test count | Session/static scoping |
| \`Thread.sleep\` for readiness | Flaky + slow | HTTP/log wait strategy |
| \`postgres:latest\` tag | Non-reproducible | Pin a specific version |
| Recreating schema via new container | Slow | TRUNCATE between tests |
| Reuse enabled in CI | Non-hermetic runs | Reuse only locally |

## Frequently Asked Questions

### Do I need Docker installed to use Testcontainers?

Yes. Testcontainers works by talking to a Docker-compatible daemon to pull images and manage containers, so you need Docker Desktop, Colima, Podman with the Docker API, or a Docker socket available. On most CI providers such as GitHub Actions Ubuntu runners, Docker is preinstalled, so no extra setup is required beyond your normal build steps.

### Is Testcontainers faster than using an in-memory database like H2?

In-memory databases start faster but test a different engine than production, so they miss dialect-specific bugs in JSONB, arrays, constraints, and SQL functions. Testcontainers adds a few seconds of startup but runs the exact database you ship. With session-scoped containers, Alpine images, and local reuse, the speed gap shrinks while the fidelity gain is large, which is why teams increasingly prefer it.

### How do I share a Testcontainers container across multiple tests?

Scope the container so it starts once. In JUnit 5 declare the container as a static field with the @Container annotation; in pytest use a fixture with scope="session". Then reset state between tests by truncating tables or recreating the schema rather than restarting the container. This pattern is the single biggest performance win for a Testcontainers suite.

### Can I run Postgres, Redis, and Kafka together in one test?

Yes. Start each as its own container and, if they must communicate, put them on a shared Docker network and address them by network alias. Testcontainers exposes a connection string or bootstrap-servers value for each container at runtime, which you pass into your application or clients. This lets you reproduce a realistic multi-service topology inside a single test run.

### Why are my Testcontainers tests flaky on startup?

Flaky startup almost always means the test connects before the service inside the container is actually ready. Avoid fixed sleeps and instead declare an explicit wait strategy, such as waiting for an HTTP health endpoint to return 200 or for a specific log line to appear. The official database modules already wait correctly; generic containers need you to specify readiness yourself.

### Should I enable container reuse in CI?

No. Container reuse keeps a container alive across separate runs, which is great for fast local feedback but breaks the hermetic, isolated guarantee each CI job needs. Enable reuse only on developer machines through the testcontainers.reuse.enable property, and let CI pull fresh images and tear everything down so runs stay reproducible and safe to parallelize.

### How do I make Testcontainers suites run faster?

Use Alpine image variants, scope containers to start once per run, reset data with TRUNCATE instead of recreating the container, pin and cache Docker image layers in CI, and run independent test classes in parallel. Locally, enable container reuse so the container is already warm. Together these techniques typically cut a slow integration suite to a fraction of its original wall-clock time.

### Is Testcontainers only for Java?

No. Testcontainers has mature, well-supported libraries for Java, Python, Go, .NET, Node.js, and Rust, among others. The core concepts, including container lifecycle, wait strategies, networks, and reuse, are consistent across languages, so the patterns in this guide for Java and Python translate directly to the other supported ecosystems with only syntax differences.

## Conclusion

Mocks test the story you tell yourself about the database; Testcontainers tests the database. By spinning up real Postgres, Redis, or Kafka in disposable Docker containers, your integration tests catch broken migrations, constraint violations, dialect-specific query bugs, and serialization problems that mock-based tests structurally cannot see. The cost is a few seconds of startup, and the techniques in this guide, session scoping, Alpine images, data reset over container reset, explicit wait strategies, and local reuse, keep that cost small.

Start simple: pick one repository or service that currently mocks its database, replace those mocks with a Testcontainers Postgres instance, and watch the first real bug surface. Then extend the pattern to caches and brokers, wire multi-container topologies onto shared networks, and make Docker available in CI so the whole suite runs on every pull request. To round out a complete, modern testing stack, explore the agent-ready skills in the [QA skills directory](/skills) and pair this approach with the practices in our [database testing automation guide](/blog/database-testing-automation-guide).
`,
};
