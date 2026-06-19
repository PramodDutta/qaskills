import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Spring Cloud Contract Testing: The Complete JVM Guide (2026)',
  description:
    'Master Spring Cloud Contract testing: write Groovy/YAML contracts, generate producer tests, publish stubs, run @AutoConfigureStubRunner, message contracts, and Pact compared.',
  date: '2026-06-19',
  category: 'Guide',
  content: `
# Spring Cloud Contract Testing: The Complete JVM Guide

Spring Cloud Contract is the JVM-native answer to contract testing. If your services are Spring Boot applications, it lets you describe the agreement between a producer (the API) and its consumers as a contract written in Groovy or YAML, then it does something genuinely powerful: it generates the producer's verification tests for you and packages a runnable stub server that consumers can boot against. You write the contract once; the framework writes the tests and the mocks. That tight integration with the Spring ecosystem — auto-configuration, the test slices, the Maven and Gradle plugins, and stub publishing to your existing artifact repository — is exactly why teams already invested in Spring reach for **Spring Cloud Contract testing** instead of bolting on a separate tool.

This guide is a complete, runnable walkthrough. You will write a Groovy contract DSL file, configure the Maven plugin with a base test class, watch it generate producer tests, publish stubs to a repository, consume those stubs on the client side with \`@AutoConfigureStubRunner\`, handle messaging contracts for asynchronous flows, and understand precisely how Spring Cloud Contract differs from Pact's consumer-driven model. By the end you will know when to use the producer-driven JVM approach and when a polyglot, consumer-driven tool like Pact fits better. If you want the broader theory first, read our [contract testing fundamentals guide](/blog/contract-testing-pact-complete-guide), then return here for the Spring-specific mechanics.

## Producer-Driven vs Consumer-Driven: Where Spring Cloud Contract Sits

Contract testing comes in two philosophies, and Spring Cloud Contract leans toward one of them. In the **consumer-driven** model that Pact popularized, the consumer writes its expectations first, those expectations become the contract, and the producer must satisfy them. In Spring Cloud Contract's default **producer-driven** model, the producer (or the producer and consumer collaborating) owns the contract; the producer's repository holds the contract files, generates verification tests from them, and publishes stubs that consumers download.

This producer-centric default is not a limitation — it is a deliberate fit for teams where API owners want a single source of truth living next to the implementation. You can still collaborate: a common pattern is consumers opening pull requests against the producer's contract directory. The key insight is that the contract lives with the producer, the producer is always verified against it in its own build, and consumers get a guaranteed-accurate stub. That eliminates the drift where a hand-written mock slowly diverges from the real API.

## Anatomy of a Groovy Contract

Contracts live under \`src/test/resources/contracts\` in the producer module. The Groovy DSL is the most expressive format. Here is a contract for a producer that returns a beer order's status:

\`\`\`groovy
// src/test/resources/contracts/shouldReturnOrderStatus.groovy
package contracts

import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should return the status for an existing order"
    request {
        method GET()
        url '/orders/42/status'
        headers {
            accept(applicationJson())
        }
    }
    response {
        status OK()
        headers {
            contentType(applicationJson())
        }
        body(
            orderId: 42,
            status: "ACCEPTED",
            total: 199.99
        )
        bodyMatchers {
            jsonPath('\$.orderId', byEquality())
            jsonPath('\$.status', byRegex('ACCEPTED|REJECTED|PENDING'))
            jsonPath('\$.total', byType())
        }
    }
}
\`\`\`

The \`bodyMatchers\` block is the part that makes contracts robust. Instead of asserting on exact literal values everywhere, you specify how each field should be matched: \`byEquality()\` pins the exact value, \`byRegex(...)\` constrains a string to a pattern, and \`byType()\` checks only that the type matches (any number for \`total\`). On the stub side, these matchers also drive what the generated stub returns, so the contract is simultaneously the producer test specification and the consumer mock definition.

The same contract can be written in YAML if you prefer declarative files, which many teams find easier to review:

\`\`\`yaml
# src/test/resources/contracts/shouldReturnOrderStatus.yml
description: should return the status for an existing order
request:
  method: GET
  url: /orders/42/status
  headers:
    Accept: application/json
response:
  status: 200
  headers:
    Content-Type: application/json
  body:
    orderId: 42
    status: ACCEPTED
    total: 199.99
  matchers:
    body:
      - path: \$.orderId
        type: by_equality
      - path: \$.status
        type: by_regex
        value: 'ACCEPTED|REJECTED|PENDING'
      - path: \$.total
        type: by_type
\`\`\`

## Contract DSL Field Reference

| DSL element | Section | Purpose |
|---|---|---|
| \`method\` | request | HTTP verb (\`GET()\`, \`POST()\`, etc.) |
| \`url\` / \`urlPath\` | request | Path; \`urlPath\` supports query params |
| \`headers\` | request/response | Header assertions and stub values |
| \`body\` | request/response | Payload definition |
| \`status\` | response | HTTP status (\`OK()\`, \`CREATED()\`...) |
| \`bodyMatchers\` | response | Per-field matching strategy |
| \`byEquality()\` | matcher | Exact value match |
| \`byRegex(...)\` | matcher | Pattern match for strings |
| \`byType()\` | matcher | Type-only match (value irrelevant) |
| \`priority\` | contract | Ordering when multiple contracts overlap |

## Configuring the Maven Plugin

The producer build needs the Spring Cloud Contract verifier plugin. It reads your contract files, generates JUnit tests from them, and packages stubs into a \`-stubs.jar\` artifact during \`mvn install\`. Here is the relevant \`pom.xml\` configuration:

\`\`\`xml
<build>
  <plugins>
    <plugin>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-contract-maven-plugin</artifactId>
      <version>4.1.4</version>
      <extensions>true</extensions>
      <configuration>
        <!-- The base class the generated tests will extend -->
        <baseClassForTests>com.acme.orders.contract.OrderBase</baseClassForTests>
        <testFramework>JUNIT5</testFramework>
        <!-- Optional: package contracts/stubs under a classifier -->
        <contractsDirectory>\${project.basedir}/src/test/resources/contracts</contractsDirectory>
      </configuration>
    </plugin>
  </plugins>
</build>

<dependencies>
  <dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-contract-verifier</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
\`\`\`

The Gradle equivalent applies the \`spring-cloud-contract\` plugin and sets \`contracts { testFramework.set('JUNIT5'); baseClassForTests = 'com.acme.orders.contract.OrderBase' }\`. Both produce the same outputs: generated tests under \`target/generated-test-sources\` and a stubs jar attached to the build.

## The Base Test Class

Generated producer tests do not know how to stand up your application — that is your job, and you do it once in a base class that every generated test extends. The base class sets up the system under test, typically with RestAssured's \`MockMvc\` standalone setup or by pointing at a running context, and prepares any test state (stubbed service beans, seeded data).

\`\`\`java
package com.acme.orders.contract;

import io.restassured.module.mockmvc.RestAssuredMockMvc;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mockito;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
public abstract class OrderBase {

    @Autowired
    private OrderController orderController;

    @MockBean
    private OrderRepository orderRepository;

    @BeforeEach
    void setup() {
        // Seed the state the contract assumes: order 42 exists and is ACCEPTED
        Order order = new Order(42L, "ACCEPTED", new BigDecimal("199.99"));
        Mockito.when(orderRepository.findById(42L))
               .thenReturn(java.util.Optional.of(order));

        RestAssuredMockMvc.standaloneSetup(orderController);
    }
}
\`\`\`

When the plugin runs, it generates a test that issues \`GET /orders/42/status\` against this setup and asserts the response matches the contract. If your controller stops returning \`status\`, or changes the JSON shape, the generated producer test fails in the producer's own build — before any stub is ever published. That is the producer-driven safety net.

## Publishing Stubs to a Repository

Running \`mvn install\` produces \`orders-service-1.0.0-stubs.jar\` and installs it to your local Maven repository. To share stubs with consumers in other repositories or CI jobs, deploy them to a remote artifact repository (Nexus, Artifactory, or a Maven-compatible registry) exactly like any other artifact:

\`\`\`bash
# Build, run generated contract tests, and install the stubs jar locally
mvn clean install

# Deploy the stubs jar (and main artifacts) to a shared repository
mvn deploy -DskipTests

# The stub artifact coordinates consumers will reference:
#   com.acme:orders-service:1.0.0:stubs
\`\`\`

Spring Cloud Contract also supports a \`stubs-per-consumer\` mode and a Pact-broker-backed stub source, but the artifact-repository workflow is the default and integrates seamlessly with existing JVM build infrastructure.

## Consuming Stubs with @AutoConfigureStubRunner

This is where the magic pays off for the consumer. Instead of hand-writing a WireMock stub or a mock RestTemplate, the consumer's test downloads the producer's published stub jar and boots a real HTTP stub server that behaves exactly as the contract specifies. You annotate a test with \`@AutoConfigureStubRunner\`:

\`\`\`java
package com.acme.checkout;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.contract.stubrunner.spring.AutoConfigureStubRunner;
import org.springframework.cloud.contract.stubrunner.spring.StubRunnerProperties;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureStubRunner(
    ids = "com.acme:orders-service:+:stubs:8090",
    stubsMode = StubRunnerProperties.StubsMode.REMOTE,
    repositoryRoot = "https://nexus.acme.internal/repository/maven-public"
)
class OrderClientContractTest {

    @Autowired
    private RestTemplate restTemplate;

    @Test
    void fetchesOrderStatusFromStub() {
        // The stub server is live on port 8090, serving the contract's response
        OrderStatus status = restTemplate.getForObject(
            "http://localhost:8090/orders/42/status", OrderStatus.class);

        assertThat(status.getOrderId()).isEqualTo(42L);
        assertThat(status.getStatus()).isEqualTo("ACCEPTED");
        assertThat(status.getTotal()).isEqualByComparingTo("199.99");
    }
}
\`\`\`

The \`ids\` attribute follows \`groupId:artifactId:version:classifier:port\`. The \`+\` means "latest version." \`stubsMode\` of \`REMOTE\` pulls from \`repositoryRoot\`; \`LOCAL\` uses your local Maven cache; \`CLASSPATH\` resolves stubs already on the test classpath. Because the stub is generated from the same contract the producer is verified against, the consumer is testing against an accurate mirror of the real API — there is no possibility of a hand-written mock silently drifting.

## Messaging Contracts for Async Flows

Contract testing is not just for HTTP. Spring Cloud Contract supports messaging contracts for systems built on Spring Cloud Stream, Kafka, RabbitMQ, or Spring Integration. A messaging contract describes a message that the producer emits in response to some trigger:

\`\`\`groovy
// src/test/resources/contracts/messaging/shouldEmitOrderAccepted.groovy
package contracts.messaging

import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should emit an order-accepted event"
    label 'order_accepted'
    input {
        // A method on the base class triggers the producer to send the message
        triggeredBy('acceptOrder()')
    }
    outputMessage {
        sentTo 'orders.events'
        body(
            orderId: 42,
            status: "ACCEPTED"
        )
        headers {
            header('contentType', 'application/json')
        }
    }
}
\`\`\`

On the producer side, the generated test invokes \`acceptOrder()\` and asserts the right message lands on \`orders.events\`. On the consumer side, \`StubTrigger\` lets a test fire the labeled message (\`order_accepted\`) into the consumer's listener so you can verify it handles the event correctly — all without a live broker. This extends the same single-source-of-truth guarantee to your event-driven integrations.

## Spring Cloud Contract vs Pact

Both tools deliver contract testing, but they make different trade-offs. The honest summary: Spring Cloud Contract is the better fit for all-JVM, Spring-heavy estates that prefer producer-driven contracts; Pact wins for polyglot organizations that need consumer-driven contracts across many languages with a central broker and \`can-i-deploy\` gating.

| Dimension | Spring Cloud Contract | Pact |
|---|---|---|
| Primary direction | Producer-driven (default) | Consumer-driven |
| Language support | JVM-centric (best on Spring) | Polyglot (JS, Java, Go, .NET, Python, Ruby...) |
| Contract format | Groovy DSL or YAML | Generated JSON from consumer tests |
| Producer tests | Auto-generated from contracts | Hand-written verification against pacts |
| Consumer mocking | Generated stub server (WireMock-based) | Mock server inside consumer test |
| Stub distribution | Maven/Gradle artifact (\`-stubs.jar\`) | Pact files via the Pact Broker |
| Messaging support | Strong (Spring Cloud Stream, Kafka, etc.) | Supported, less seamless |
| Deployment gating | Via your CI + artifact versioning | First-class \`can-i-deploy\` via broker |
| Best for | Spring Boot microservices, one language | Cross-language ecosystems, API consumers driving |

A practical heuristic: if every service is Spring Boot and the API owners want the contract to live with the producer, Spring Cloud Contract removes the most boilerplate. If you have JavaScript front-ends, Go services, and .NET clients all consuming the same APIs and you want consumers to drive expectations with central deployment gating, Pact's broker model and its [bi-directional contract testing capabilities](/blog/bidirectional-contract-testing-pact-2026) are hard to beat. Some large organizations even run both, bridging via Spring Cloud Contract's ability to consume stubs from a Pact Broker.

## Wiring It Into CI

The producer pipeline runs \`mvn clean install\` (which executes the generated contract tests as part of the build) and then \`mvn deploy\` to publish stubs:

\`\`\`bash
# Producer CI
mvn -B clean install          # generates + runs contract verification tests
mvn -B deploy -DskipTests     # publishes versioned stubs jar to the registry
\`\`\`

The consumer pipeline simply runs its tests; \`@AutoConfigureStubRunner\` pulls the right stub version at test time:

\`\`\`bash
# Consumer CI
mvn -B test   # StubRunner downloads orders-service stubs and runs against them
\`\`\`

Pin stub versions deliberately in CI (avoid \`+\` for release builds) so a producer change cannot silently alter consumer test behavior without an explicit version bump and review.

## Dynamic Values and Request Matching

Real APIs rarely deal in fixed literals. A contract that hardcodes \`order 42\` everywhere becomes brittle and fails to describe the general shape of the API. Spring Cloud Contract solves this with matchers on the request side too, so the generated stub responds to a family of requests rather than one exact path, and the generated producer test sends realistic varied input.

Consider a contract for creating an order where the producer echoes back a server-generated id and timestamp the consumer cannot predict:

\`\`\`groovy
// src/test/resources/contracts/shouldCreateOrder.groovy
package contracts

import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should create an order and return a generated id"
    request {
        method POST()
        url '/orders'
        headers { contentType(applicationJson()) }
        body(
            sku: "ABC-1",
            qty: 2
        )
        bodyMatchers {
            jsonPath('\$.sku', byRegex('[A-Z]{3}-[0-9]+'))
            jsonPath('\$.qty', byType())
        }
    }
    response {
        status CREATED()
        headers { contentType(applicationJson()) }
        body(
            orderId: \$(producer(regex('[0-9]+')), consumer(99)),
            createdAt: \$(producer(anyIso8601WithOffset()), consumer('2026-06-19T10:00:00Z')),
            status: "PENDING"
        )
    }
}
\`\`\`

The \`\$(producer(...), consumer(...))\` construct is central. On the producer test, the value is matched with the producer-side rule (a regex or built-in matcher), so the test accepts whatever realistic id the server generates. On the consumer stub, the fixed consumer value is returned, so the consumer's assertions are deterministic. This dual-value DSL lets a single contract serve both roles correctly — flexible verification for the producer, predictable mocking for the consumer.

## Versioning Stubs and Avoiding Drift in CI

The biggest operational mistake teams make with Spring Cloud Contract is sloppy stub versioning. The \`+\` wildcard in \`@AutoConfigureStubRunner\` is convenient locally but dangerous in release pipelines: it means "whatever the newest published stub is," so a producer publishing a breaking change can silently alter a consumer's test behavior without the consumer changing a line of code.

For release builds, pin the stub version explicitly to the producer version your consumer is actually integrating with, and bump it through a reviewed pull request:

\`\`\`java
@AutoConfigureStubRunner(
    ids = "com.acme:orders-service:1.4.2:stubs:8090",
    stubsMode = StubRunnerProperties.StubsMode.REMOTE,
    repositoryRoot = "https://nexus.acme.internal/repository/maven-public"
)
\`\`\`

This makes the integration contract explicit in version control and turns any producer change into a deliberate, reviewable consumer update. Use \`+\` only in exploratory or nightly jobs whose purpose is precisely to catch the latest producer changes early. Pair pinned versions with semantic versioning discipline on the producer: breaking contract changes get a major bump, additive changes a minor one, so consumers can reason about upgrade risk from the version number alone.

## Frequently Asked Questions

### What is Spring Cloud Contract testing?

Spring Cloud Contract is a JVM-native contract testing framework for Spring Boot services. You describe the agreement between a producer API and its consumers as a Groovy or YAML contract. The framework auto-generates the producer's verification tests from that contract and packages a runnable stub server that consumers boot against, keeping mocks accurate and in sync with the real API.

### Is Spring Cloud Contract producer-driven or consumer-driven?

It is producer-driven by default — the contract lives in the producer's repository, the producer generates verification tests from it, and consumers download published stubs. You can still collaborate by having consumers propose contract changes via pull requests, but the source of truth sits with the producer, unlike Pact's consumer-driven model where consumers author expectations first.

### How does @AutoConfigureStubRunner work?

\`@AutoConfigureStubRunner\` downloads a producer's published stubs jar and starts a real HTTP (or messaging) stub server that behaves exactly as the contract specifies. You give it \`ids\` in the form \`group:artifact:version:stubs:port\` and a \`stubsMode\` (LOCAL, REMOTE, or CLASSPATH). Your consumer tests then call the live stub server instead of a hand-written mock.

### Can Spring Cloud Contract test messaging and Kafka?

Yes. Messaging contracts describe a message the producer emits in response to a trigger, with \`input\` (the triggering action) and \`outputMessage\` (destination, body, headers). It integrates with Spring Cloud Stream, Kafka, RabbitMQ, and Spring Integration. The producer test verifies the message is sent; the consumer uses \`StubTrigger\` to fire labeled messages into its listeners without a live broker.

### What is the base class for in Spring Cloud Contract?

The base class stands up the system under test for the auto-generated producer tests. You configure it once — usually with RestAssured \`MockMvc\` standalone setup plus any mocked beans and seeded state the contracts assume. Every generated test extends it via the plugin's \`baseClassForTests\` setting, so the framework knows how to invoke your controllers.

### Should I write contracts in Groovy or YAML?

Both produce identical results, so it is a team preference. The Groovy DSL is more expressive and supports richer dynamic matching and programmatic constructs. YAML is declarative and often easier for non-Groovy developers to review in pull requests. Many teams standardize on YAML for readability and switch to Groovy only when they need advanced matchers or logic.

### How do I publish stubs to other teams?

Run \`mvn install\` to build the \`-stubs.jar\`, then \`mvn deploy\` to push it to a shared Maven repository like Nexus or Artifactory. Consumers reference the artifact coordinates (\`group:artifact:version:stubs\`) in \`@AutoConfigureStubRunner\` with \`stubsMode = REMOTE\` and a \`repositoryRoot\` pointing at that registry. Stubs are versioned like any other artifact.

### When should I use Pact instead of Spring Cloud Contract?

Choose Pact when your ecosystem is polyglot — JavaScript, Go, .NET, Python consumers alongside Java — and you want consumer-driven contracts with central deployment gating via a Pact Broker and \`can-i-deploy\`. Spring Cloud Contract is the better fit when every service is Spring Boot and API owners prefer the contract to live with the producer, minimizing boilerplate through generated tests and stubs.

## Conclusion

Spring Cloud Contract turns the agreement between Spring Boot services into a single source of truth that the framework enforces in both directions. You write a Groovy or YAML contract, the Maven or Gradle plugin generates the producer's verification tests against your base class, \`mvn install\` packages a stub jar, and consumers run real integration tests against that stub through \`@AutoConfigureStubRunner\` — with full support for messaging flows. Because the producer test and the consumer stub come from the same contract, mocks can never silently drift from reality. For all-JVM, Spring-heavy systems that favor producer-driven contracts, it is the lowest-friction path to safe service evolution; for polyglot, consumer-driven estates, Pact remains the stronger choice.

Want ready-to-use contract testing skills for your AI coding agent? Browse the curated [QA skills directory](/skills) for installable Spring Cloud Contract, Pact, and CI integration skills, and deepen your foundations with our companion guides on contract testing and the Pact Broker.
`,
};
