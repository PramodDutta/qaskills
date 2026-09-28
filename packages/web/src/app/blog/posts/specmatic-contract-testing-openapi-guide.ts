import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Specmatic: Contract-Driven Testing with OpenAPI',
  description: 'Specmatic guide for OpenAPI contract testing: run provider tests, stubs, compatibility checks, JUnit output, and CI release gates with confidence.',
  date: '2026-09-28',
  category: 'API Testing',
  content: `
# Specmatic: Contract-Driven Testing with OpenAPI

Specmatic turns OpenAPI documents into executable contracts: provider contract tests, service virtualization, example validation, backward compatibility checks, and CI governance. For QA teams, the payoff is direct. Instead of maintaining a separate test suite that slowly drifts from the API specification, you can make the OpenAPI contract itself the source that drives checks against the provider and mocks for consumers.

The product is actively maintained. The official docs currently show \`2.55.0\` in JUnit and CLI examples, including \`io.specmatic:junit5-support:2.55.0\` and \`specmatic-executable-all-2.55.0.jar\`. The GitHub repository is active, and the docs now emphasize \`specmatic.yaml\` version 3. One caveat: some docs examples still display older GitHub Action majors, so this guide uses the current majors instead.

Specmatic's open-source edition supports core OpenAPI and REST contract testing, OpenAPI mocks, WSDL and SOAP, and MCP. The official open-source versus enterprise page says AsyncAPI, GraphQL, gRPC, Arazzo workflows, Avro, Redis stubbing, JDBC stubbing, richer reporting, and several advanced API-testing capabilities are enterprise features. If your team needs those protocols, say that in the plan before a proof of concept. Do not discover the edition boundary halfway through a release gate.

For adjacent API contract strategies, pair this with [API Contract Testing for Microservices](/blog/api-contract-testing-microservices) and [Schemathesis OpenAPI Testing Guide](/blog/api-contract-testing-schemathesis-guide). Specmatic is strongest when teams practice contract-driven development: producers and consumers agree on the contract first, then both sides use it as executable feedback.

## The Contract-Driven Testing Loop

Specmatic changes the usual testing order. In many teams, an API spec is documentation written after implementation. In a contract-driven workflow, the spec is the agreement, and tests flow from it. That means provider tests ask, \`does the implementation satisfy the OpenAPI contract?\` Consumer tests can run against a Specmatic stub before the provider exists. Compatibility checks ask, \`does the new contract still honor existing consumers?\`

The loop is practical, not academic:

1. Design or update the OpenAPI file.
2. Validate examples and lint the contract.
3. Run backward compatibility checks against the target branch.
4. Generate provider contract tests from the OpenAPI contract.
5. Run consumer tests against Specmatic stubs when the provider is unavailable.
6. Publish reports and block merges on meaningful failures.

| Workflow stage | Specmatic capability | QA decision |
| --- | --- | --- |
| Design review | OpenAPI contract plus examples | Are required fields, status codes, and error shapes testable? |
| Pull request | Example validation and backward compatibility | Did the contract change break an existing consumer? |
| Provider CI | Contract tests against a running service | Does the implementation match the contract? |
| Consumer CI | Mock server from the same contract | Can consumers build against agreed responses? |
| Release readiness | JUnit, HTML, CTRF, or SARIF reports depending on edition | Are failures visible in CI and owned by the right team? |

What people get wrong is treating contract testing as a replacement for all API tests. It is not. Contract tests verify the provider and consumers agree on request and response semantics. You still need business-flow tests, authorization tests, stateful data checks, performance tests, and security testing. Specmatic removes a huge amount of integration guesswork, but it should sit beside deeper test layers rather than pretending every user journey is captured in one OpenAPI path.

## Minimal OpenAPI Contract That Produces Useful Tests

A useful Specmatic contract is not just paths and schemas. It includes representative examples, clear status codes, realistic constraints, and error responses. If the OpenAPI document says \`200\` returns \`object\`, the generated test has little to verify. If it says \`GET /orders/{id}\` returns an order with stable fields and examples, Specmatic can exercise the provider more meaningfully.

\`\`\`yaml
openapi: 3.0.3
info:
  title: Orders API
  version: 1.0.0
servers:
  - url: http://localhost:8080
paths:
  /orders/{orderId}:
    get:
      summary: Get an order
      operationId: getOrder
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            pattern: "^ORD-[0-9]{6}$"
          examples:
            shipped:
              value: ORD-123456
      responses:
        "200":
          description: Order found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
              examples:
                shipped:
                  value:
                    id: ORD-123456
                    status: shipped
                    totalCents: 2599
        "404":
          description: Order not found
components:
  schemas:
    Order:
      type: object
      required:
        - id
        - status
        - totalCents
      properties:
        id:
          type: string
          pattern: "^ORD-[0-9]{6}$"
        status:
          type: string
          enum:
            - pending
            - shipped
            - cancelled
        totalCents:
          type: integer
          minimum: 0
\`\`\`

Notice the anchored patterns. A vague pattern can let bad IDs through. A schema without required fields lets providers omit contractually important data. A response without an example can still be tested, but examples make mock behavior and consumer feedback much more useful.

## Installing And Running Specmatic

The official download and quick-start docs list multiple distribution paths: Docker, standalone JAR, Linux and macOS install script, Windows, NPM, and Python. Docker is the easiest way to standardize CI. JUnit support is useful when your provider is already a JVM app and you want contract tests to live inside normal \`mvn test\` or \`./gradlew test\` output.

| Distribution | Good fit | Tradeoff |
| --- | --- | --- |
| Docker image \`specmatic/specmatic\` | CI, polyglot repos, local smoke runs | Requires Docker availability |
| Standalone JAR | JVM-friendly local usage | Requires Java 17 or above for current docs |
| JUnit 5 support | Spring Boot, Kotlin, Gradle, Maven | Tied to JVM test lifecycle |
| NPM or Python package | Teams standardizing through language package managers | Verify package version and wrapper behavior before CI |

\`\`\`bash
docker run -it --rm specmatic/specmatic --help
\`\`\`

\`\`\`bash
java -jar specmatic.jar --help
\`\`\`

\`\`\`bash
docker run --rm \\
  -v "\${PWD}/openapi.yaml:/openapi.yaml" \\
  specmatic/specmatic test "/openapi.yaml" \\
  --testBaseURL=http://host.docker.internal:8080
\`\`\`

That last command runs provider contract tests against a service available at \`http://host.docker.internal:8080\`. On Linux CI you may use \`--network=host\` or a Docker Compose network instead. The key is to make the base URL reachable from the container. A surprising number of contract-test failures are networking errors disguised as API failures.

## specmatic.yaml Version 3: The Configuration Spine

The current configuration docs describe \`specmatic.yaml\` version 3. A valid v3 file sets \`version: 3\`, defines at least one \`components.sources\`, one or more \`components.services\`, corresponding \`components.runOptions\`, wires the system under test under \`systemUnderTest\`, and adds dependencies if applicable. This file is the spine for non-trivial repos because it keeps source locations, services, and run behavior in one place.

\`\`\`yaml
version: 3

systemUnderTest:
  service:
    $ref: "#/components/services/orderService"
    runOptions:
      $ref: "#/components/runOptions/orderService"

components:
  sources:
    localContracts:
      directory:
        path: contracts

  services:
    orderService:
      description: Order Service
      definitions:
        - definition:
            source:
              $ref: "#/components/sources/localContracts"
            specs:
              - spec:
                  id: orders-api
                  path: orders.yaml

  runOptions:
    orderService:
      openapi:
        type: test
        baseUrl: http://localhost:8080
\`\`\`

If your application exposes a live OpenAPI document, the contract-testing docs describe a \`swaggerUrl\` under \`systemUnderTest.service.runOptions.openapi\`. Specmatic sends a \`GET\` request to that URL, expects raw OpenAPI JSON or YAML rather than HTML, and compares operations with contract-test coverage.

\`\`\`yaml
version: 3

systemUnderTest:
  service:
    $ref: "#/components/services/employeeService"
    runOptions:
      $ref: "#/components/runOptions/employeeService"

components:
  sources:
    centralContractRepo:
      git:
        url: https://github.com/example/contracts.git

  services:
    employeeService:
      description: Employee Service
      definitions:
        - definition:
            source:
              $ref: "#/components/sources/centralContractRepo"
            specs:
              - spec:
                  id: employeeSpec
                  path: services/employees.yaml

  runOptions:
    employeeService:
      openapi:
        type: test
        baseUrl: http://localhost:8080
        swaggerUrl: http://localhost:8080/v3/api-docs
\`\`\`

Be strict about this endpoint in CI. It must return the raw OpenAPI document with HTTP \`200\`. Swagger UI HTML, an auth redirect, or a gateway error page will cause misleading failures. Add a preflight check that asserts content type and a known field such as \`openapi\` before running the full contract suite.

## Provider Contract Tests From OpenAPI

Provider contract testing is the most direct Specmatic workflow. Start the provider, run Specmatic against the OpenAPI file or config, and let it generate requests and verify responses. The point is not to assert one happy path. The point is to enforce the contract boundary: path params, query params, headers, request bodies, response status codes, media types, and schema shapes.

\`\`\`bash
docker network create contract-test-net

docker run -d --rm \\
  --name orders-api \\
  --network contract-test-net \\
  -p 8080:8080 \\
  example/orders-api:ci

docker run --rm \\
  --network contract-test-net \\
  -v "\${PWD}/contracts/orders.yaml:/contracts/orders.yaml" \\
  specmatic/specmatic test "/contracts/orders.yaml" \\
  --testBaseURL=http://orders-api:8080
\`\`\`

The failure messages are often more valuable than the pass count. A response body field with the wrong type, a missing mandatory field, or an undeclared status code is an integration bug. If the provider is intentionally changing behavior, update the contract and run compatibility checks before merge.

| Contract defect | Example | Provider fix | Contract fix |
| --- | --- | --- | --- |
| Missing required response field | \`totalCents\` absent from \`200\` response | Return the field for all valid responses | Remove requirement only if consumers do not need it |
| Wrong scalar type | \`sku\` returned as number instead of string | Serialize as the declared type | Change schema only with compatibility review |
| Undeclared status code | Provider returns \`422\`, spec lists only \`400\` | Return a declared status | Add \`422\` with schema and examples |
| Invalid media type | Provider returns HTML error page | Return JSON error body | Document HTML only if it is genuinely part of the API |
| Path pattern mismatch | Provider accepts \`123\` for \`ORD-123456\` | Enforce route validation | Loosen pattern only with consumer approval |

A QA engineer should resist the urge to immediately make the spec match the implementation. Contract testing is valuable because it creates a negotiation. Sometimes the implementation is wrong. Sometimes the spec is stale. Sometimes the consumer expectation is unrealistic. The contract test only starts the conversation; ownership decides the fix.

## JUnit 5 Integration For JVM Providers

The official contract-testing docs show \`io.specmatic:junit5-support:2.55.0\` for Maven and Gradle. The open-source interface is \`io.specmatic.test.SpecmaticContractTest\`; the enterprise migration docs describe \`io.specmatic.enterprise.SpecmaticContractTest\` for enterprise usage. That distinction matters when teams copy examples between editions.

\`\`\`kotlin
plugins {
  java
}

repositories {
  mavenCentral()
}

dependencies {
  testImplementation("io.specmatic:junit5-support:2.55.0")
  testImplementation("org.junit.jupiter:junit-jupiter:5.8.2")
}

tasks.test {
  useJUnitPlatform()
}
\`\`\`

\`\`\`java
package com.example.contract;

import io.specmatic.test.SpecmaticContractTest;

public class ContractTests implements SpecmaticContractTest {
}
\`\`\`

With this approach, Specmatic contract tests run through your normal JUnit 5 lifecycle. Maven or Gradle writes JUnit XML reports alongside the rest of the suite. That is helpful for teams that already track test history in CI dashboards and want contract failures to appear like other failing tests.

The realistic failure mode is a provider test that passes locally and fails in CI because the app started on a random port while \`specmatic.yaml\` points to \`http://localhost:8080\`. Fix it by making the port deterministic in the test profile, or by generating the Specmatic base URL from the application startup step before tests run. Do not mark the contract test flaky if the environment is simply miswired.

## Stub And Mock Server Mode For Consumers

Specmatic's service virtualization mode lets consumers run against a mock generated from the same OpenAPI contract. The Docker Hub quick start shows \`specmatic/specmatic mock "/openapi.yaml"\` and maps port \`9000\`. The CLI quick start also demonstrates setting a custom mock port.

\`\`\`bash
docker run --rm \\
  -v "\${PWD}/contracts/orders.yaml:/contracts/orders.yaml" \\
  -p "9000:9000" \\
  specmatic/specmatic mock "/contracts/orders.yaml"
\`\`\`

Now a consumer can point its API client at \`http://localhost:9000\` and exercise contract-backed responses. This is useful when the provider is still under development, unstable, expensive to call, or unavailable in a branch environment.

\`\`\`typescript
type Order = {
  id: string;
  status: 'pending' | 'shipped' | 'cancelled';
  totalCents: number;
};

export async function fetchOrder(baseUrl: string, orderId: string): Promise<Order> {
  const response = await fetch(\`\${baseUrl}/orders/\${encodeURIComponent(orderId)}\`);

  if (!response.ok) {
    throw new Error(\`Order lookup failed with HTTP \${response.status}\`);
  }

  const body = (await response.json()) as Order;

  if (!/^ORD-[0-9]{6}$/.test(body.id)) {
    throw new Error(\`Unexpected order id: \${body.id}\`);
  }

  return body;
}
\`\`\`

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { fetchOrder } from './fetch-order';

describe('orders consumer contract', () => {
  it('reads an order from the Specmatic stub', async () => {
    const order = await fetchOrder('http://localhost:9000', 'ORD-123456');

    expect(order.id).toMatch(/^ORD-[0-9]{6}$/);
    expect(['pending', 'shipped', 'cancelled']).toContain(order.status);
    expect(order.totalCents).toBeGreaterThanOrEqual(0);
  });
});
\`\`\`

These assertions are intentionally not empty. A consumer test that only checks \`response.ok\` misses the contract value. Assert the fields the consumer actually uses, and let the generated stub keep those expectations aligned with the OpenAPI document.

## Backward Compatibility Checks

The current backward compatibility docs describe \`specmatic backward-compatibility-check [options]\` and call older comparison commands deprecated. The newer command supports a wider range of specifications in the docs, while the open-source versus enterprise page clarifies the edition boundary: OpenAPI backward compatibility is available in open source, and additional protocol coverage belongs to enterprise.

Key options in the official docs include \`--target-path\`, \`--base-branch\`, and \`--repo-dir\`. A useful pull-request gate compares the current branch to \`origin/main\` after fetching enough history.

\`\`\`bash
docker run --rm \\
  -v "\${PWD}:/repo:rw" \\
  --user "\${UID}:\${GID}" \\
  specmatic/specmatic backward-compatibility-check \\
  --repo-dir=/repo \\
  --base-branch=origin/main
\`\`\`

Specmatic's documented compatibility rules are easy to explain to product teams. For requests, do not add mandatory fields that old consumers do not send. For responses, do not remove mandatory fields old consumers rely on. Do not change value types. There are exceptions and details, but those three rules catch many breaking changes before they reach a shared environment.

| Change | Compatibility | Why |
| --- | --- | --- |
| Add optional request field | Usually compatible | Existing consumers can omit it |
| Add mandatory request field | Incompatible | Existing consumers do not send it |
| Remove mandatory response field | Incompatible | Existing consumers may parse or display it |
| Add optional response field | Usually compatible | Existing consumers can ignore it |
| Change \`sku\` from string to integer | Incompatible | Existing consumers typed it as a string |
| Add new endpoint | Usually compatible | Existing consumers are not forced to call it |

The common trap is versioning the URL but still breaking old consumers behind the same path. A \`/v2\` route can help, but compatibility is about what callers experience, not only path naming. Run the check on every contract change, and require an explicit exception process when the break is intentional.

## GitHub Actions CI Gate

The official CI docs show a useful pipeline shape: lint specifications, validate examples, check backward compatibility, run provider and consumer builds, and upload reports. This version uses current GitHub Action majors and avoids relying on shell variables inside \`with\` inputs.

\`\`\`yaml
name: api-contracts

on:
  pull_request:
    paths:
      - "contracts/**"
      - "src/**"
      - "specmatic.yaml"

jobs:
  specmatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: 17

      - name: Validate OpenAPI examples
        run: |
          docker run --rm \\
            -v "\${{ github.workspace }}:/usr/src/app" \\
            -w /usr/src/app \\
            specmatic/specmatic examples validate --specs-dir=contracts

      - name: Check backward compatibility
        run: |
          docker run --rm \\
            -v "\${{ github.workspace }}:/repo:rw" \\
            -w /repo \\
            --user "\$(id -u):\$(id -g)" \\
            specmatic/specmatic backward-compatibility-check --base-branch=origin/main

      - name: Start provider
        run: ./gradlew bootRun --args='--server.port=8080' &

      - name: Wait for provider health
        run: |
          for attempt in 1 2 3 4 5 6 7 8 9 10; do
            curl -fsS http://localhost:8080/actuator/health && exit 0
            sleep 3
          done
          exit 1

      - name: Run provider contract tests
        run: |
          docker run --rm \\
            -v "\${{ github.workspace }}:/usr/src/app" \\
            -w /usr/src/app \\
            --network=host \\
            specmatic/specmatic test --host=localhost --port=8080

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: specmatic-reports-\${{ github.run_id }}
          path: build/reports/specmatic
\`\`\`

Two details matter. First, fetch full history or at least the base branch, because compatibility checks need a comparison target. Second, wait for the provider with a real health check instead of \`sleep 30\` alone. A fixed sleep creates noisy failures on slow runners and hides startup failures on fast failures.

## Debugging A Realistic Failure

Imagine a pull request changes \`Order.totalCents\` from integer cents to a decimal string named \`total\`. Unit tests pass because the provider maps both fields internally. The frontend consumer tests pass because mocks still use old fixtures. Specmatic fails the backward compatibility check and provider contract test.

The diagnosis should proceed in order:

1. Read the compatibility failure and identify the old response field.
2. Confirm whether any consumer contract or example uses \`totalCents\`.
3. Check whether the new field is additive or replacing the old field.
4. If replacing, classify it as a breaking change and require a versioning or migration plan.
5. If additive, keep \`totalCents\` in the response while adding \`total\`.
6. Add an example that includes both fields so future mocks preserve consumer behavior.

\`\`\`yaml
components:
  schemas:
    Order:
      type: object
      required:
        - id
        - status
        - totalCents
      properties:
        id:
          type: string
          pattern: "^ORD-[0-9]{6}$"
        status:
          type: string
          enum:
            - pending
            - shipped
            - cancelled
        totalCents:
          type: integer
          minimum: 0
        total:
          type: string
          pattern: "^[0-9]+\\\\.[0-9]{2}$"
\`\`\`

In a double-quoted YAML string the backslash itself must be escaped, so Specmatic receives the pattern \`^[0-9]+\\.[0-9]{2}$\`. The important QA point is the compatibility decision: additive change with old field preserved is usually safe, replacement is not.

## Specmatic Versus Schemathesis And Pact

Specmatic, Schemathesis, and Pact can all belong in a mature API-testing strategy, but they answer different questions. Specmatic starts from API specifications as executable contracts. Schemathesis is strong for property-based and fuzz-style OpenAPI testing. Pact is consumer-driven contract testing where consumer expectations are published and verified by providers.

| Tool | Primary source of truth | Strongest use | Watch out for |
| --- | --- | --- | --- |
| Specmatic | OpenAPI and other supported specs | Contract-driven development, provider tests, stubs, compatibility | Spec quality determines test quality |
| Schemathesis | OpenAPI schema | Negative, generative, and edge-case exploration | Generated failures need triage discipline |
| Pact | Consumer contracts | Consumer-driven provider verification | Requires broker and consumer ownership maturity |

If your team already has high-quality OpenAPI contracts and wants mocks, provider tests, and compatibility gates from the same artifact, start with Specmatic. If you find many schema boundary bugs, add Schemathesis. If consumer teams need to publish precise expectations that differ from a broad OpenAPI spec, add Pact or a similar consumer-driven workflow.

## Adoption Plan For QA Teams

Start small. Pick one API with a committed owner, a stable OpenAPI file, and at least one active consumer. Add examples for the top operations, run provider contract tests locally, then add backward compatibility in CI. Once the first API is stable, introduce mock server usage for consumers and JUnit integration if the provider is JVM-based.

| Week | Goal | Done when |
| --- | --- | --- |
| 1 | Contract cleanup | Required fields, examples, and error responses are explicit |
| 2 | Local provider test | \`specmatic test\` runs against a developer service |
| 3 | Pull-request compatibility gate | Breaking contract changes fail before merge |
| 4 | Consumer stub workflow | One consumer runs tests against \`specmatic mock\` |
| 5 | Report publishing | CI artifacts include useful contract-test output |
| 6 | Ownership model | Provider and consumer teams know who fixes each failure class |

The ownership model is the real adoption test. If every failure goes to QA, the system will stall. Schema mismatches belong to provider teams, stale examples belong to contract owners, consumer misuse belongs to consumer teams, and ambiguous API behavior belongs to product plus architecture. QA should orchestrate evidence and quality gates, not silently patch every spec.

## Frequently Asked Questions

### Is Specmatic open source enough for OpenAPI contract testing?

Yes, for core OpenAPI and REST contract testing, mock server usage, backward compatibility checks, example validation, and JUnit output, the open-source edition covers a strong workflow. The official comparison page lists additional enterprise capabilities for AsyncAPI, GraphQL, gRPC, Arazzo workflows, Avro, Redis, JDBC, advanced reports, and richer API testing. If your proof of concept is OpenAPI-only, OSS is a reasonable starting point. If your platform needs those extra protocols, evaluate enterprise early.

### Should Specmatic replace Postman collections?

Not automatically. Specmatic is better when the OpenAPI contract should drive provider tests, mocks, and compatibility checks. Postman collections can still be useful for exploratory workflows, manual debugging, environment-specific calls, and team demos. The risk with collection-first testing is drift: requests and assertions evolve separately from the OpenAPI document. If you keep both, decide which artifact is authoritative and add a review step when they disagree.

### What makes a Specmatic failure actionable?

An actionable failure names the contract location, request shape, expected response, and actual provider behavior. QA should attach the OpenAPI file version, provider build, command output, and report artifact to the defect. Then classify the failure: implementation bug, stale spec, intentional breaking change, missing example, or environment setup issue. Without that classification, teams waste time arguing whether the tool is wrong instead of deciding which contract boundary changed.

### Can Specmatic test non-OpenAPI protocols?

Yes, but support depends on edition and protocol. The official comparison page lists OpenAPI or REST, WSDL or SOAP, and MCP in open source. It lists AsyncAPI, GraphQL, gRPC, Arazzo workflows, Avro support, Redis stubbing, and JDBC stubbing as enterprise additions. For an OpenAPI-first QA team, that distinction may not matter. For a platform team with events, GraphQL, and gRPC, it should be part of tool selection and budgeting from day one.
`,
};
