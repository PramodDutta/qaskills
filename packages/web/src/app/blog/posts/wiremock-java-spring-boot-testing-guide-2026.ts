import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "WireMock Java & Spring Boot Testing Guide (2026)",
  description: "WireMock for Java and Spring Boot: stub HTTP APIs, the JUnit 5 extension, request matching, response templating, verification, and integration test setup.",
  date: "2026-06-15",
  category: "Java",
  content: `# WireMock Java & Spring Boot Testing Guide

WireMock is a library that runs a real HTTP server you fully control, so you can stub the third-party and downstream APIs your Java application calls. Instead of hitting a live payment provider or partner service in your tests, you point your client at a local WireMock server, tell it which requests to expect and which responses to return, and then verify your code sent the right calls. In 2026 the idiomatic setup uses the WireMock **JUnit 5 extension** (\`@WireMockTest\`), which starts a server before your test and tears it down after, and pairs cleanly with Spring Boot by overriding the downstream base URL to the mock's port. WireMock supports rich request matching, stateful scenarios, response templating, fault injection, and request verification.

This guide covers installation, the JUnit 5 extension, stubbing and request matching, response templating, verification, fault simulation, and wiring WireMock into a Spring Boot integration test. For installable, agent-ready testing skills, see the [QASkills directory](/skills).

## Installing WireMock

WireMock ships as a single dependency. The standalone JUnit 5 jar bundles everything you need for tests. With Maven:

\`\`\`xml
<dependency>
  <groupId>org.wiremock</groupId>
  <artifactId>wiremock-standalone</artifactId>
  <version>3.10.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

With Gradle:

\`\`\`groovy
testImplementation 'org.wiremock:wiremock-standalone:3.10.0'
\`\`\`

The \`wiremock-standalone\` artifact includes the JUnit 5 extension and a shaded set of dependencies, which avoids version clashes with your app's own Jetty/Jackson. WireMock 3.x requires Java 11+. Static imports from \`com.github.tomakehurst.wiremock.client.WireMock\` give you the stubbing DSL (\`stubFor\`, \`get\`, \`post\`, \`aResponse\`, \`urlEqualTo\`, etc.).

## The JUnit 5 extension

The cleanest way to run WireMock in tests is the declarative \`@WireMockTest\` annotation. It starts a server on a random free port before each test class (or method) and injects the runtime info so you know the port.

\`\`\`java
import com.github.tomakehurst.wiremock.junit5.WireMockTest;
import com.github.tomakehurst.wiremock.junit5.WireMockRuntimeInfo;
import org.junit.jupiter.api.Test;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@WireMockTest
class WeatherClientTest {

    @Test
    void fetchesTemperature(WireMockRuntimeInfo wm) {
        // Arrange: stub the downstream API
        stubFor(get(urlEqualTo("/v1/weather?city=London"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\\"tempC\\": 14}")));

        // Act: point the client at the mock's base URL
        var client = new WeatherClient(wm.getHttpBaseUrl());
        int temp = client.tempFor("London");

        // Assert
        assertThat(temp).isEqualTo(14);
    }
}
\`\`\`

\`WireMockRuntimeInfo\` is injected into the test method and gives you \`getHttpBaseUrl()\` (e.g. \`http://localhost:53412\`) and \`getPort()\`. Because the port is random, tests do not collide when run in parallel. You can pin a fixed port with \`@WireMockTest(httpPort = 8089)\` when something external must reach a known address. Each stub you register with \`stubFor(...)\` lives only for the test's lifecycle; the extension resets the server between tests.

For programmatic control instead of the annotation, construct a \`WireMockServer\` yourself in \`@BeforeEach\`/\`@AfterEach\` and call \`server.start()\` / \`server.stop()\` — useful when you need custom options like HTTPS or extensions.

## Stubbing and request matching

A stub is a mapping: "when a request matches this, return this response." The matching DSL is expressive — you can match on URL, method, headers, query parameters, and body.

\`\`\`java
// Exact URL path, with header and JSON body matchers
stubFor(post(urlPathEqualTo("/v1/orders"))
    .withHeader("Authorization", containing("Bearer "))
    .withRequestBody(matchingJsonPath("$.sku", equalTo("SKU-1")))
    .willReturn(aResponse()
        .withStatus(201)
        .withHeader("Content-Type", "application/json")
        .withBody("{\\"id\\":\\"ord_1\\",\\"status\\":\\"PAID\\"}")));

// URL pattern with a regex
stubFor(get(urlPathMatching("/v1/users/[0-9]+"))
    .willReturn(okJson("{\\"name\\":\\"Ada\\"}")));

// Priority: a specific stub wins over a catch-all
stubFor(any(anyUrl()).atPriority(10)
    .willReturn(aResponse().withStatus(404)));
\`\`\`

Key matchers: \`urlEqualTo\` (path + query exact), \`urlPathEqualTo\` (path only), \`urlPathMatching\` (regex), \`matchingJsonPath\`, \`equalToJson\` (ignores formatting/order), \`matchingXPath\`, and header/query matchers like \`equalTo\`, \`containing\`, \`matching\`. Lower \`atPriority\` numbers win, so register a low-priority catch-all 404 and higher-priority specific stubs to model realistic behavior.

WireMock also supports **stateful scenarios** for sequences (e.g. first call returns "pending," second returns "complete") via \`inScenario(...).whenScenarioStateIs(STARTED).willSetStateTo("done")\` — useful for testing retry and polling logic.

## Response templating

When you want the response to echo something from the request (an id in the path, a field in the body), enable response templating so you do not hard-code a separate stub per value.

\`\`\`java
stubFor(get(urlPathMatching("/v1/users/[0-9]+"))
    .willReturn(aResponse()
        .withHeader("Content-Type", "application/json")
        .withTransformers("response-template")
        .withBody("{\\"id\\": {{request.pathSegments.[2]}}, \\"name\\": \\"User\\"}")));
\`\`\`

The \`{{request.pathSegments.[2]}}\` Handlebars expression pulls the id from the URL so \`/v1/users/42\` returns \`{"id": 42, ...}\`. Templating exposes \`request.body\`, \`request.query\`, \`request.headers\`, and helpers for dates and randoms. Enable the \`response-template\` transformer globally via server options, or per stub as shown. Use it sparingly — overly dynamic stubs become hard to read; prefer explicit stubs for the cases that matter and templating only where the response genuinely mirrors input.

## Verifying requests

Stubbing controls what WireMock returns; verification asserts what your code sent. After acting, use \`verify(...)\` with the same matcher DSL.

\`\`\`java
verify(postRequestedFor(urlPathEqualTo("/v1/orders"))
    .withHeader("Authorization", containing("Bearer "))
    .withRequestBody(matchingJsonPath("$.sku", equalTo("SKU-1"))));

// Exact call count
verify(exactly(1), getRequestedFor(urlPathEqualTo("/v1/weather")));

// Negative assertion
verify(0, postRequestedFor(urlPathEqualTo("/v1/refunds")));
\`\`\`

\`verify\` confirms the request reached the mock with the expected method, URL, headers, and body. Pass \`exactly(n)\`, \`lessThan(n)\`, \`moreThanOrExactly(n)\` to assert cardinality, and \`verify(0, ...)\` to assert a call never happened — invaluable for testing that an error path skips a side-effecting call.

## Simulating faults and delays

Real APIs are slow and flaky; WireMock lets you reproduce that to test resilience.

\`\`\`java
// Fixed latency to test timeouts
stubFor(get(urlEqualTo("/slow"))
    .willReturn(aResponse().withStatus(200).withFixedDelay(3000)));

// Connection-level fault to test retry/circuit-breaker logic
stubFor(get(urlEqualTo("/flaky"))
    .willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));

// HTTP error to test error handling
stubFor(get(urlEqualTo("/boom"))
    .willReturn(aResponse().withStatus(503)));
\`\`\`

\`withFixedDelay\` and \`withUniformRandomDelay\` exercise client timeout configuration; \`withFault\` simulates connection resets, empty responses, and garbage, letting you verify that retries, circuit breakers, and fallbacks behave correctly under failure.

## Wiring WireMock into a Spring Boot test

In a Spring Boot integration test the trick is to override the property that holds the downstream base URL so your real client beans talk to WireMock instead of the live service. Combine \`@SpringBootTest\` with the WireMock extension and \`@DynamicPropertySource\`.

\`\`\`java
import com.github.tomakehurst.wiremock.junit5.WireMockTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.beans.factory.annotation.Autowired;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@WireMockTest(httpPort = 8089)
class WeatherServiceIntegrationTest {

    @DynamicPropertySource
    static void overrideDownstream(DynamicPropertyRegistry registry) {
        registry.add("weather.api.base-url", () -> "http://localhost:8089");
    }

    @Autowired WeatherService weatherService;

    @org.junit.jupiter.api.Test
    void serviceUsesDownstreamApi() {
        stubFor(get(urlPathEqualTo("/v1/weather"))
            .withQueryParam("city", equalTo("Paris"))
            .willReturn(okJson("{\\"tempC\\": 11}")));

        var result = weatherService.forecast("Paris");

        assertThat(result.temperature()).isEqualTo(11);
        verify(getRequestedFor(urlPathEqualTo("/v1/weather"))
            .withQueryParam("city", equalTo("Paris")));
    }
}
\`\`\`

Here a fixed port (\`8089\`) is used because \`@DynamicPropertySource\` needs a stable URL to inject before the Spring context starts. The property \`weather.api.base-url\` is whatever key your \`WebClient\`/\`RestTemplate\`/Feign configuration reads. With that one override, the entire Spring wiring — your service, client config, and HTTP layer — runs against WireMock, giving you a high-fidelity integration test with no live dependency. For Spring Cloud Contract users, WireMock is also the engine behind the stub runner, so the same mappings can be shared as contracts.

## JSON stub mappings and record-and-playback

You do not have to define every stub in Java. WireMock loads stub mappings from JSON files placed under a \`mappings/\` directory (with response bodies optionally in a sibling \`__files/\` directory). This is handy for large, stable fixtures shared across tests or for non-Java teammates.

\`\`\`json
{
  "request": {
    "method": "GET",
    "urlPath": "/v1/users/1"
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "bodyFileName": "user-1.json"
  }
}
\`\`\`

Point the server at a root directory (\`--root-dir\` for standalone, or \`usingFilesUnderDirectory(...)\` programmatically) and it auto-loads these on startup. To bootstrap mappings from a real API, run WireMock in **record mode**: start it as a proxy in front of the live service, exercise your app, and WireMock writes out the observed request/response pairs as mapping files you can then trim and commit. This record-and-playback flow is the fastest way to capture realistic fixtures without hand-writing them, and it pairs well with contract-style testing where the recorded mappings become the agreed interface.

## Selective proxying for hybrid tests

Sometimes you want most calls to hit a real backend but a few specific endpoints stubbed (e.g. stub the flaky payment endpoint, proxy everything else to a staging API). WireMock supports this with a proxy stub plus higher-priority overrides:

\`\`\`java
// Default: proxy everything to the real service (low priority)
stubFor(any(anyUrl()).atPriority(10)
    .willReturn(aResponse().proxiedFrom("https://staging.api.example.com")));

// Override one endpoint with a local stub (higher priority wins)
stubFor(post(urlPathEqualTo("/v1/payments")).atPriority(1)
    .willReturn(okJson("{\\"status\\":\\"approved\\"}")));
\`\`\`

Because lower \`atPriority\` numbers win, the specific \`/v1/payments\` stub takes precedence while all other paths transparently proxy upstream. This hybrid mode is useful for integration tests that need realistic data for most calls but deterministic control over the one or two interactions under test.

## Common pitfalls

- **Stub registered but not matched** — usually a matcher mismatch (e.g. \`urlEqualTo\` requires the exact query string; use \`urlPathEqualTo\` + \`withQueryParam\` for flexible matching). Hit \`/__admin/requests\` or call \`findAllUnmatchedRequests()\` to see what actually arrived.
- **Wrong base URL in the client** — confirm the client points at \`wm.getHttpBaseUrl()\` (random port) or your fixed port; a stray default URL silently bypasses WireMock.
- **Stubs leaking between tests** — the JUnit 5 extension resets between tests, but if you create the server manually, call \`reset()\` in \`@BeforeEach\`.
- **HTTPS** — for TLS the client must trust WireMock's certificate or be configured to accept it; use \`@WireMockTest(httpsEnabled = true)\` and the HTTPS base URL.

For broader API mocking strategy and how WireMock compares to other tools, see the [comparison hub](/compare) and the [blog](/blog).

## Frequently Asked Questions

### What is WireMock used for in Java testing?

WireMock runs a configurable HTTP server that stands in for the external and downstream APIs your application calls. In tests you stub the expected requests and responses, point your HTTP client at WireMock, and verify your code sent the right calls. This lets you test integration behavior, error handling, and resilience without depending on live third-party services.

### How do I use WireMock with JUnit 5?

Add the \`wiremock-standalone\` dependency and annotate your test class with \`@WireMockTest\`. The extension starts a server on a random port before tests and stops it afterward, injecting a \`WireMockRuntimeInfo\` parameter so you can read the base URL and port. Register stubs with \`stubFor(...)\` and assert calls with \`verify(...)\` inside each test.

### How do I integrate WireMock with Spring Boot?

Combine \`@SpringBootTest\` with the WireMock extension and use \`@DynamicPropertySource\` to override the property holding your downstream API's base URL, pointing it at WireMock's port. Because the property must be set before the Spring context starts, use a fixed port via \`@WireMockTest(httpPort = ...)\`. Your real client beans then call WireMock during the integration test.

### How do I verify that my code made a specific HTTP request?

Use \`verify()\` with a request matcher, for example \`verify(postRequestedFor(urlPathEqualTo("/v1/orders")).withRequestBody(...))\`. You can assert exact counts with \`exactly(n)\`, ranges with \`lessThan(n)\`/\`moreThanOrExactly(n)\`, and assert a call never happened with \`verify(0, ...)\`. The matcher DSL covers method, URL, headers, query params, and body.

### Can WireMock simulate slow or failing APIs?

Yes. Use \`withFixedDelay\` or \`withUniformRandomDelay\` on a response to add latency and test timeout configuration, and \`withFault(...)\` to simulate connection resets, empty responses, or malformed data. Returning error statuses like 503 lets you exercise retry, circuit-breaker, and fallback logic against realistic failure conditions.

### Should I use the JUnit extension or a manual WireMockServer?

Prefer the \`@WireMockTest\` JUnit 5 extension for most cases — it handles startup, random ports, and reset automatically with minimal boilerplate. Construct a \`WireMockServer\` manually only when you need custom options the annotation does not expose conveniently, such as bespoke HTTPS setup, custom extensions, or fine-grained lifecycle control across multiple servers.
`,
};
