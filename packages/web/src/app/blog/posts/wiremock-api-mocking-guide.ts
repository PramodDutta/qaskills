import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WireMock API Mocking & Service Virtualization: Complete Guide (2026)',
  description:
    'Complete WireMock tutorial for API mocking and service virtualization: stub HTTP APIs with JSON and the Java DSL, match requests, template responses, inject faults.',
  date: '2026-06-23',
  category: 'Guide',
  content: `
# WireMock API Mocking & Service Virtualization: The Complete Guide

When you build a service that talks to other services, your tests inherit every flaw of those dependencies. A downstream payments API goes down for maintenance, a third-party geocoding service rate-limits your CI runner, a partner's sandbox returns different data every hour, and suddenly your "passing" test suite turns red for reasons that have nothing to do with your code. **WireMock** exists to break that coupling. It is a mature, open-source HTTP mock server and service-virtualization tool that lets you stand up fake versions of the APIs your application depends on, so your tests run fast, deterministically, and entirely offline.

This guide is a practical, end-to-end **WireMock tutorial** aimed at backend and QA engineers who need to stub HTTP APIs in real projects. We will cover what WireMock is and when a mock beats a real service, every way to run it (standalone JAR, Docker, the JUnit 5 extension, and Testcontainers), the fundamentals of stubbing, advanced request matching, Handlebars response templating, stateful scenarios, fault and latency injection, proxying with record-and-playback, request verification, and the trade-offs between JSON mapping files and the Java DSL. We will also compare WireMock against MockServer, Mockoon, and Nock so you can pick the right tool, and finish with CI integration and battle-tested best practices. Every code sample is real and runnable. By the end you will be able to virtualize an entire dependency graph and write integration tests that never flake because of someone else's uptime.

---

## What WireMock Is and When to Mock vs Use the Real Service

**WireMock** is a tool for simulating HTTP-based APIs. It runs an HTTP server that you configure with *stubs*: rules that say "when a request matches this pattern, return this response." Anything your code can point at an HTTP URL, WireMock can stand in for, including REST APIs, SOAP endpoints, OAuth token services, webhooks, and even slow or flaky third-party systems you cannot control.

The term **service virtualization** describes the broader practice: replacing a real component in a distributed system with a lightweight simulation that behaves like the real thing for testing purposes. WireMock is the most popular open-source option in the JVM ecosystem, though it now ships standalone, in Docker, and as a hosted cloud service too.

So when should you mock, and when should you hit the real service?

- **Mock when** the dependency is slow, costs money per call, is rate-limited, returns non-deterministic data, is not yet built (contract-first development), or is hard to push into specific error states (timeouts, 500s, malformed bodies).
- **Use the real service when** you are explicitly writing contract or integration tests that must catch drift between your assumptions and the provider's actual behavior, or in a dedicated end-to-end environment.

A healthy strategy uses both. Mock the world in your fast unit and component tests, and run a smaller, slower suite against real or sandbox services to catch contract violations. For a deeper treatment of where these layers fit, see our [microservices testing strategies](/blog/microservices-testing-strategies) guide and the companion piece on [API contract testing for microservices](/blog/api-contract-testing-microservices).

---

## Running WireMock: Standalone JAR, Docker, JUnit 5, Testcontainers

WireMock is unusually flexible about how it runs. Pick the mode that matches your workflow.

### Standalone JAR

The standalone JAR is perfect for local exploration, manual testing, and sharing a mock with frontend teammates. Download \`wiremock-standalone\` from Maven Central and run:

\`\`\`bash
java -jar wiremock-standalone-3.9.1.jar --port 8080 --root-dir ./wiremock --verbose
\`\`\`

This starts WireMock on port 8080, loads any JSON mappings it finds under \`./wiremock/mappings\`, serves files from \`./wiremock/__files\`, and logs every request. You can now \`curl http://localhost:8080/api/users\` and get back whatever you stubbed.

### Docker

The official image is the cleanest way to run WireMock in CI or share a reproducible mock:

\`\`\`bash
docker run -d --name wiremock -p 8080:8080 \\
  -v "$PWD/wiremock:/home/wiremock" \\
  wiremock/wiremock:3.9.1 --verbose --global-response-templating
\`\`\`

Mounting your local \`wiremock\` directory into \`/home/wiremock\` means mappings and \`__files\` are picked up automatically. The \`--global-response-templating\` flag turns on Handlebars templating for every stub.

### JUnit 5 Extension

For Java test suites, the JUnit 5 extension is the most ergonomic option. It boots a server before your tests and tears it down afterward. Add the dependency:

\`\`\`xml
<dependency>
  <groupId>org.wiremock</groupId>
  <artifactId>wiremock-standalone</artifactId>
  <version>3.9.1</version>
  <scope>test</scope>
</dependency>
\`\`\`

Then register the extension (full example in the stubbing section below).

### Testcontainers

If you already use Testcontainers for your databases, the WireMock module keeps everything consistent and gives you a fresh container per test class:

\`\`\`java
import org.wiremock.integrations.testcontainers.WireMockContainer;

WireMockContainer wiremock = new WireMockContainer("wiremock/wiremock:3.9.1")
    .withMappingFromResource("users", "stubs/users.json");
wiremock.start();
String baseUrl = wiremock.getBaseUrl();
\`\`\`

This is ideal when you want full isolation and do not care about the small startup cost of spinning up a container.

---

## Stubbing Basics: stubFor, urlPathEqualTo, willReturn

A stub is the core unit of WireMock. In the Java DSL it reads almost like a sentence: *stub for a GET on this URL, willReturn this response.* Here is a complete, runnable JUnit 5 test using the WireMock extension.

\`\`\`java
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserServiceTest {

  @RegisterExtension
  static WireMockExtension wm = WireMockExtension.newInstance()
      .options(options().dynamicPort())
      .build();

  @Test
  void returnsStubbedUser() throws Exception {
    wm.stubFor(get(urlEqualTo("/api/users"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("[{\\"id\\":1,\\"name\\":\\"Ada Lovelace\\"}]")));

    HttpClient client = HttpClient.newHttpClient();
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(wm.baseUrl() + "/api/users"))
        .GET()
        .build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    assertEquals(200, response.statusCode());
    assertTrue(response.body().contains("Ada Lovelace"));
  }
}
\`\`\`

A few important distinctions you will reach for constantly:

- \`urlEqualTo("/api/users")\` matches the **full URL including the query string**. \`/api/users?page=1\` would *not* match.
- \`urlPathEqualTo("/api/users")\` matches **only the path**, ignoring query parameters.
- \`urlPathMatching("/api/users/[0-9]+")\` matches the path against a regular expression.

Use \`urlPathEqualTo\` plus explicit query-parameter matchers (shown next) when you care about query values, rather than baking them into a brittle \`urlEqualTo\` string.

---

## Request Matching: URL, Headers, Query, Body, and jsonPath

Real APIs route on far more than the URL. WireMock can match on virtually any attribute of an incoming request, and it only serves a stub when **all** specified conditions pass. When multiple stubs could match, the most specific (or highest-priority) one wins.

This stub only fires for an authenticated POST whose JSON body contains a specific email:

\`\`\`java
wm.stubFor(post(urlPathEqualTo("/api/users"))
    .withHeader("Authorization", matching("Bearer .+"))
    .withHeader("Content-Type", equalTo("application/json"))
    .withQueryParam("notify", equalTo("true"))
    .withRequestBody(matchingJsonPath("$.email", containing("@")))
    .withRequestBody(equalToJson("{\\"email\\":\\"ada@example.com\\",\\"role\\":\\"admin\\"}", true, true))
    .willReturn(aResponse()
        .withStatus(201)
        .withHeader("Location", "/api/users/42")));
\`\`\`

The \`true, true\` flags on \`equalToJson\` enable *ignore array order* and *ignore extra elements*, which keeps body matching robust against insignificant differences. The table below covers the matchers you will use most often.

| Matcher | Use it for |
|---|---|
| \`urlEqualTo(path)\` | Exact match on full URL including query string |
| \`urlPathEqualTo(path)\` | Exact match on path only, ignore query string |
| \`urlPathMatching(regex)\` | Regex match against the path |
| \`withHeader(name, equalTo(v))\` | Match a request header exactly |
| \`withHeader(name, matching(regex))\` | Match a header against a regex (e.g. bearer tokens) |
| \`withQueryParam(name, equalTo(v))\` | Match a single query parameter value |
| \`withRequestBody(equalToJson(json))\` | Match the JSON body, optionally ignoring order/extras |
| \`withRequestBody(matchingJsonPath(expr))\` | Assert a JSONPath expression exists or matches |
| \`withRequestBody(matchingXPath(expr))\` | Match inside an XML/SOAP body |
| \`withCookie(name, equalTo(v))\` | Match a request cookie |
| \`withBasicAuth(user, pass)\` | Match HTTP Basic credentials |

JSONPath matching deserves special mention. \`matchingJsonPath("$.items[?(@.price > 100)]")\` lets you match on the *shape and content* of a body rather than a byte-for-byte string, which is invaluable when the client serializes JSON in an unpredictable field order.

---

## Response Templating with Handlebars

Static responses get you far, but sometimes you want the mock to echo parts of the request back, generate timestamps, or randomize an ID. WireMock's **response templating** uses the Handlebars engine and exposes a \`request\` model plus a set of helpers. Enable it per-stub with \`.withTransformers("response-template")\` or globally with the \`--global-response-templating\` flag.

\`\`\`java
wm.stubFor(get(urlPathMatching("/api/users/[0-9]+"))
    .willReturn(aResponse()
        .withStatus(200)
        .withHeader("Content-Type", "application/json")
        .withTransformers("response-template")
        .withBody("""
            {
              "id": {{request.path.[2]}},
              "requestedPath": "{{request.path}}",
              "page": "{{request.query.page}}",
              "trace": "{{request.headers.X-Trace-Id}}",
              "createdAt": "{{now format='yyyy-MM-dd'}}",
              "token": "{{randomValue type='UUID'}}"
            }
            """)));
\`\`\`

The double-brace \`{{...}}\` syntax is Handlebars, not a shell or JS template, so it passes through safely. Useful expressions include \`{{request.path.[0]}}\` for path segments, \`{{request.query.paramName}}\` for query values, \`{{request.headers.HeaderName}}\` for headers, \`{{request.body}}\` and \`{{jsonPath request.body '$.field'}}\` for body extraction, \`{{now offset='3 days'}}\` for relative dates, and \`{{randomValue type='UUID'}}\` for generated identifiers. Templating turns a single stub into a dynamic endpoint that reflects whatever the caller sent.

---

## Stateful Behavior with Scenarios

A plain stub is stateless: the same request always yields the same response. But real workflows have state. Creating a resource then fetching it should return the new resource; deleting it should then 404. WireMock models this with **Scenarios**, which are named finite state machines. Each stub can require a starting state and transition to a new one when matched.

\`\`\`java
String scenario = "order-lifecycle";

// Initial state: order does not exist yet -> 404
wm.stubFor(get(urlPathEqualTo("/api/orders/1"))
    .inScenario(scenario)
    .whenScenarioStateIs(com.github.tomakehurst.wiremock.stubbing.Scenario.STARTED)
    .willReturn(aResponse().withStatus(404)));

// Creating the order transitions the scenario to "Created"
wm.stubFor(post(urlPathEqualTo("/api/orders"))
    .inScenario(scenario)
    .whenScenarioStateIs(com.github.tomakehurst.wiremock.stubbing.Scenario.STARTED)
    .willSetStateTo("Created")
    .willReturn(aResponse().withStatus(201).withHeader("Location", "/api/orders/1")));

// After creation, GET now returns the order
wm.stubFor(get(urlPathEqualTo("/api/orders/1"))
    .inScenario(scenario)
    .whenScenarioStateIs("Created")
    .willReturn(aResponse()
        .withStatus(200)
        .withHeader("Content-Type", "application/json")
        .withBody("{\\"id\\":1,\\"status\\":\\"NEW\\"}")));
\`\`\`

Scenarios let you test polling loops, eventual consistency, and multi-step sagas deterministically. You can reset all scenarios between tests with \`wm.resetScenarios()\` so each test starts from \`STARTED\`.

---

## Simulating Latency and Faults

The most valuable tests are often the ones that exercise failure paths, and those are exactly the conditions a real dependency will not produce on demand. WireMock makes them trivial.

For latency, add a fixed or distributed delay:

\`\`\`java
wm.stubFor(get(urlPathEqualTo("/api/slow"))
    .willReturn(aResponse()
        .withStatus(200)
        .withFixedDelay(3000)              // exactly 3 seconds
        .withBody("delayed response")));

wm.stubFor(get(urlPathEqualTo("/api/jittery"))
    .willReturn(aResponse()
        .withStatus(200)
        .withLogNormalRandomDelay(2000, 0.5)));  // realistic variable latency
\`\`\`

For lower-level faults that break the HTTP contract entirely, use \`withFault\`:

\`\`\`java
import com.github.tomakehurst.wiremock.http.Fault;

wm.stubFor(get(urlPathEqualTo("/api/broken"))
    .willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));

wm.stubFor(get(urlPathEqualTo("/api/garbage"))
    .willReturn(aResponse().withFault(Fault.MALFORMED_RESPONSE_CHUNK)));

wm.stubFor(get(urlPathEqualTo("/api/empty"))
    .willReturn(aResponse().withFault(Fault.EMPTY_RESPONSE)));
\`\`\`

Combine fixed delays with your client's timeout settings to verify that retries, circuit breakers, and fallbacks actually kick in. This is precisely the kind of fault injection that overlaps with resilience testing; if you want to push it further, our coverage of chaos and resilience techniques in the [microservices testing strategies](/blog/microservices-testing-strategies) article expands on the topic.

---

## Proxying and Record-and-Playback

When you do not yet have a contract written down, WireMock can *learn* one. In **proxy mode**, WireMock forwards requests to a real backend and returns its responses. In **record mode**, it does the same but also captures each request/response pair as a stub mapping you can replay later, offline.

Start the standalone server in recording-friendly mode and point it at the real API:

\`\`\`bash
java -jar wiremock-standalone-3.9.1.jar --port 8080 --proxy-all="https://api.real-service.com" --record-mappings --root-dir ./wiremock
\`\`\`

Now drive your application against \`http://localhost:8080\`. WireMock proxies every call to the real service and writes the captured stubs into \`./wiremock/mappings\`. Stop the server, remove the \`--proxy-all\` flag, and on the next run WireMock replays the recorded responses with no network access at all. You can also trigger recording through the admin API at \`/__admin/recordings/start\` and \`/__admin/recordings/stop\`, or selectively proxy only unmatched requests so that your hand-written stubs take priority and everything else falls through to the real backend.

Record-and-playback is the fastest way to bootstrap a large set of realistic stubs, but treat the generated mappings as a starting point: trim sensitive headers, parameterize volatile fields with templating, and delete duplicate recordings before committing them.

---

## Verifying Requests with verify and findAll

Stubbing controls what the mock *sends back*. **Verification** asserts what your code actually *sent*. This is how you confirm your service made the right outbound calls with the right payloads, which is essential for testing event publishing, analytics, and downstream side effects.

\`\`\`java
// Assert exactly one matching POST was made
wm.verify(1, postRequestedFor(urlPathEqualTo("/api/users"))
    .withHeader("Content-Type", equalTo("application/json"))
    .withRequestBody(matchingJsonPath("$.email", equalTo("ada@example.com"))));

// Assert a call was NOT made
wm.verify(0, deleteRequestedFor(urlPathMatching("/api/users/.*")));

// Inspect captured requests for richer assertions
var requests = wm.findAll(postRequestedFor(urlPathEqualTo("/api/events")));
assertEquals(3, requests.size());
assertTrue(requests.get(0).getBodyAsString().contains("user.signup"));

// Catch unexpected traffic
var unmatched = wm.findUnmatchedRequests();
assertTrue(unmatched.isEmpty(), "Application made requests with no matching stub");
\`\`\`

\`findUnmatchedRequests()\` is an underused gem: it surfaces calls your application made that no stub anticipated, which often reveals a bug or a missing stub before it becomes a production incident.

---

## JSON Mapping Files vs the Java DSL

You can define stubs two ways, and most teams use both. The **Java DSL** lives inside your test code and is great for stubs that are specific to one test. **JSON mapping files** live on disk under \`mappings/\` and are loaded automatically by the standalone server or Docker container; they are perfect for shared, reusable stubs and for non-Java teammates who just want a running mock. Here is the same user stub as a JSON mapping:

\`\`\`json
{
  "request": {
    "method": "GET",
    "urlPathEqualTo": "/api/users",
    "queryParameters": {
      "page": { "equalTo": "1" }
    }
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": [
      { "id": 1, "name": "Ada Lovelace" },
      { "id": 2, "name": "Alan Turing" }
    ]
  }
}
\`\`\`

Drop this file in \`wiremock/mappings/users.json\`, start the server with \`--root-dir ./wiremock\`, and the stub is live with no code at all. As a rule of thumb: use JSON mappings for the stable, shared baseline of your API surface, and use the Java DSL for the one-off behavior a particular test needs to assert.

---

## WireMock vs MockServer vs Mockoon vs Nock

WireMock is not the only HTTP mocking tool. The right choice depends on your language, your team, and how much process you want around your mocks.

| Tool | Primary ecosystem | Config style | Standout strength | Best for |
|---|---|---|---|---|
| WireMock | JVM (Java/Kotlin), standalone, Docker | Java DSL, JSON, admin API | Scenarios, templating, record/playback, huge feature set | JVM teams and shared service virtualization |
| MockServer | JVM, Node, standalone, Docker | Java/JS DSL, JSON expectations | Expectation verification, proxy, deployable anywhere | Polyglot teams wanting strong verify semantics |
| Mockoon | Cross-platform desktop app + CLI | GUI-driven, exportable JSON | Fastest no-code mock setup with a visual UI | Frontend devs and quick local prototyping |
| Nock | Node.js only | JS interceptor in-process | Intercepts Node HTTP without a separate server | Unit-testing Node code with zero infra |

The key architectural difference: WireMock, MockServer, and Mockoon run as **real HTTP servers** your application connects to over the network, which makes them language-agnostic and able to virtualize a service for any client. Nock is an **in-process interceptor** that patches Node's HTTP module, so it is lighter weight but only works for Node code and cannot mock traffic from another process. If your stack is JVM-based and you need scenarios, templating, and proxy recording, WireMock is the most complete option.

---

## Using WireMock in CI

In CI you want WireMock to start cleanly, be reachable, and tear down without leaking ports. The JUnit 5 extension and Testcontainers handle lifecycle automatically, which makes them the safest choices for pipelines. If you prefer the standalone server, run it as a service container. Here is a minimal GitHub Actions job that boots WireMock in Docker and runs a Maven build against it:

\`\`\`yaml
name: integration-tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      wiremock:
        image: wiremock/wiremock:3.9.1
        ports:
          - 8080:8080
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - name: Run tests against WireMock
        env:
          API_BASE_URL: http://localhost:8080
        run: mvn -B test
\`\`\`

Always bind WireMock to a **dynamic port** (\`dynamicPort()\` in the extension, or let Testcontainers map it) when running tests in parallel, so concurrent suites never fight over 8080. Reset stubs and request journals between tests with \`wm.resetAll()\` to avoid cross-test contamination. For the broader pipeline picture, including how to layer mocked and real tests, see our guide to building an [API testing workflow](/blog/api-testing-complete-guide).

---

## Best Practices

A few habits separate mocks that help from mocks that quietly lie to you:

- **Keep stubs close to reality.** Use record-and-playback against the real service periodically to detect drift, and pair WireMock with consumer-driven contract tests so your stubs stay honest. The [API contract testing](/blog/api-contract-testing-microservices) guide explains how to wire this up.
- **Match precisely, not loosely.** A stub that matches \`any(anyUrl())\` will mask bugs. Match the method, path, key headers, and body shape that actually matter.
- **Reset state between tests.** Call \`resetAll()\` or \`resetScenarios()\` so tests cannot depend on each other's side effects.
- **Assert on unmatched requests.** Fail the test if your application made an unexpected call; surprise traffic is usually a defect.
- **Prefer dynamic ports.** Hard-coded ports break parallel CI and collide with local services.
- **Version your mappings.** Commit JSON mappings alongside the code they support and review them like any other test asset.
- **Do not over-mock.** Mocks verify *your* code against *assumed* behavior. Always keep a thin layer of tests against the real or sandbox service.

---

## Frequently Asked Questions

### What is WireMock used for?

WireMock is used to simulate HTTP APIs so you can test code that depends on external services without calling them for real. It stubs responses, matches incoming requests, injects latency and faults, and verifies outbound calls. Teams use it for fast, deterministic integration tests, contract-first development against APIs that do not exist yet, and reproducing hard-to-trigger error conditions.

### Is WireMock free and open source?

Yes. WireMock is open source under the Apache 2.0 license and is free to use for any purpose, including commercial projects. There is also a commercial hosted product, WireMock Cloud, which adds a managed UI, collaboration, and team features. The core library, standalone JAR, and Docker image that this guide covers are all completely free.

### What is the difference between WireMock and Mockito?

They solve different problems. Mockito mocks Java objects and method calls *inside* your application, replacing a dependency at the code level. WireMock mocks an *external HTTP service* at the network level. If you want to fake a repository class, use Mockito; if you want to fake a REST API your code calls over HTTP, use WireMock. Many test suites use both together.

### How do I make WireMock return dynamic responses?

Enable response templating. Add the \`response-template\` transformer to a stub (or use \`--global-response-templating\` on the server) and write Handlebars expressions in the body, such as \`{{request.path.[2]}}\`, \`{{request.query.page}}\`, \`{{now}}\`, or \`{{randomValue type='UUID'}}\`. WireMock evaluates these at request time, so the same stub can echo request data, generate timestamps, and produce unique identifiers.

### Can WireMock simulate slow APIs and network failures?

Yes, and this is one of its strongest features. Use \`withFixedDelay\` or \`withLogNormalRandomDelay\` to add latency, and \`withFault\` to break the connection with \`CONNECTION_RESET_BY_PEER\`, \`EMPTY_RESPONSE\`, or \`MALFORMED_RESPONSE_CHUNK\`. This lets you verify that your timeouts, retries, and circuit breakers behave correctly under conditions a real dependency will rarely produce on demand.

### How is WireMock different from MockServer?

Both are real HTTP mock servers, so both are language-agnostic and can virtualize a service for any client. WireMock has a deeper feature set for scenarios, Handlebars templating, and proxy-based record-and-playback, and is the de facto standard in the JVM world. MockServer emphasizes expectation verification and a slightly more uniform API across Java and JavaScript. For JVM teams needing scenarios and recording, WireMock is usually the richer choice.

### Should I use JSON mappings or the Java DSL?

Use both. JSON mapping files under \`mappings/\` are loaded automatically by the standalone server and are ideal for shared, stable stubs that non-Java teammates can use. The Java DSL lives in your test code and is best for stubs and verifications specific to a single test. A common pattern is a committed JSON baseline plus per-test DSL overrides.

### Can I run WireMock without Java?

Yes. Run the official Docker image (\`wiremock/wiremock\`), which requires no local Java installation, and configure it entirely through JSON mapping files and the admin REST API. The image accepts the same flags as the standalone JAR, so you can mount mappings, enable templating, and proxy real services without writing a line of Java. This makes WireMock practical for frontend and polyglot teams too.

---

## Conclusion

WireMock turns flaky, expensive, or not-yet-built dependencies into fast, deterministic stubs you fully control. You have now seen how to run it as a standalone JAR, in Docker, through the JUnit 5 extension, and with Testcontainers; how to stub and match requests on URL, headers, query, and body; how to template dynamic responses with Handlebars; how to model state with scenarios; how to inject latency and faults; how to bootstrap stubs with record-and-playback; and how to verify the calls your code makes. Paired with a thin layer of contract tests against the real service, WireMock gives you an integration suite that is both fast and trustworthy.

Ready to go deeper into API and service testing? Explore curated, agent-ready testing skills in the [QASkills directory](/skills), and keep building your toolkit with our guides to [API testing](/blog/api-testing-complete-guide), [contract testing for microservices](/blog/api-contract-testing-microservices), and [REST Assured for Java](/blog/rest-assured-java-api-testing).
`,
};
