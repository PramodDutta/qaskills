import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Postgres Java Spring Boot — Complete Guide 2026',
  description:
    'Master Testcontainers for PostgreSQL in Java and Spring Boot. Real JDBC integration tests with Flyway, Liquibase, JPA, and CI/CD patterns.',
  date: '2026-05-05',
  category: 'Guide',
  content: `
# Testcontainers Postgres Java Spring Boot Complete Guide

PostgreSQL is the most-deployed open-source database in modern Java applications, powering everything from Spring Boot microservices to massive multi-tenant SaaS platforms. Testing JPA, Spring Data, and JDBC code that depends on PostgreSQL-specific features (JSONB, full-text search, generated columns, partitioning) has historically been a tradeoff between H2 (incomplete SQL dialect), shared Postgres instances (flaky, slow, hard to parallelize), or docker-compose (separate startup step). Testcontainers solves all of this by spinning up a real PostgreSQL instance per test class, programmatically managed by JUnit 5, with one annotation.

This guide is a hands-on walkthrough of Testcontainers with PostgreSQL for Java and Spring Boot in 2026. We cover the PostgreSQLContainer module, Spring Boot 3 integration via @DynamicPropertySource, JDBC URL property substitution, Flyway and Liquibase migration patterns, JPA repository tests, transactional rollback for fast tests, container reuse for local dev, and CI/CD configuration. Every code sample is working Java with JUnit 5, Spring Boot 3, and Testcontainers 1.20+.

---

## Key Takeaways

- **PostgreSQLContainer** provides one-line setup for real PostgreSQL in tests
- **@DynamicPropertySource** is the Spring Boot integration mechanism for injecting JDBC URL, username, password
- **JDBC URL substitution** is an alternative pattern using \`jdbc:tc:postgresql:16:///\`
- **Flyway and Liquibase** both work seamlessly — migrations run as part of Spring context startup
- **Transactional rollback** via @Transactional gives instant test isolation
- **Container reuse** drops local startup from 5 seconds to under 1 second
- **CI/CD setup is trivial** because Docker is available on GitHub Actions ubuntu runners

---

## Why Testcontainers for PostgreSQL in Java

The alternatives are all flawed. H2 in PostgreSQL compatibility mode handles 60-70% of SQL but breaks on JSONB, generated columns, window functions, stored procedures, full-text search, and dozens of other features. HSQLDB has the same problems. Embedded Postgres (otj-pg-embedded, zonky/embedded-postgres) is closer to real Postgres but lags behind versions and behaves differently on Mac M-series chips.

Testcontainers gives you real Postgres, in any version you care about, with one annotation and no platform-specific gotchas.

---

## Installation

Maven:

\`\`\`xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.20.4</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <version>1.20.4</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
  <groupId>org.postgresql</groupId>
  <artifactId>postgresql</artifactId>
  <scope>runtime</scope>
</dependency>
\`\`\`

Spring Boot 3.1+ also offers \`spring-boot-testcontainers\` which simplifies setup:

\`\`\`xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-testcontainers</artifactId>
  <scope>test</scope>
</dependency>
\`\`\`

---

## Your First Test

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
class PostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void runsQuery() throws Exception {
        try (Connection conn = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
             Statement st = conn.createStatement()) {
            ResultSet rs = st.executeQuery("SELECT 1 + 1");
            rs.next();
            assertEquals(2, rs.getInt(1));
        }
    }
}
\`\`\`

---

## Spring Boot Integration with @DynamicPropertySource

This is the standard pattern for Spring Boot 3:

\`\`\`java
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
@Testcontainers
class UserRepositoryTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void savesAndLoadsUser() {
        User saved = userRepository.save(new User("alice@example.com"));
        User loaded = userRepository.findById(saved.getId()).orElseThrow();
        assertEquals("alice@example.com", loaded.getEmail());
    }
}
\`\`\`

The @DynamicPropertySource method runs before Spring boot starts, so the container is ready when JPA initializes.

---

## JDBC URL Substitution Pattern

Testcontainers also supports a special JDBC URL syntax that doesn't require any Java code — just configure your application properties:

\`\`\`properties
# application-test.properties
spring.datasource.url=jdbc:tc:postgresql:16-alpine:///test
spring.datasource.driver-class-name=org.testcontainers.jdbc.ContainerDatabaseDriver
\`\`\`

When the application starts a connection on \`jdbc:tc:\` URL, Testcontainers transparently starts a container and substitutes the real URL. Useful for quick prototypes but less explicit than @DynamicPropertySource.

---

## PostgreSQLContainer API Reference

| Method | Purpose | Default |
|---|---|---|
| Constructor | Image like \`postgres:16-alpine\` | none |
| \`.withDatabaseName(name)\` | Override database name | \`test\` |
| \`.withUsername(name)\` | Override username | \`test\` |
| \`.withPassword(pwd)\` | Override password | \`test\` |
| \`.withInitScript(path)\` | Run SQL script on startup | none |
| \`.withReuse(true)\` | Reuse container across runs | disabled |
| \`.withCopyFileToContainer(...)\` | Copy files in | none |

After start:

| Method | Returns |
|---|---|
| \`getJdbcUrl()\` | JDBC URL |
| \`getUsername()\` | Username |
| \`getPassword()\` | Password |
| \`getDatabaseName()\` | Database name |
| \`getHost()\` | Hostname |
| \`getFirstMappedPort()\` | Postgres port |

---

## Flyway Migration Integration

Flyway migrations run automatically when Spring Boot starts. Just put your migrations in \`src/main/resources/db/migration/\`:

\`\`\`sql
-- V1__create_users.sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

\`\`\`properties
spring.flyway.enabled=true
spring.jpa.hibernate.ddl-auto=validate
\`\`\`

Your tests will start with the schema migrated to current head. To run test-only migrations, place them in \`src/test/resources/db/migration/\` and include both folders in \`spring.flyway.locations\`.

---

## Liquibase Integration

For Liquibase users:

\`\`\`properties
spring.liquibase.enabled=true
spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.xml
\`\`\`

Liquibase runs as part of the Spring startup and migrations apply to the Testcontainers Postgres instance.

---

## JPA Repository Tests with @DataJpaTest

For repository-layer tests, \`@DataJpaTest\` is faster than full \`@SpringBootTest\`:

\`\`\`java
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class UserRepositoryDataJpaTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void findsByEmail() {
        userRepository.save(new User("a@b.com"));
        assertTrue(userRepository.findByEmail("a@b.com").isPresent());
    }
}
\`\`\`

\`@AutoConfigureTestDatabase(replace = NONE)\` disables Spring's automatic H2 substitution.

---

## Testing JSONB

JSONB is where H2 utterly fails. With Testcontainers, JSONB tests work:

\`\`\`java
@Test
void queriesJsonb() {
    User user = new User();
    user.setEmail("alice@example.com");
    user.setMetadata(Map.of("plan", "pro", "seats", 10));
    userRepository.save(user);

    List<User> proUsers = userRepository.findByMetadataPlan("pro");
    assertEquals(1, proUsers.size());
}
\`\`\`

\`\`\`java
@Query("SELECT u FROM User u WHERE function('jsonb_extract_path_text', u.metadata, 'plan') = :plan")
List<User> findByMetadataPlan(@Param("plan") String plan);
\`\`\`

---

## Per-Test Isolation with @Transactional

Spring's @Transactional rolls back after each test by default in @SpringBootTest:

\`\`\`java
@SpringBootTest
@Testcontainers
@Transactional
class UserServiceTransactionalTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
    // dynamic property source omitted for brevity

    @Test
    void test1() {
        userRepository.save(new User("a@b.com"));
        // rolled back automatically after test
    }

    @Test
    void test2() {
        assertEquals(0, userRepository.count()); // clean state
    }
}
\`\`\`

Caveat: @Transactional rollback doesn't work for code that calls its own \`TransactionTemplate.execute\` because that creates a nested transaction.

---

## Container Reuse

\`\`\`java
@Container
static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
    .withReuse(true);
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

First run: 5 seconds. Subsequent runs: under 1 second.

---

## Spring Boot 3.1+ Service Connection

Spring Boot 3.1 added \`@ServiceConnection\` which generates @DynamicPropertySource automatically:

\`\`\`java
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;

@SpringBootTest
@Testcontainers
class UserRepoTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired UserRepository userRepository;

    @Test
    void works() {
        // Spring auto-configures spring.datasource.url etc.
    }
}
\`\`\`

This is the cleanest pattern in Spring Boot 3.1+ projects.

---

## CI/CD Configuration

\`\`\`yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - uses: actions/cache@v4
        with:
          path: ~/.m2/repository
          key: \${{ runner.os }}-maven-\${{ hashFiles('**/pom.xml') }}
      - run: ./mvnw test
\`\`\`

---

## Common Pitfalls

**ddl-auto: create.** Don't use create or create-drop with real Postgres in tests. Use validate plus Flyway/Liquibase, or update if you must.

**Slow startup with many @SpringBootTest classes.** Each class restarts the Spring context. Use @ContextConfiguration to share contexts across test classes when possible.

**Transactional + multiple connections.** If your code uses non-default DataSources, @Transactional rollback won't cover them.

**Image version drift.** Always pin to a specific tag like \`postgres:16-alpine\`, never \`postgres:latest\`.

---

## Conclusion

Testcontainers transforms Postgres integration testing in Java and Spring Boot. Real Postgres, real JPA mappings, real JSONB, real Flyway migrations — all isolated per test class with one annotation. Spring Boot 3.1+ @ServiceConnection makes setup even simpler. Container reuse keeps local iteration fast, and CI requires zero configuration.

Browse the [QA skills directory](/skills) for related Java testing patterns, or read our [Kafka guide](/blog/testcontainers-kafka-java-spring-boot-guide) for event-driven systems.
`,
};
