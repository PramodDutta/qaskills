import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers JUnit 5: Docker Integration Testing in Java',
  description:
    'A complete Testcontainers JUnit 5 tutorial for 2026: run integration tests against real PostgreSQL and Docker containers with @Testcontainers and @Container.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# Testcontainers JUnit 5: Docker Integration Testing in Java

If your integration tests still mock the database or rely on an in-memory H2 that behaves nothing like production PostgreSQL, they are lying to you. Tests that pass against a fake dependency but fail against the real one are worse than no tests, because they buy false confidence. **Testcontainers** solves this by spinning up real Docker containers, real Postgres, real Redis, real Kafka, for the duration of your test run, then tearing them down automatically. You get production-fidelity dependencies with the ergonomics of a unit test.

This guide is a hands-on, code-first walkthrough of **Testcontainers with JUnit 5** for Java developers. We will cover the \`@Testcontainers\` and \`@Container\` annotations, the \`PostgreSQLContainer\` module, the generic \`GenericContainer\` for any Docker image, container lifecycle (per-class vs per-method), wiring the JDBC URL into your application, waiting strategies, network configuration, and reuse for fast local feedback. Every snippet is real, runnable code that compiles against Testcontainers 1.20+ and JUnit Jupiter 5.10+.

By the end you will know how to write integration tests that talk to genuine infrastructure, run identically on your laptop and in CI, and never leak containers or ports. This is the same pattern used by teams doing serious [database testing](/blog/database-testing-automation-guide) and [microservices testing](/blog/microservices-testing-strategies), and it pairs well with the broader [QA skills](/skills) needed to test AI-generated code with confidence.

## Why Testcontainers Beats Mocks and In-Memory Databases

The core problem with mocks and H2 is dialect drift. PostgreSQL has \`JSONB\`, arrays, \`ON CONFLICT\`, partial indexes, \`RETURNING\`, and window functions that H2 either does not support or implements differently. Your ORM might generate SQL that H2 tolerates but Postgres rejects, and you find out in production.

| Approach | Fidelity | Speed | Catches SQL dialect bugs | Setup cost |
|---|---|---|---|---|
| Mockito mocks | None (you assert on your own mock) | Fastest | No | Low |
| H2 in-memory | Low (different dialect) | Fast | Rarely | Low |
| Shared staging DB | High | Slow, flaky, shared state | Yes | High |
| Testcontainers | High (real image) | Fast enough (seconds) | Yes | Low |

Testcontainers gives you the fidelity of a real database with near-unit-test isolation: every test run gets a clean container, so there is no shared state, no leftover rows, and no "works on my machine" drift between developers.

## Prerequisites and Maven Setup

You need a running Docker daemon (Docker Desktop, Colima, Rancher Desktop, or a remote Docker host via \`DOCKER_HOST\`). Testcontainers auto-detects the environment.

Add the Testcontainers BOM and modules to your \`pom.xml\`:

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
    <version>42.7.4</version>
  </dependency>
</dependencies>
\`\`\`

For Gradle, the equivalent is a \`testImplementation platform('org.testcontainers:testcontainers-bom:1.20.4')\` line plus the \`junit-jupiter\` and \`postgresql\` artifacts.

## Your First Test: @Testcontainers and @Container

The \`junit-jupiter\` module ships a JUnit 5 extension. Annotate the test class with \`@Testcontainers\` to activate it, and mark each container field with \`@Container\`. The extension starts every \`@Container\` before tests and stops it after.

\`\`\`java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Testcontainers
class PostgresBasicTest {

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("shop")
          .withUsername("app")
          .withPassword("secret");

  @Test
  void connectsAndQueries() throws Exception {
    try (Connection conn = DriverManager.getConnection(
            POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
         Statement stmt = conn.createStatement()) {

      stmt.execute("CREATE TABLE product (id serial PRIMARY KEY, name text NOT NULL)");
      stmt.execute("INSERT INTO product (name) VALUES ('Keyboard'), ('Mouse')");

      try (ResultSet rs = stmt.executeQuery("SELECT count(*) FROM product")) {
        rs.next();
        assertEquals(2, rs.getInt(1));
      }
    }
  }
}
\`\`\`

Notice \`POSTGRES\` is \`static\`. That matters: a static \`@Container\` starts once for the whole class (per-class lifecycle), while a non-static \`@Container\` starts and stops for every test method (per-method lifecycle). Choose based on isolation needs.

## Container Lifecycle: Static vs Instance Fields

This is the single most important lifecycle rule in Testcontainers with JUnit 5.

| Field modifier | Lifecycle | Started/stopped | Use when |
|---|---|---|---|
| \`static @Container\` | Per class | Once before all tests, once after | Container is expensive; tests do not pollute shared state |
| Instance \`@Container\` | Per method | Before and after every test | Each test needs a pristine container |

A shared static Postgres is the common choice because starting a database costs a couple of seconds. To keep tests isolated without paying that cost per method, keep the container static and reset data yourself, for example truncating tables in an \`@AfterEach\`, or wrapping each test in a rolled-back transaction.

\`\`\`java
import org.junit.jupiter.api.AfterEach;

@AfterEach
void cleanTables() throws Exception {
  try (Connection conn = DriverManager.getConnection(
          POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
       Statement stmt = conn.createStatement()) {
    stmt.execute("TRUNCATE product RESTART IDENTITY CASCADE");
  }
}
\`\`\`

## Wiring the Container Into Spring Boot with @DynamicPropertySource

Most real applications resolve the datasource from configuration, not by calling \`getJdbcUrl()\` in the test. The container's port is random, so you must inject its coordinates at runtime. In Spring Boot, \`@DynamicPropertySource\` does exactly that.

\`\`\`java
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
class ProductRepositoryIT {

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void datasourceProps(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
  }

  // @Autowired your repository and assert against real Postgres...
}
\`\`\`

Because the container starts before the Spring context (static field, started by the extension), the property suppliers resolve to the live JDBC URL when the context boots.

## Running Any Image with GenericContainer

Not every dependency has a dedicated module. \`GenericContainer\` runs any Docker image. You expose ports, set environment variables, and define a waiting strategy so the test does not race the container startup.

\`\`\`java
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
class RedisGenericTest {

  @Container
  static final GenericContainer<?> REDIS =
      new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
          .withExposedPorts(6379)
          .waitingFor(Wait.forListeningPort());

  @Test
  void redisIsReachable() {
    String host = REDIS.getHost();
    Integer port = REDIS.getMappedPort(6379);
    // Point a Jedis/Lettuce client at host:port and assert PING -> PONG
    assertEquals(true, port > 0);
  }
}
\`\`\`

Always use \`getMappedPort()\` rather than hardcoding the port. Testcontainers binds the container's internal port to a random free host port to avoid collisions in CI.

## Waiting Strategies: Do Not Race Startup

A container that is "running" is not necessarily "ready." A database process may be up while it is still initializing. Waiting strategies bridge that gap. Pick the one that matches how the service signals readiness.

| Strategy | Signals readiness by | Best for |
|---|---|---|
| \`Wait.forListeningPort()\` | TCP port accepting connections | Simple TCP services |
| \`Wait.forLogMessage(regex, times)\` | A log line appearing N times | Services that print "ready" |
| \`Wait.forHttp("/health").forStatusCode(200)\` | HTTP endpoint returning a code | Web apps and APIs |
| \`Wait.forHealthcheck()\` | Docker HEALTHCHECK passing | Images with a built-in healthcheck |

\`\`\`java
static final GenericContainer<?> API =
    new GenericContainer<>(DockerImageName.parse("my-org/api:latest"))
        .withExposedPorts(8080)
        .waitingFor(
            Wait.forHttp("/actuator/health")
                .forStatusCode(200)
                .withStartupTimeout(java.time.Duration.ofSeconds(60)));
\`\`\`

Choosing the wrong strategy is the number one cause of flaky Testcontainers tests. If a test intermittently fails on first request, your wait strategy is almost always the culprit.

## Seeding Schema and Data with init Scripts

For raw JDBC tests, \`withInitScript\` runs a SQL file against the freshly started database before your tests execute. Place the file on the test classpath, for example \`src/test/resources/init.sql\`.

\`\`\`java
@Container
static final PostgreSQLContainer<?> POSTGRES =
    new PostgreSQLContainer<>("postgres:16-alpine")
        .withInitScript("init.sql");
\`\`\`

For applications that already own their migrations, prefer running Flyway or Liquibase against the container so the test exercises the exact same schema path as production. That way your migrations are tested too, not bypassed.

## Multiple Containers on a Shared Network

When one container must reach another, for example an app container talking to a database container, put them on the same Docker network and address by network alias, not by mapped host port.

\`\`\`java
import org.testcontainers.containers.Network;

static final Network NET = Network.newNetwork();

@Container
static final PostgreSQLContainer<?> DB =
    new PostgreSQLContainer<>("postgres:16-alpine")
        .withNetwork(NET)
        .withNetworkAliases("db");

@Container
static final GenericContainer<?> APP =
    new GenericContainer<>(DockerImageName.parse("my-org/app:latest"))
        .withNetwork(NET)
        .withExposedPorts(8080)
        .withEnv("DB_URL", "jdbc:postgresql://db:5432/test")
        .dependsOn(DB);
\`\`\`

Inside the network, containers reach each other by alias and internal port (\`db:5432\`). Your test process, running outside the network, reaches \`APP\` via \`APP.getHost()\` and \`APP.getMappedPort(8080)\`.

## Speeding Up Local Runs with Container Reuse

Reuse keeps a container alive between test runs on your machine so you skip cold starts during rapid iteration. It is opt-in and disabled in CI by default, which is correct: CI wants clean state.

\`\`\`java
@Container
static final PostgreSQLContainer<?> POSTGRES =
    new PostgreSQLContainer<>("postgres:16-alpine")
        .withReuse(true);
\`\`\`

Then enable reuse in \`~/.testcontainers.properties\`:

\`\`\`properties
testcontainers.reuse.enable=true
\`\`\`

With reuse, containers marked reusable are not stopped by Ryuk, the resource-reaper sidecar, so the next run attaches to the existing container. Remember to reset data between runs since state persists.

## Running Testcontainers in CI

Testcontainers runs anywhere Docker runs. In GitHub Actions, the standard \`ubuntu-latest\` runner already has Docker, so no extra setup is needed.

\`\`\`yaml
name: integration-tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven
      - run: mvn -B verify
\`\`\`

Keep reuse off in CI (it is off unless the properties file enables it), pin image tags to a specific version rather than \`latest\` for reproducibility, and let Ryuk clean up so no containers leak between jobs. If you run into Docker socket permission issues on self-hosted runners, expose \`DOCKER_HOST\` and ensure the runner user is in the \`docker\` group.

## Testing Kafka, Redis, and LocalStack Modules

Postgres is the gateway module, but Testcontainers ships dedicated modules for most infrastructure you depend on. The pattern is identical: add the module artifact, declare a typed container, read its runtime coordinates. Here is a Kafka container that gives you a live broker with a bootstrap-servers string you can hand straight to a producer.

\`\`\`java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.Properties;

@Testcontainers
class KafkaModuleTest {

  @Container
  static final KafkaContainer KAFKA =
      new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

  @Test
  void publishesToRealBroker() throws Exception {
    Properties props = new Properties();
    props.put("bootstrap.servers", KAFKA.getBootstrapServers());
    props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
    props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

    try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
      producer.send(new ProducerRecord<>("orders", "order-1", "{\\"total\\":42}")).get();
    }
    // Point a consumer at the same bootstrap servers and assert the record arrives.
  }
}
\`\`\`

LocalStack emulates AWS services (S3, SQS, DynamoDB, Lambda) inside a single container, so you can test cloud integrations without touching a real account. Declare the services you need and read the endpoint override.

\`\`\`java
import org.testcontainers.containers.localstack.LocalStackContainer;
import org.testcontainers.containers.localstack.LocalStackContainer.Service;

@Container
static final LocalStackContainer LOCALSTACK =
    new LocalStackContainer(DockerImageName.parse("localstack/localstack:3.5"))
        .withServices(Service.S3, Service.SQS);

// In the test, build an S3 client pointed at LOCALSTACK.getEndpoint()
// with LOCALSTACK.getAccessKey() / getSecretKey() / getRegion().
\`\`\`

This table maps common dependencies to the module artifact and the accessor you use to reach them:

| Dependency | Maven artifact | Key accessor |
|---|---|---|
| PostgreSQL | \`org.testcontainers:postgresql\` | \`getJdbcUrl()\` |
| Kafka | \`org.testcontainers:kafka\` | \`getBootstrapServers()\` |
| Redis | \`org.testcontainers:testcontainers\` (GenericContainer) | \`getHost()\` + \`getMappedPort(6379)\` |
| LocalStack (AWS) | \`org.testcontainers:localstack\` | \`getEndpoint()\` |
| MongoDB | \`org.testcontainers:mongodb\` | \`getReplicaSetUrl()\` |
| Elasticsearch | \`org.testcontainers:elasticsearch\` | \`getHttpHostAddress()\` |

## Spring Boot 3.1+ with @ServiceConnection

Spring Boot 3.1 introduced \`@ServiceConnection\`, which removes the \`@DynamicPropertySource\` boilerplate entirely. Annotate a container bean and Spring auto-detects the connection details, wiring the datasource, Redis, Kafka, or Mongo properties for you. There is nothing to register by hand.

\`\`\`java
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
class OrderServiceIT {

  @Container
  @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16-alpine");

  // No @DynamicPropertySource needed. Spring reads the container's
  // JDBC URL, username, and password from the @ServiceConnection bean.
}
\`\`\`

You can also define reusable containers as beans in a \`@TestConfiguration\` and import them across many test classes, so a whole suite shares one broker and one database without repeating declarations. This is the cleanest pattern for a large Spring Boot codebase, and it composes with local development too: Spring Boot's \`spring-boot-testcontainers\` support can boot the same containers when you run the app with \`bootTestRun\`, giving developers a real database on startup with zero manual Docker commands.

## Parallel Test Execution and Container Reuse Tuning

Integration suites get slow as they grow. Two levers cut wall-clock time: running tests in parallel and reusing containers so cold starts do not dominate. JUnit 5 enables parallelism through \`junit-platform.properties\`.

\`\`\`properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.mode.classes.default=concurrent
junit.jupiter.execution.parallel.config.strategy=dynamic
junit.jupiter.execution.parallel.config.dynamic.factor=2
\`\`\`

The critical rule when combining parallelism with a shared static container: separate classes running concurrently against one Postgres will collide on data. Give each class its own container, or isolate data per class using a unique schema or database name generated at startup. A common approach is a shared, reusable database plus a per-class schema created in \`@BeforeAll\` and dropped in \`@AfterAll\`, so classes never see each other's rows.

For reuse, note that Ryuk (the reaper sidecar) is what normally kills leftover containers. When \`testcontainers.reuse.enable=true\`, reusable containers are exempt so they survive between runs. Tune image pulls and startup with these properties, all set in \`~/.testcontainers.properties\`:

| Property | Effect | Typical value |
|---|---|---|
| \`testcontainers.reuse.enable\` | Keep reusable containers alive across runs | \`true\` locally, unset in CI |
| \`ryuk.disabled\` | Turn off the reaper entirely | \`false\` (leave on in CI) |
| \`checks.disable\` | Skip startup environment checks for faster boot | \`true\` on trusted machines |
| \`docker.client.strategy\` | Force a specific Docker discovery strategy | provider-specific |

Never disable Ryuk in CI: a crashed job would leak containers and eventually exhaust the runner. Reuse and \`checks.disable\` are safe local speedups; keep them out of the CI environment.

## Debugging Containers: Logs, Exec, and Inspection

When a container-backed test fails, you need to see inside the container. Testcontainers streams container output to an SLF4J logger, so you can attach a consumer and print everything the container wrote to stdout and stderr.

\`\`\`java
import org.testcontainers.containers.output.Slf4jLogConsumer;
import org.slf4j.LoggerFactory;

@Container
static final GenericContainer<?> APP =
    new GenericContainer<>(DockerImageName.parse("my-org/app:latest"))
        .withExposedPorts(8080)
        .withLogConsumer(new Slf4jLogConsumer(LoggerFactory.getLogger("APP-CONTAINER")));
\`\`\`

To grab logs on demand, call \`APP.getLogs()\` and print them in a JUnit \`@AfterEach\` or a failure handler. You can also run commands inside a running container with \`execInContainer\`, which is invaluable for asserting side effects such as a file being written or a queue draining.

\`\`\`java
import org.testcontainers.containers.Container.ExecResult;

ExecResult result = APP.execInContainer("cat", "/var/log/app/status.log");
assertEquals(0, result.getExitCode());
assertTrue(result.getStdout().contains("READY"));
\`\`\`

For interactive debugging, keep a container alive after a failed run using reuse, then \`docker exec -it <id> sh\` into it manually to poke around. Combine \`getLogs()\` output in CI with the uploaded build artifacts so a failing pipeline gives you the container's own diagnostics, not just the Java stack trace, which turns a mysterious red build into a quick, evidence-based fix.

## Common Pitfalls and How to Avoid Them

Non-static \`@Container\` with \`@DynamicPropertySource\` fails because the property source is static and runs before instance fields exist. Keep the container static when injecting into Spring. Hardcoding ports collides in parallel CI, always use \`getMappedPort()\`. Using \`latest\` image tags makes builds non-reproducible, pin versions. Forgetting a waiting strategy on \`GenericContainer\` causes race-condition flakiness. And truncating tables in \`@BeforeEach\` rather than \`@AfterEach\` can leave the last test's data behind for anyone inspecting the container, prefer cleaning after. For deeper patterns across services, our [API testing](/blog/api-testing-complete-guide) guide shows how to combine container-backed dependencies with contract checks.

## Frequently Asked Questions

### What is Testcontainers and how does it work with JUnit 5?

Testcontainers is a Java library that starts real Docker containers for use as test dependencies. With JUnit 5, the \`junit-jupiter\` module provides an extension activated by \`@Testcontainers\`. Fields annotated \`@Container\` are started before tests and stopped after. Static fields share one container per class; instance fields create one per test method.

### Do I need Docker installed to run Testcontainers?

Yes. Testcontainers requires a running Docker-compatible runtime such as Docker Desktop, Colima, Rancher Desktop, or a remote daemon reachable via \`DOCKER_HOST\`. It auto-detects the environment at startup. In CI, standard GitHub Actions and GitLab runners include Docker, so no additional configuration is usually required beyond checking out the code.

### How is Testcontainers different from an H2 in-memory database?

H2 emulates SQL but uses a different dialect, so PostgreSQL-specific features like JSONB, arrays, and \`ON CONFLICT\` behave differently or fail. Testcontainers runs the actual PostgreSQL image, giving production-identical behavior. You catch SQL dialect bugs and migration errors before deployment instead of discovering them in staging or production.

### Should my @Container field be static or non-static?

Make it static when the container is expensive and tests do not corrupt shared state; it starts once per class. Make it non-static when every test needs a pristine container; it restarts per method at the cost of speed. A common pattern is a static database container plus per-test data cleanup via \`TRUNCATE\` in \`@AfterEach\`.

### How do I inject the container's random port into Spring Boot?

Use \`@DynamicPropertySource\`. Testcontainers assigns a random host port, so you register method-reference suppliers such as \`registry.add("spring.datasource.url", POSTGRES::getJdbcUrl)\`. Because a static \`@Container\` starts before the Spring context boots, the suppliers resolve to the live coordinates when the datasource is created.

### Why are my Testcontainers tests flaky?

The most frequent cause is a missing or wrong waiting strategy, so tests hit the service before it is ready. Add \`waitingFor(Wait.forHttp("/health").forStatusCode(200))\` or \`Wait.forLogMessage(...)\` that matches how the service signals readiness. Other causes include hardcoded ports colliding in parallel CI and shared state from a static container without cleanup.

### Can I use container reuse to speed up local development?

Yes. Set \`.withReuse(true)\` on the container and \`testcontainers.reuse.enable=true\` in \`~/.testcontainers.properties\`. Reusable containers survive between runs on your machine, skipping cold starts. Reuse is off by default in CI, which is intentional, CI should run against clean containers. Remember to reset data yourself because state persists across runs.

### What is @ServiceConnection in Spring Boot and when should I use it?

\`@ServiceConnection\` arrived in Spring Boot 3.1 and eliminates \`@DynamicPropertySource\` boilerplate. Annotate a \`@Container\` bean with it and Spring auto-detects the connection details, wiring the JDBC URL, Redis host, Kafka bootstrap servers, or Mongo URI for the supported module. Use it whenever you are on Spring Boot 3.1 or later, it is less error-prone than registering property suppliers by hand and works across databases, caches, and message brokers.

## Conclusion

Testcontainers turns integration testing from a source of false confidence into a genuine safety net. By running real PostgreSQL and arbitrary Docker images through \`@Testcontainers\` and \`@Container\`, your JUnit 5 tests exercise the same infrastructure your users hit in production, catching SQL dialect bugs, migration errors, and wiring mistakes long before deploy. Get the lifecycle right (static for shared, instance for pristine), pick the correct waiting strategy, inject ports dynamically, and let Ryuk clean up.

Ready to level up your integration testing practice? Explore the curated [QA skills](/skills) directory for AI coding agents to add battle-tested Testcontainers, database, and microservices testing skills directly to your workflow.
`,
};
