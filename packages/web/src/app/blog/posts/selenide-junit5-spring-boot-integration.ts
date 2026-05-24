import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide JUnit 5 Spring Boot — Integration Guide 2026',
  description:
    'Master Selenide with JUnit 5 and Spring Boot. WebApplicationFactory, LocalServerPort, fixtures, parallel execution, and CI/CD patterns.',
  date: '2026-05-15',
  category: 'Integration',
  content: `
# Selenide JUnit 5 Spring Boot Integration Guide

Spring Boot is the dominant Java web framework, and most Spring Boot teams need browser-level integration tests at some point — to verify a multi-step form flow, validate that a server-rendered page renders correctly, or test JavaScript-driven features end to end. Pairing Spring Boot's testing infrastructure with Selenide gives you fast, expressive browser tests that share fixtures with your unit tests and reuse the application's own data access layer. The integration involves a few moving parts: \`@SpringBootTest\` with \`webEnvironment = RANDOM_PORT\`, Selenide configured to hit the local port, and a shared lifecycle that boots the app once per test class.

This guide is a comprehensive walkthrough of integrating Selenide with JUnit 5 and Spring Boot in 2026. We cover \`@SpringBootTest\` setup, \`@LocalServerPort\` injection, Selenide Configuration patterns, transactional test data, JUnit 5 parallel execution, Testcontainers integration for real databases, and CI/CD patterns. Every code sample is working Java with Selenide 7+, JUnit 5, Spring Boot 3, and JDK 21.

---

## Key Takeaways

- **@SpringBootTest(webEnvironment = RANDOM_PORT)** boots the app on a random port
- **@LocalServerPort** injects the port into the test class
- **Selenide.open()** can take a relative URL when \`Configuration.baseUrl\` is set
- **JUnit 5 SelenideExtension** handles browser lifecycle cleanly
- **Testcontainers integration** gives real database integration on top
- **Parallel execution** requires per-thread driver isolation (built into Selenide)

---

## Project Setup

Maven dependencies:

\`\`\`xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>com.codeborne</groupId>
    <artifactId>selenide</artifactId>
    <version>7.5.0</version>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>com.codeborne</groupId>
    <artifactId>selenide-junit5</artifactId>
    <version>7.5.0</version>
    <scope>test</scope>
  </dependency>
</dependencies>
\`\`\`

---

## Basic Test Structure

\`\`\`java
import com.codeborne.selenide.Configuration;
import com.codeborne.selenide.junit5.BrowserStrategyExtension;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Condition.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ExtendWith(BrowserStrategyExtension.class)
class LoginIntegrationTest {

    @LocalServerPort
    int port;

    @BeforeAll
    static void setupSelenide() {
        Configuration.browser = "chrome";
        Configuration.headless = true;
        Configuration.browserSize = "1920x1080";
    }

    @Test
    void userCanLogin() {
        open("http://localhost:" + port + "/login");
        $("#email").setValue("alice@example.com");
        $("#password").setValue("secret123");
        $("button[type=submit]").click();
        $("#dashboard").shouldBe(visible);
    }
}
\`\`\`

Spring boots the app on a random port; Selenide opens the browser and runs the test.

---

## Using Configuration.baseUrl

Setting \`baseUrl\` means you can use relative URLs:

\`\`\`java
@BeforeEach
void setBaseUrl() {
    Configuration.baseUrl = "http://localhost:" + port;
}

@Test
void usesRelativeUrls() {
    open("/login"); // resolves to http://localhost:8082/login
    $("#email").setValue("alice@example.com");
}
\`\`\`

---

## Database Setup with @Sql

\`\`\`java
import org.springframework.test.context.jdbc.Sql;

@Test
@Sql(scripts = "/test-data/users.sql")
void loginWithSeededUser() {
    open("/login");
    $("#email").setValue("seeded@example.com");
    $("#password").setValue("password");
    $("button[type=submit]").click();
    $("#dashboard").shouldBe(visible);
}
\`\`\`

\`/test-data/users.sql\`:

\`\`\`sql
INSERT INTO users (email, password_hash) VALUES
  ('seeded@example.com', '$2a$10$...');
\`\`\`

---

## @Transactional Behavior

By default, \`@SpringBootTest\` doesn't roll back changes. For test isolation, use @Transactional carefully — browser tests use real HTTP requests so transactions don't span the request boundary. Instead, manage test data explicitly:

\`\`\`java
@Autowired
private UserRepository userRepository;

@BeforeEach
void cleanUsers() {
    userRepository.deleteAll();
    userRepository.save(new User("alice@example.com", "hash"));
}
\`\`\`

---

## Testcontainers PostgreSQL Integration

For real-database tests, combine Selenide with Testcontainers:

\`\`\`java
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ExtendWith(BrowserStrategyExtension.class)
class FullStackTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @LocalServerPort int port;

    @BeforeAll
    static void setup() {
        Configuration.browser = "chrome";
        Configuration.headless = true;
    }

    @Test
    void worksEndToEnd() {
        open("http://localhost:" + port + "/users");
        $$(".user").shouldHave(sizeGreaterThan(0));
    }
}
\`\`\`

See our [Postgres Java Spring Boot guide](/blog/testcontainers-postgres-java-spring-boot-guide) for deeper integration patterns.

---

## SelenideExtension vs BrowserStrategyExtension

Selenide ships several JUnit 5 extensions:

| Extension | Purpose |
|---|---|
| \`BrowserStrategyExtension\` | Manages browser lifecycle per class |
| \`SoftAssertsExtension\` | Enables soft assertions |
| \`TextReportExtension\` | Generates plain text reports |
| \`ScreenShooterExtension\` | Screenshots on failure (also automatic) |

Apply via:

\`\`\`java
@ExtendWith({BrowserStrategyExtension.class, SoftAssertsExtension.class})
\`\`\`

---

## Parallel Execution

\`junit-platform.properties\`:

\`\`\`properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.mode.classes.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=4
\`\`\`

Selenide handles per-thread WebDriver isolation. Each test thread gets its own browser session.

For Selenium Grid, see our [parallel testing guide](/blog/selenide-grid-parallel-testing-guide).

---

## Mock External Services

Use Spring Boot's testing infrastructure for mocking:

\`\`\`java
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PaymentTest {

    @MockBean
    private StripeClient stripeClient;

    @Test
    void paymentSucceeds() {
        when(stripeClient.charge(any())).thenReturn(new ChargeResult("succeeded"));

        open("/checkout");
        // ... fill form, submit
        $(".success").shouldBe(visible);
    }
}
\`\`\`

---

## WireMock for External APIs

If your app calls external HTTP APIs, mock them with WireMock:

\`\`\`java
import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.AfterAll;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ExternalApiTest {

    static WireMockServer wireMock;

    @BeforeAll
    static void startMock() {
        wireMock = new WireMockServer(8089);
        wireMock.start();
    }

    @AfterAll
    static void stopMock() {
        wireMock.stop();
    }

    @Test
    void worksWithMockedApi() {
        wireMock.stubFor(get(urlEqualTo("/api/external"))
            .willReturn(okJson("[{\\"id\\":1,\\"name\\":\\"Test\\"}]")));

        open("/data");
        $(".item").shouldHave(text("Test"));
    }
}
\`\`\`

Configure the app under test to point at \`http://localhost:8089\` via test properties.

---

## CI/CD Configuration

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
          java-version: 21
      - uses: browser-actions/setup-chrome@v1
      - run: ./mvnw verify
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: screenshots
          path: build/reports/tests/
\`\`\`

---

## Allure Integration

For rich reports:

\`\`\`java
import com.codeborne.selenide.logevents.SelenideLogger;
import io.qameta.allure.selenide.AllureSelenide;

@BeforeAll
static void setupAllure() {
    SelenideLogger.addListener("allure", new AllureSelenide()
        .screenshots(true)
        .savePageSource(true)
        .includeSelenideSteps(true)
    );
}
\`\`\`

See our [AllureSelenide reference](/blog/selenide-allureselenide-includeselenidesteps-reference) for details.

---

## Common Pitfalls

**Pitfall 1: Port collisions.** Don't hardcode ports; use \`@LocalServerPort\`.

**Pitfall 2: Test data leaks.** Browser tests use HTTP requests, not Spring transactions. Clean data explicitly.

**Pitfall 3: Browser state between tests.** Use \`closeWebDriver()\` or rely on per-class lifecycle.

**Pitfall 4: Headless quirks.** Test in headed mode locally if headless behavior surprises you.

**Pitfall 5: Spring context startup time.** Each \`@SpringBootTest\` class restarts Spring. Use \`@ContextConfiguration\` to share contexts across classes.

---

## Conclusion

Selenide + JUnit 5 + Spring Boot is the modern Java integration testing stack for 2026. Combine with Testcontainers for real databases, AllureSelenide for rich reports, and Selenium Grid for parallel cross-browser coverage. The result is fast, reliable, end-to-end tests that share fixtures with your unit tests and validate the whole application stack.

For complementary patterns, see our [Postgres Java Spring Boot guide](/blog/testcontainers-postgres-java-spring-boot-guide) and [Selenide vs Selenium WebDriver 2026](/blog/selenide-vs-selenium-webdriver-2026).

Browse the [QA skills directory](/skills) for related Java testing patterns.
`,
};
