import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Tracetest Trace-Based Testing with OpenTelemetry for QA Engineers',
  description: 'Tracetest trace-based testing guide for QA teams: write OpenTelemetry assertions, wire CI, diagnose missing spans, and ship safer microservices.',
  date: '2026-09-24',
  category: 'API Testing',
  content: `
# Tracetest Trace-Based Testing with OpenTelemetry for QA Engineers

Tracetest trace-based testing lets a QA team assert what happened inside a distributed request, not just what came back over HTTP. Instead of stopping at "the API returned 200", a Tracetest check can prove that the payment service called the ledger, the queue publish happened once, a database span stayed under a latency budget, and every selected gRPC span returned the expected status.

The current Tracetest docs describe it as a trace-based testing tool for integration and end-to-end testing with OpenTelemetry traces. The important practical detail is that Tracetest does not replace Playwright, Postman, k6, or service-level unit tests. It fills the gap those tools leave when a request fans out across services, workers, queues, and third-party calls. If your system is already instrumented with OpenTelemetry, trace assertions become a precise way to test side effects that are otherwise hard to observe.

Check the project status before you plan around it. On October 31, 2024, Kubeshop announced that it was discontinuing the commercial Tracetest Cloud and Enterprise application, while the open-source Tracetest Core stays available at https://github.com/kubeshop/tracetest. The latest GitHub release is still v1.7.1 from October 2024. In practice that means one deployment model for new adopters: you run Tracetest Core yourself, as a container next to the system under test, and you treat it as a stable but slow-moving tool. Pin the image version, keep your assertions close to OpenTelemetry semantic conventions, and the trace contracts you write stay portable even if you later move to another trace-assertion tool.

## The Testing Layer Tracetest Actually Adds

Most API tests observe a boundary. They send a request and evaluate a response. That is useful, but it is blind to internal behavior unless the service exposes debug fields, writes a database row you can query, or emits a separate event you can poll. Tracetest starts with a trigger, waits for the trace, then evaluates spans and span attributes.

That gives QA engineers a middle layer between black-box API testing and white-box implementation testing. It is not as brittle as asserting private functions, but it is more meaningful than treating a distributed workflow as one response body. The contract becomes: "When this transaction runs, the trace must contain these observable behaviors."

| Test question | Traditional API assertion | Tracetest trace assertion |
|---|---|---|
| Did the gateway accept the request? | Status is \`200\` | HTTP trigger response is successful |
| Did downstream inventory run? | Usually invisible | A span from the inventory service exists |
| Did the database query stay fast? | Usually invisible | Database span duration is below the limit |
| Did an async worker publish an event? | Poll a side channel | Messaging span exists with expected attributes |
| Did instrumentation regress? | Rarely tested | Required OpenTelemetry attributes are present |

This is especially helpful when AI coding agents are modifying tests. Agents are good at adding endpoint calls, but they often miss the hidden contract inside a microservice flow. A trace-based test gives the agent a richer target: selectors, span names, attributes, and explicit assertions.

## A Minimal YAML Test That Proves More Than Status

Tracetest test definitions are YAML resources. The docs show \`type: Test\`, a \`spec\` block, a \`trigger\`, and \`specs\` entries with selectors and assertions. HTTP and gRPC are common triggers, and the docs also list trigger integrations such as trace IDs and external runners.

\`\`\`yaml
type: Test
spec:
  id: checkout-create-order
  name: Checkout creates an order
  description: Verifies API response, database work, and payment delegation
  trigger:
    type: http
    httpRequest:
      url: http://checkout-api:8080/orders
      method: POST
      headers:
        - key: Content-Type
          value: application/json
      body: '{"sku":"sku_123","quantity":1,"cardToken":"tok_test_visa"}'
  specs:
    - name: API accepted the order
      selector: span[tracetest.span.type="http" name="POST /orders"]
      assertions:
        - attr:http.response.status_code = 201
    - name: Order row is written once
      selector: span[tracetest.span.type="database" db.operation="INSERT" db.sql.table="orders"]
      assertions:
        - attr:tracetest.selected_spans.count = 1
    - name: Payment call is delegated
      selector: span[tracetest.span.type="http" name="POST /payments/authorize"]
      assertions:
        - attr:http.response.status_code = 200
\`\`\`

The selector syntax is the part your team will refine most. A selector such as \`span[tracetest.span.type="database"]\` targets spans by attributes. Assertions then evaluate span attributes using the \`attr:\` prefix. That two-step model is cleaner than burying everything in one expression because the test tells reviewers both the span population and the property being checked.

What people get wrong: they create a broad selector first and then write an assertion that happens to pass on any span in the group. Broad selectors are fine for global rules, such as "all database spans are under 500ms", but business assertions should select the specific operation. Otherwise a new harmless span can make a test look stable while the intended span disappeared.

## Trigger Choice Changes the Failure Signal

The trigger is not just plumbing. It defines where the test begins and what evidence Tracetest can correlate. The docs list HTTP, gRPC, Kafka, trace ID, Playwright, Cypress, k6, and Artillery-style triggers or integrations. For QA teams, the simplest rule is to trigger at the same boundary the user story depends on, then assert deeper behavior with spans.

| Trigger style | Good use | Risk to manage |
|---|---|---|
| HTTP request | REST and GraphQL workflows | Missing trace propagation from gateway to services |
| gRPC request | Service-to-service contracts | Return code attributes must be consistently emitted |
| Trace ID | Reusing an externally produced transaction | You need reliable trace ID capture from the upstream tool |
| Playwright or Cypress integration | UI flow produces backend traces | Browser success can hide backend side effects unless trace specs are specific |
| k6 or Artillery integration | Load or smoke traffic with trace assertions | Sampling and cardinality can make traces incomplete |

For gRPC, use the same structure but switch the trigger block. Keep the request simple and put the deep checks in \`specs\`.

\`\`\`yaml
type: Test
spec:
  id: grpc-price-quote
  name: Pricing quote returns a valid decision
  trigger:
    type: grpc
    grpc:
      address: pricing-api:9090
      method: pricing.PricingService/GetQuote
      request: '{"sku":"sku_123","region":"US"}'
  specs:
    - name: gRPC call completed successfully
      selector: span[tracetest.span.type="rpc" rpc.method="GetQuote"]
      assertions:
        - attr:rpc.grpc.status_code = 0
    - name: Discount rule evaluated
      selector: span[name="rules.evaluate" rule.family="discount"]
      assertions:
        - attr:rule.decision = "eligible"
\`\`\`

If your actual docs version names a gRPC request object differently in exported YAML, prefer exporting a working test from the UI and committing that shape. Tracetest YAML is easiest to keep correct when it is round-tripped through the product instead of hand-invented from memory.

## Connect Traces Before You Blame Assertions

A trace-based test can only assert spans that arrive. Tracetest Core can either receive traces directly over OTLP or read them from a tracing backend it is configured to query; the docs and examples cover Jaeger, Grafana Tempo, OpenSearch, and direct OTLP ingestion. The pattern is always the same: the app emits OpenTelemetry traces, a collector forwards them, and Tracetest fetches or ingests enough trace data to evaluate the run. In the repository's quick-start example, the collector exports straight to the Tracetest Core service on port 4317.

\`\`\`yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:
    timeout: 100ms

exporters:
  otlp/tracetest:
    endpoint: tracetest:4317
    tls:
      insecure: true
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces/tracetest:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tracetest]
    traces/tempo:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
\`\`\`

For CI, sampling is the silent killer. Production sampling can be rational, but test traffic needs deterministic evidence. In a test environment, either sample the test traces at 100 percent or use a sampling rule that always keeps requests with a test header such as \`x-test-run-id\`. Without that, a flaky Tracetest suite may really be a trace retention problem.

## Selectors Are a Contract, Not a Search Box

Selectors should survive reasonable refactors while still failing when the contract breaks. Avoid selectors that depend only on a generated span ID or a highly variable SQL statement. Prefer stable semantic attributes: service name, span type, route template, messaging destination, rpc method, database operation, and domain attributes you intentionally emit.

| Selector target | Stable example | Brittle example |
|---|---|---|
| HTTP route | \`span[http.route="/orders/{id}"]\` | \`span[name="GET /orders/abc123"]\` |
| Database write | \`span[db.operation="INSERT" db.sql.table="orders"]\` | \`span[name="INSERT INTO orders VALUES ..."]\` |
| Queue publish | \`span[messaging.destination.name="order.created"]\` | \`span[name="send message"]\` |
| Domain rule | \`span[rule.name="fraud-screen"]\` | \`span[name="function call"]\` |

Good selectors also make AI-generated maintenance safer. If an agent changes the checkout endpoint, it can see that \`Payment call is delegated\` and \`Order row is written once\` are not arbitrary details. They are part of the behavior the test is protecting.

## Assertions That Catch Real Regressions

The assertion language gives you a way to check duration, status, counts, and span attributes. The official docs use examples such as \`attr:tracetest.span.duration < 100ms\` and \`attr:http.response.status_code = 200\`. Treat that as a starting point, then add assertions that map to failure modes your team has actually had.

\`\`\`yaml
type: Test
spec:
  id: inventory-reservation
  name: Inventory reservation is idempotent
  trigger:
    type: http
    httpRequest:
      url: http://inventory-api:8080/reservations
      method: POST
      headers:
        - key: Content-Type
          value: application/json
        - key: Idempotency-Key
          value: qa-run-001
      body: '{"sku":"sku_123","quantity":2}'
  specs:
    - name: Reservation insert happens once
      selector: span[tracetest.span.type="database" db.operation="INSERT" db.sql.table="reservations"]
      assertions:
        - attr:tracetest.selected_spans.count = 1
    - name: No compensation path ran
      selector: span[name="inventory.compensate"]
      assertions:
        - attr:tracetest.selected_spans.count = 0
    - name: Reservation latency remains acceptable
      selector: span[name="inventory.reserve"]
      assertions:
        - attr:tracetest.span.duration < 750ms
\`\`\`

The count checks above are more valuable than a plain status check because they test side effects. A response can be successful while two reservation writes happen, a compensation span runs, or a retry path hides a downstream failure. Those are exactly the bugs trace-based testing is good at exposing.

## Variable Sets Keep Tests Portable

The Tracetest CI docs show \`VariableSet\` resources and the \`--vars\` CLI option. Use them for environment-specific base URLs, credentials, tenant IDs, and test data. That keeps the test definition focused on behavior while the pipeline injects environment values.

\`\`\`yaml
type: VariableSet
spec:
  id: checkout-ci
  name: Checkout CI variables
  description: Values used by the checkout trace suite in CI
  values:
    - key: CHECKOUT_BASE_URL
      value: http://checkout-api:8080
    - key: TEST_CARD_TOKEN
      value: tok_test_visa
      type: secret
\`\`\`

\`\`\`yaml
type: Test
spec:
  id: checkout-with-vars
  name: Checkout using CI variables
  trigger:
    type: http
    httpRequest:
      url: \${var:CHECKOUT_BASE_URL}/orders
      method: POST
      headers:
        - key: Content-Type
          value: application/json
      body: '{"sku":"sku_123","quantity":1,"cardToken":"\${var:TEST_CARD_TOKEN}"}'
  specs:
    - name: Payment authorization succeeded
      selector: span[name="POST /payments/authorize"]
      assertions:
        - attr:http.response.status_code = 200
\`\`\`

Keep secrets out of test YAML. Also avoid using variable sets as a dumping ground for assertions. If a value changes the expected behavior, put that expectation in the test name or suite name so a reviewer understands why staging and production differ.

## CI Wiring That Agents Can Maintain

The Tracetest README shows \`tracetest run test --file /path/to/pokeshop_import.yaml\`, while docs and examples also use the short \`-f\` form. In CI there is no hosted service to call, so the job starts Tracetest Core itself. The compose file below is yours to write: the \`kubeshop/tracetest\` image on port 11633 with its Postgres database, an OpenTelemetry Collector, and the services under test, modeled on the \`examples/quick-start-pokeshop\` folder in the Tracetest repository.

\`\`\`yaml
name: trace-contracts

on:
  pull_request:
  workflow_dispatch:

jobs:
  tracetest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Start Tracetest Core, the collector, and the services under test
        run: docker compose -f ./tracetest/docker-compose.yml up -d --wait

      - name: Install Tracetest CLI
        run: curl -L https://raw.githubusercontent.com/kubeshop/tracetest/main/install-cli.sh | bash -s

      - name: Point the CLI at Tracetest Core
        run: tracetest configure --server-url http://localhost:11633

      - name: Apply variable set
        run: tracetest apply variableset --file ./tracetest/vars.ci.yaml

      - name: Run checkout trace contract
        run: tracetest run test -f ./tracetest/checkout.yaml --vars checkout-ci --required-gates test-specs -o pretty -j tracetest-junit.xml

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: tracetest-junit
          path: tracetest-junit.xml
\`\`\`

The \`-j\` flag writes JUnit XML, so the trace contract shows up in the same test-report tooling as your other suites. If you let Claude Code, Cursor, or Copilot generate Tracetest YAML, ask it to do three checks before it opens a PR: selectors must target stable attributes, assertions must prove side effects rather than only statuses, and every CLI flag it uses must appear in \`tracetest run --help\`.

## Suites for Setup, Teardown, and Chained Evidence

Tracetest test suites let you group tests and pass outputs from one test to later tests. The docs describe outputs as values extracted from a span that can be used by subsequent tests. That is useful for workflows such as "create account, submit order, verify fulfillment, delete account" where each step is independently meaningful but the full chain matters.

\`\`\`yaml
type: Test
spec:
  id: create-tenant
  name: Create tenant
  trigger:
    type: http
    httpRequest:
      url: http://admin-api:8080/tenants
      method: POST
      headers:
        - key: Content-Type
          value: application/json
      body: '{"name":"trace-ci-tenant"}'
  specs:
    - name: Tenant write succeeded
      selector: span[db.sql.table="tenants" db.operation="INSERT"]
      assertions:
        - attr:tracetest.selected_spans.count = 1
  outputs:
    - name: TENANT_ID
      selector: span[name="POST /tenants"]
      value: attr:http.response.body | json_path '.id'
\`\`\`

Use suites sparingly. A suite that models one business journey is excellent. A suite that chains every backend test in the repository creates slow feedback and makes failures harder to localize. For pull requests, run focused suites. For nightly builds, run longer cross-service journeys and instrumentation-quality checks.

## Diagnosing the Classic Missing Span Failure

A realistic failure mode looks like this: the HTTP assertion passes, but the database selector finds no spans. The app clearly wrote the row because a later API call can read it. The Tracetest failure says the selected span count is zero.

Diagnose it in this order:

1. Confirm the service emitting the database span is instrumented in the CI image, not only in local development.
2. Confirm context propagation from the gateway to the downstream service. A write can happen in a different trace if headers are dropped.
3. Check sampling rules. A successful request with a partial trace usually points to collector or SDK sampling.
4. Inspect the actual trace in Tracetest or your backend. The span may exist with different semantic attributes than your selector expects.
5. Export the working test from the UI after selecting the span. Compare the generated selector to the hand-written YAML.

\`\`\`yaml
type: Test
spec:
  id: diagnostic-selector-check
  name: Diagnostic selector check
  trigger:
    type: http
    httpRequest:
      url: http://checkout-api:8080/orders
      method: POST
      headers:
        - key: Content-Type
          value: application/json
      body: '{"sku":"sku_123","quantity":1}'
  specs:
    - name: Any checkout database spans exist
      selector: span[tracetest.span.type="database" service.name="checkout-api"]
      assertions:
        - attr:tracetest.selected_spans.count > 0
\`\`\`

That diagnostic test is intentionally broad. Do not keep it as the final business check. Use it to prove whether trace collection works, then tighten the selector back to the operation the product contract requires.

## Where Tracetest Belongs in a QA Portfolio

Trace-based testing is strongest where a transaction crosses boundaries. It is weaker where the behavior lives entirely inside a deterministic function or a UI component. A mature QA portfolio uses it selectively.

| Layer | Better primary tool | When to add Tracetest |
|---|---|---|
| Pure function rules | Unit tests | Rarely, unless a rule must emit a specific span |
| Single service API | API tests plus contract tests | When datastore, cache, or queue side effects matter |
| Microservice workflow | Tracetest plus API trigger | Default choice for cross-service behavior |
| Browser journey | Playwright | Add Tracetest when UI success must prove backend side effects |
| Load test | k6 or Artillery | Add Tracetest for sampled trace assertions during smoke load |

If your team is building a reusable agent workflow, pair Tracetest with a guide on [observability testing and trace assertion](/blog/observability-testing-trace-assertion). If the system under test has more than a few independently deployable services, connect the suite design to broader [microservices testing strategies](/blog/microservices-testing-strategies) so trace checks complement contracts, synthetic checks, and consumer-driven tests.

## Review Checklist Before You Trust a Trace Test

Before a trace test becomes a merge gate, review it like production code. Ask whether the trigger represents a real user or service boundary. Check that selectors use stable semantic attributes. Confirm that the test proves a side effect, not just a status. Run it twice to catch dependence on leftover state. Run it once with the downstream dependency broken to make sure it fails for the right reason.

Also review instrumentation as part of test code. If a service emits generic span names, missing routes, or no domain attributes, trace tests will either become too broad or too brittle. The fix is not always in the Tracetest YAML. Sometimes the correct fix is adding better OpenTelemetry attributes in the application.

Finally, make failure output actionable for the next engineer. A test named \`API works\` with \`span[tracetest.span.type="http"]\` tells almost nothing. A test named \`Payment authorization writes one ledger hold\` with a selector for the ledger insert tells the reviewer what behavior disappeared.

## Frequently Asked Questions

### Is Tracetest a replacement for Postman or Playwright?

No. Tracetest is better understood as a trace-aware assertion layer for integration and end-to-end flows. Postman-style API tests are still useful for request and response contracts. Playwright is still the better primary tool for browser behavior. Tracetest becomes valuable when a request crosses services and the test must prove side effects, downstream calls, queue publishes, database work, or instrumentation quality.

### Which Tracetest deployment should a QA team start with?

Tracetest Core, because it is the only option left for new users. Kubeshop discontinued the commercial Cloud and Enterprise application in late 2024, and older docs pages that still describe those tiers are historical. Run Core in Docker Compose locally and in CI, or with the official Helm chart in a shared test cluster. Pin the image version, back up the Postgres database if test history matters to you, and keep test YAML in version control so your trace contracts do not depend on any one server.

### Why do trace-based tests become flaky?

The common causes are incomplete trace collection, sampling, unstable selectors, async work that finishes after the polling window, and environment-specific instrumentation differences. Diagnose collection before rewriting assertions. If the trace is missing spans, the YAML cannot fix that. If the spans exist but the selector misses them, export or inspect the trace and target stable semantic attributes rather than generated names or one-off IDs.

### Should every microservice endpoint have a Tracetest test?

No. Use Tracetest where internal evidence changes the quality of the signal. A simple health endpoint does not need trace assertions. A checkout, fulfillment, identity, or billing workflow probably does. The best candidates have meaningful downstream behavior, expensive regressions, and observable spans that can express the contract clearly. Keep the suite focused enough that failures remain fast to understand.
`,
};
