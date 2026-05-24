import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Spring Cloud Contract Testing Complete Guide 2026',
  description:
    'Provider-driven contract testing with Spring Cloud Contract. Groovy/YAML contracts, stub generation, REST and messaging support, and CI integration patterns.',
  date: '2026-05-02',
  category: 'API Testing',
  content: `
# Spring Cloud Contract Testing Complete Guide 2026

Spring Cloud Contract is the contract testing framework of choice for Spring Boot ecosystems. Unlike Pact (which is consumer-driven), Spring Cloud Contract follows a provider-driven model: the provider team writes contract definitions in Groovy or YAML, the framework auto-generates tests for the provider and stub mocks for consumers, and both sides validate their behavior against the shared contract. The result is the same goal as Pact - confidence that consumers and providers won't break each other - but with a workflow that fits naturally into Spring Boot projects.

This complete guide covers Spring Cloud Contract in 2026: project setup with Maven and Gradle, contract definition in Groovy DSL and YAML, generated test classes, stub publishing to repositories, consumer side stub usage, REST and messaging support, and CI integration. Real code examples show a full provider and consumer pair. By the end you'll know whether Spring Cloud Contract fits your team and how to roll it out across your Spring Boot microservices.

## Key Takeaways

- Spring Cloud Contract is provider-driven contract testing
- Contracts written in Groovy DSL or YAML
- Auto-generates provider tests and consumer stubs
- Stubs published to Maven repo or Stub Runner
- Supports REST and messaging (Kafka, RabbitMQ)
- Native Spring Boot integration
- Best for Java/Kotlin/Spring teams

---

## When To Use

| Scenario | Recommendation |
|----------|---------------|
| Pure Spring Boot stack | Spring Cloud Contract |
| Polyglot (Node + Java + Python) | Pact |
| Provider team drives contract | Spring Cloud Contract |
| Consumer team drives contract | Pact |
| Async/messaging required | Either (SCC has good messaging) |
| Bi-directional with OpenAPI | Pactflow |

## Provider Setup

\`\`\`xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-contract-verifier</artifactId>
  <scope>test</scope>
</dependency>

<plugin>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-contract-maven-plugin</artifactId>
  <version>4.1.0</version>
  <extensions>true</extensions>
  <configuration>
    <baseClassForTests>com.example.ContractBase</baseClassForTests>
  </configuration>
</plugin>
\`\`\`

## Writing A Contract (Groovy)

\`\`\`groovy
// src/test/resources/contracts/users/getUser.groovy
package contracts.users

import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should return user 42"
    request {
        method 'GET'
        url '/users/42'
        headers {
            accept(applicationJson())
        }
    }
    response {
        status 200
        headers {
            contentType(applicationJson())
        }
        body([
            id: 42,
            name: "Alice",
            email: "alice@example.com"
        ])
    }
}
\`\`\`

## Writing A Contract (YAML)

\`\`\`yaml
# src/test/resources/contracts/users/getUser.yml
description: should return user 42
request:
  method: GET
  url: /users/42
  headers:
    Accept: application/json
response:
  status: 200
  headers:
    Content-Type: application/json
  body:
    id: 42
    name: Alice
    email: alice@example.com
\`\`\`

## Base Test Class

\`\`\`java
// src/test/java/com/example/ContractBase.java
package com.example;

import io.restassured.module.mockmvc.RestAssuredMockMvc;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@SpringBootTest
public abstract class ContractBase {
    @Autowired
    private UserController userController;

    @BeforeEach
    void setup() {
        RestAssuredMockMvc.standaloneSetup(userController);
    }
}
\`\`\`

The Maven/Gradle plugin generates tests that extend this class. Generated test for the getUser contract:

\`\`\`java
public class UsersTest extends ContractBase {
    @Test
    public void validate_getUser() {
        given()
            .header("Accept", "application/json")
        .when()
            .get("/users/42")
        .then()
            .status(200)
            .body("id", equalTo(42))
            .body("name", equalTo("Alice"));
    }
}
\`\`\`

## Publishing Stubs

The plugin packages stubs as a separate JAR with classifier "stubs":

\`\`\`bash
mvn install
\`\`\`

This produces user-service-1.0.0.jar and user-service-1.0.0-stubs.jar.

\`\`\`bash
mvn deploy
\`\`\`

Pushes both to your Maven repository (Nexus, Artifactory, GitHub Packages, etc.).

## Consumer Side: Stub Runner

\`\`\`xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-contract-stub-runner</artifactId>
  <scope>test</scope>
</dependency>
\`\`\`

\`\`\`java
@SpringBootTest
@AutoConfigureStubRunner(
    ids = "com.example:user-service:1.0.0:stubs:8080",
    stubsMode = StubRunnerProperties.StubsMode.LOCAL
)
public class UserClientTest {
    @Test
    void getsUserFromStub() {
        UserClient client = new UserClient("http://localhost:8080");
        User user = client.getUser(42);
        assertEquals("Alice", user.getName());
    }
}
\`\`\`

The stub runner downloads the stubs JAR and starts WireMock servers running them.

## Multiple Stub Servers

\`\`\`java
@AutoConfigureStubRunner(
    ids = {
        "com.example:user-service:1.0.0:stubs:8080",
        "com.example:order-service:1.0.0:stubs:8081"
    },
    stubsMode = StubsMode.REMOTE,
    repositoryRoot = "https://nexus.example.com/repositories/snapshots"
)
\`\`\`

## Messaging Contracts

For Kafka/RabbitMQ:

\`\`\`groovy
Contract.make {
    description "should produce order created event"
    label "order_created"
    input {
        triggeredBy("createOrder()")
    }
    outputMessage {
        sentTo "order-events"
        body([
            order_id: 42,
            status: "created"
        ])
        headers {
            messagingContentType(applicationJson())
        }
    }
}
\`\`\`

Consumer side verifies the consumed message format matches.

## Stub Versioning

\`\`\`java
@AutoConfigureStubRunner(
    ids = "com.example:user-service:+:stubs:8080"  // latest
)
\`\`\`

Or pin to a specific version. Always pin in production CI for stability.

## Provider Verification Workflow

1. Provider team writes contract.groovy
2. Plugin auto-generates ProviderTest.java
3. Provider implements code to make ProviderTest pass
4. mvn install produces stubs JAR
5. mvn deploy publishes to artifact repo

## Consumer Verification Workflow

1. Consumer team adds stub-runner dependency
2. Test class declares @AutoConfigureStubRunner with provider coordinates
3. Tests run consumer code against the stub
4. If provider changes contract incompatibly, consumer tests fail in CI

## CI Pipeline

\`\`\`yaml
name: Contract Tests
on: [push, pull_request]
jobs:
  provider:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - run: mvn test
      - run: mvn deploy -DskipTests
        if: github.ref == 'refs/heads/main'
        env:
          MAVEN_USERNAME: \${{ secrets.MAVEN_USERNAME }}
          MAVEN_PASSWORD: \${{ secrets.MAVEN_PASSWORD }}

  consumer:
    runs-on: ubuntu-latest
    needs: provider
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
      - run: mvn test
\`\`\`

## Spring Cloud Contract vs Pact

| Aspect | Spring Cloud Contract | Pact |
|--------|----------------------|------|
| Direction | Provider-driven | Consumer-driven |
| Languages | JVM-centric | Polyglot |
| Stub storage | Maven repo | Pact Broker |
| Spring integration | Native | Manual |
| Messaging support | Built-in | Pact Async |
| Contract format | Groovy/YAML | JSON |
| Learning curve | Higher (Groovy DSL) | Lower |

## Multi Module Project

\`\`\`
parent/
  user-service/
    src/test/resources/contracts/
    pom.xml
  order-service/
    src/test/resources/contracts/
    pom.xml
  webapp/
    pom.xml  (consumer of both)
\`\`\`

The parent pom defines the contract plugin and stub-runner versions for consistency.

## Real Suite Example

A SaaS application with three services:

| Service | Role | Contracts |
|---------|------|-----------|
| user-service | Provider | /users CRUD |
| order-service | Provider | /orders CRUD |
| webapp | Consumer | Uses both providers |

\`\`\`groovy
// user-service/src/test/resources/contracts/users/postUser.groovy
Contract.make {
    description "create user returns 201"
    request {
        method 'POST'
        url '/users'
        headers { contentType(applicationJson()) }
        body([
            name: "Alice",
            email: "alice@example.com"
        ])
    }
    response {
        status 201
        body([
            id: 42,
            name: "Alice",
            email: "alice@example.com"
        ])
    }
}
\`\`\`

Consumer side in webapp:

\`\`\`java
@SpringBootTest
@AutoConfigureStubRunner(
    ids = "com.example:user-service:+:stubs:8080",
    stubsMode = StubsMode.REMOTE
)
public class WebappTest {
    @Autowired
    private UserClient userClient;

    @Test
    void createsUserViaProviderStub() {
        User user = userClient.create("Alice", "alice@example.com");
        assertEquals(42, user.getId());
        assertEquals("Alice", user.getName());
    }
}
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Contracts that mirror full DB schema | Test API contract only |
| Logic inside contracts | Use base test class |
| Pinning stubs to latest | Pin to specific version in CI |
| Skipping deploy step | mvn deploy on main |
| Mixing contract testing with unit tests | Separate modules |

## Maintenance

Over time, contracts accumulate. Periodically:

- Review old contracts and remove unused ones
- Update contract format if the DSL changes
- Ensure base test classes are up to date
- Watch for stub-runner version mismatches

## When To Choose Spring Cloud Contract

- All-JVM stack (Java, Kotlin, Groovy)
- Heavy Spring Boot usage
- Provider team owns the contract definition
- Need rich messaging contract support
- Already using Maven/Gradle for artifact management

## When To Choose Pact

- Polyglot services
- Consumer-driven workflow preferred
- Hosted broker (Pactflow) over Maven repo

## Conclusion

Spring Cloud Contract is the natural choice for Spring Boot teams that want contract testing without leaving the JVM ecosystem. The Groovy/YAML contract DSL, auto-generated tests, and stub publishing flow integrate cleanly with existing Maven/Gradle workflows. While Pact is more flexible for polyglot teams, Spring Cloud Contract removes friction for the all-Java case.

Start by adding the plugin to one provider service and writing a contract for one endpoint. Generate and run the provider test. Publish the stubs JAR. Add stub-runner to one consumer service and write a test against the stubs. Once that cycle works, expand to your other services. Visit our [skills directory](/skills) or the [Pact contract testing guide](/blog/pact-contract-testing-complete-guide-2026) for an alternative approach.
`,
};
