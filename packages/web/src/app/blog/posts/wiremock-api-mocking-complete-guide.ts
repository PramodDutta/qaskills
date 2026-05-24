import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WireMock API Mocking Complete Guide 2026',
  description:
    'Master WireMock for API mocking and service virtualization. Stubbing, request matching, dynamic responses, recording, Docker setup, and CI integration.',
  date: '2026-05-20',
  category: 'API Testing',
  content: `
# WireMock API Mocking Complete Guide 2026

WireMock is the most widely used HTTP mock server in the Java ecosystem and one of the most popular across all stacks. It lets you stand up a fake version of any HTTP service - third-party APIs, downstream microservices, payment gateways, identity providers - and program it to respond in any way you need. With WireMock, you can write integration tests that don't depend on external systems being available, simulate edge cases like 500 errors or slow responses, record real traffic to generate stubs, and run service virtualization in pre-prod environments.

This complete guide covers every aspect of WireMock in 2026: installation as a standalone server, as a Java library, and as a Docker container; request matching by URL, method, headers, body, and JSON path; stubbed response generation with templating and proxies; recording real traffic; stateful behavior; CI integration; and patterns for testing microservices end-to-end. Real code examples and configuration JSON are included. By the end you'll be ready to use WireMock to make your integration tests deterministic and fast.

## Key Takeaways

- WireMock is a polyglot HTTP mock server, runs standalone or in-process
- Supports request matching by URL, method, headers, body, JSON path, XPath
- Dynamic responses via templating (Handlebars) and proxying
- Record real traffic to generate stubs automatically
- Stateful scenarios for multi-step behavior
- Docker image for easy CI integration
- WireMock Cloud (paid) for hosted mocking

---

## Installation

### Standalone JAR

\`\`\`bash
wget https://github.com/wiremock/wiremock/releases/download/3.3.0/wiremock-standalone-3.3.0.jar
java -jar wiremock-standalone-3.3.0.jar --port 8080
\`\`\`

### Docker

\`\`\`bash
docker run -p 8080:8080 wiremock/wiremock:3.3.0
\`\`\`

### Java Library

\`\`\`xml
<dependency>
  <groupId>org.wiremock</groupId>
  <artifactId>wiremock</artifactId>
  <version>3.3.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

## Basic Stub

Create a JSON file in the mappings directory:

\`\`\`json
{
  "request": {
    "method": "GET",
    "url": "/users/1"
  },
  "response": {
    "status": 200,
    "headers": {"Content-Type": "application/json"},
    "jsonBody": {"id": 1, "name": "Alice"}
  }
}
\`\`\`

Now \`curl http://localhost:8080/users/1\` returns the stubbed response.

## Stubs Via API

\`\`\`bash
curl -X POST http://localhost:8080/__admin/mappings -d '{
  "request": {"method": "GET", "url": "/users/2"},
  "response": {"status": 200, "jsonBody": {"id": 2, "name": "Bob"}}
}'
\`\`\`

## Java DSL

\`\`\`java
import com.github.tomakehurst.wiremock.WireMockServer;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import org.junit.jupiter.api.*;

class WireMockTest {
    static WireMockServer wireMockServer;

    @BeforeAll
    static void setup() {
        wireMockServer = new WireMockServer(8080);
        wireMockServer.start();
    }

    @AfterAll
    static void teardown() {
        wireMockServer.stop();
    }

    @Test
    void getUserReturnsAlice() {
        stubFor(get(urlEqualTo("/users/1"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\\"id\\": 1, \\"name\\": \\"Alice\\"}")));

        // Call your client against http://localhost:8080
        // Assert behavior
    }
}
\`\`\`

## URL Matching

| Matcher | Example |
|---------|---------|
| urlEqualTo | urlEqualTo("/users/1") |
| urlPathEqualTo | urlPathEqualTo("/users/1") (ignores query) |
| urlPathMatching | urlPathMatching("/users/\\\\d+") |
| urlMatching | urlMatching("/users\\\\?.*") |

## Method Matching

\`\`\`java
stubFor(post(urlEqualTo("/orders"))
    .willReturn(aResponse().withStatus(201)));

stubFor(put(urlPathMatching("/users/\\\\d+"))
    .willReturn(aResponse().withStatus(200)));
\`\`\`

## Header Matching

\`\`\`java
stubFor(get("/me")
    .withHeader("Authorization", containing("Bearer "))
    .willReturn(aResponse().withStatus(200)));

stubFor(get("/me")
    .withHeader("Authorization", absent())
    .willReturn(aResponse().withStatus(401)));
\`\`\`

## Body Matching

\`\`\`java
stubFor(post("/users")
    .withRequestBody(equalToJson("{\\"name\\": \\"Alice\\"}"))
    .willReturn(aResponse().withStatus(201)));

stubFor(post("/users")
    .withRequestBody(matchingJsonPath("$.email"))
    .willReturn(aResponse().withStatus(201)));

stubFor(post("/users")
    .withRequestBody(matchingXPath("//user/email"))
    .willReturn(aResponse().withStatus(201)));
\`\`\`

## Response Templating

Enable Handlebars-style templating:

\`\`\`bash
java -jar wiremock-standalone.jar --global-response-templating
\`\`\`

\`\`\`json
{
  "request": {"method": "GET", "urlPathPattern": "/users/(.+)"},
  "response": {
    "status": 200,
    "jsonBody": {
      "id": "{{request.path.[1]}}",
      "name": "User {{request.path.[1]}}"
    }
  }
}
\`\`\`

GET /users/42 returns \`{"id": "42", "name": "User 42"}\`.

## Stateful Scenarios

\`\`\`java
stubFor(get("/cart")
    .inScenario("Cart Flow")
    .whenScenarioStateIs(STARTED)
    .willReturn(aResponse().withJsonBody("[]"))); // empty cart

stubFor(post("/cart/items")
    .inScenario("Cart Flow")
    .whenScenarioStateIs(STARTED)
    .willSetStateTo("Item Added")
    .willReturn(aResponse().withStatus(201)));

stubFor(get("/cart")
    .inScenario("Cart Flow")
    .whenScenarioStateIs("Item Added")
    .willReturn(aResponse().withJsonBody("[{\\"sku\\": \\"ABC\\"}]")));
\`\`\`

## Delays And Faults

Simulate slow responses:

\`\`\`java
stubFor(get("/slow")
    .willReturn(aResponse()
        .withStatus(200)
        .withFixedDelay(5000))); // 5 second delay
\`\`\`

Random delay:

\`\`\`java
stubFor(get("/users").willReturn(aResponse().withUniformRandomDelay(50, 500)));
\`\`\`

Simulate network errors:

\`\`\`java
stubFor(get("/broken")
    .willReturn(aResponse()
        .withFault(Fault.EMPTY_RESPONSE)));
\`\`\`

Fault options: EMPTY_RESPONSE, MALFORMED_RESPONSE_CHUNK, RANDOM_DATA_THEN_CLOSE, CONNECTION_RESET_BY_PEER.

## Proxying

Forward unmatched requests to a real upstream:

\`\`\`java
stubFor(any(anyUrl()).willReturn(aResponse().proxiedFrom("https://real-api.example.com")));
\`\`\`

## Recording

Record real traffic to generate stubs:

\`\`\`bash
java -jar wiremock-standalone.jar --proxy-all="https://api.example.com" --record-mappings
\`\`\`

Make some real calls through localhost:8080, and WireMock writes the request/response pairs as stubs.

## Request Verification

\`\`\`java
verify(postRequestedFor(urlEqualTo("/users"))
    .withRequestBody(equalToJson("{\\"name\\": \\"Alice\\"}")));

verify(2, getRequestedFor(urlPathEqualTo("/me")));
\`\`\`

## Reset

Between tests, reset state:

\`\`\`java
@BeforeEach
void clearStubs() {
    wireMockServer.resetAll();
}
\`\`\`

Or via HTTP: \`POST /__admin/reset\`

## CI Integration With Docker

\`\`\`yaml
# .github/workflows/test.yml
jobs:
  integration:
    runs-on: ubuntu-latest
    services:
      wiremock:
        image: wiremock/wiremock:3.3.0
        ports:
          - 8080:8080
        volumes:
          - ./wiremock-mappings:/home/wiremock/mappings
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
      - run: mvn test -Dwiremock.url=http://localhost:8080
\`\`\`

## Docker Compose

\`\`\`yaml
services:
  app:
    build: .
    environment:
      PAYMENT_API_URL: http://wiremock:8080
    depends_on: [wiremock]
  wiremock:
    image: wiremock/wiremock:3.3.0
    ports: ['8080:8080']
    volumes:
      - ./mocks:/home/wiremock/mappings
\`\`\`

## Real Test Example

\`\`\`java
class OrderServiceTest {
    @RegisterExtension
    static WireMockExtension wireMock = WireMockExtension.newInstance()
        .options(WireMockConfiguration.options().port(8089))
        .build();

    @Test
    void createOrderHitsPaymentService() {
        wireMock.stubFor(post("/charges")
            .withRequestBody(matchingJsonPath("$.amount"))
            .willReturn(aResponse()
                .withStatus(200)
                .withBody("{\\"status\\": \\"paid\\", \\"id\\": \\"ch_abc\\"}")));

        OrderService service = new OrderService("http://localhost:8089");
        OrderResult result = service.createOrder(new Order("ABC", 2));

        assertEquals("paid", result.getPaymentStatus());

        wireMock.verify(postRequestedFor(urlEqualTo("/charges"))
            .withRequestBody(matchingJsonPath("$.amount", equalTo("19.98"))));
    }

    @Test
    void handlesPaymentTimeout() {
        wireMock.stubFor(post("/charges")
            .willReturn(aResponse().withStatus(200).withFixedDelay(10000)));

        OrderService service = new OrderService("http://localhost:8089");
        assertThrows(TimeoutException.class, () -> service.createOrder(new Order("ABC", 1)));
    }

    @Test
    void retriesOnTransientFault() {
        wireMock.stubFor(post("/charges")
            .inScenario("Retry")
            .whenScenarioStateIs(STARTED)
            .willSetStateTo("Second Try")
            .willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));

        wireMock.stubFor(post("/charges")
            .inScenario("Retry")
            .whenScenarioStateIs("Second Try")
            .willReturn(aResponse().withStatus(200).withBody("{\\"status\\": \\"paid\\"}")));

        OrderService service = new OrderService("http://localhost:8089");
        OrderResult result = service.createOrder(new Order("ABC", 1));
        assertEquals("paid", result.getPaymentStatus());

        wireMock.verify(2, postRequestedFor(urlEqualTo("/charges")));
    }
}
\`\`\`

## Comparison To Alternatives

| Tool | Language | Best For |
|------|----------|----------|
| WireMock | Java/standalone | JVM teams, polyglot via HTTP |
| Mockoon | Standalone GUI | Quick mocks, no code |
| nock | Node JS | Node test mocking |
| Pact | Polyglot | Contract testing |
| MSW | JS browser/node | Browser fetch mocking |
| Hoverfly | Go standalone | Service virtualization at scale |

## When To Use WireMock

- Mocking third-party APIs in integration tests
- Service virtualization across teams
- Testing edge cases (timeouts, 500s, malformed responses)
- Recording real traffic to seed tests
- Stateful microservice testing

## When Not To Use WireMock

- Unit tests where a simple mock library suffices
- Browser-only testing (use MSW)
- High-throughput load testing (use real services or load test tools)

## CI Patterns

| Pattern | Use Case |
|---------|----------|
| WireMock as sidecar | Long-running integration tests |
| WireMock in test setup | Per-test isolation |
| Recorded stubs in git | Stable, reviewable mocks |
| WireMock Cloud | Distributed mocking |

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| One mega mappings file | Split by domain |
| Recording into prod stubs | Curate recorded mappings |
| No reset between tests | resetAll() in @BeforeEach |
| Mocking your own service | Test it directly |
| Stale stubs | Auto-regenerate from contracts |

## Conclusion

WireMock is the gold standard for HTTP mocking in the JVM ecosystem and a strong contender across all stacks via its standalone server and Docker image. The combination of flexible request matching, dynamic responses, stateful scenarios, recording, and fault injection covers virtually every API mocking need. For teams writing integration tests against third-party services or microservices, it's an essential tool.

Start by adding WireMock to one test that depends on an external API. Replace the real URL with localhost:8089 and stub the expected behavior. Run the test - it should pass without network access. From there, build out your mock library incrementally. Visit our [skills directory](/skills) or the [API mocking service virtualization guide](/blog/api-mocking-service-virtualization-guide) for related patterns.
`,
};
