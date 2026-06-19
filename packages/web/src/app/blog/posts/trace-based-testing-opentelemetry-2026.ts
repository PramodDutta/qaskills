import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Trace-Based Testing with OpenTelemetry: The 2026 Practical Guide',
  description:
    'Learn trace-based testing with OpenTelemetry in 2026: assert on distributed-trace spans, instrument services, write Tracetest specs, and integrate with CI.',
  date: '2026-06-19',
  category: 'Guide',
  content: `
# Trace-Based Testing with OpenTelemetry: The 2026 Practical Guide

Traditional integration testing asks one question: did the API return the right response? In a monolith that was enough. In a microservices architecture it is dangerously incomplete. A request that returns \`200 OK\` can still have hit the wrong database, skipped a cache it should have used, retried an upstream call three times, or fired an event to the wrong queue — and a response-only assertion sees none of it. **Trace-based testing with OpenTelemetry** closes that gap by letting you assert not just on the final response but on the *distributed trace* the request produced: the actual spans, their attributes, their timing, and their parent-child relationships across every service the request touched.

This guide is a hands-on walkthrough of trace-based testing as it works in 2026. We will define what it is and why it exists, instrument a real service with the OpenTelemetry SDK, write trace-based assertions against span attributes and child spans using Tracetest, survey the tooling landscape (Tracetest, Malabi, Grafana), and wire the whole thing into CI. Every code sample is runnable. By the end you will understand how to turn the invisible internal behavior of your distributed system into something you can write a failing test against — which is the entire point. If you are building out a modern testing strategy, this pairs naturally with our [AI-augmented software testing 2026 guide](/blog/ai-augmented-software-testing-2026-guide), since both push assertions deeper than the response body.

## What Trace-Based Testing Actually Is

A distributed trace is the record of a single request as it flows through your system. Each unit of work — an HTTP handler, a database query, a call to another service, a cache lookup — becomes a **span**. Spans carry a name, a start and end time, a set of key-value **attributes** (like \`http.status_code\` or \`db.system\`), and a link to their parent span. Stitched together, the spans form a tree that shows exactly what happened and in what order.

Trace-based testing makes assertions against that tree. Instead of only checking the response, you trigger an operation, wait for its trace to arrive, select specific spans, and assert on them: "a span named \`SELECT users\` exists," "the \`http.status_code\` on the downstream payment call equals 200," "no span took longer than 500ms," "the cache span has \`cache.hit = true\`." You are testing the *behavior of the system internals*, not just the edge.

## Why Microservices Need It

Consider a checkout request that touches an API gateway, an orders service, an inventory service, a payment service, and a Postgres database. A response-only test that sees \`201 Created\` is blind to a host of real bugs:

- The orders service called inventory **twice** because of a missing idempotency guard.
- Payment succeeded but the event to the fulfillment queue never fired.
- A cache that should have served the product lookup was bypassed, hammering the database.
- A downstream call silently fell back to a default and returned stale data.

Every one of these produces a correct-looking response and a wrong trace. Trace-based testing catches them because it asserts on the spans those operations emit. In a microservices world, **the response is a summary; the trace is the truth.**

## Trace-Based vs Traditional Testing

The two approaches are complementary, but their reach is very different. The table makes the contrast concrete.

| Dimension | Traditional integration test | Trace-based test |
|---|---|---|
| What it asserts on | Response status and body | Spans, attributes, timing, span tree |
| Sees internal calls | No | Yes — every instrumented hop |
| Catches wrong DB / skipped cache | No | Yes |
| Detects N+1 / duplicate calls | No | Yes (count spans) |
| Verifies async side effects | Hard | Yes (assert event-publish span) |
| Setup cost | Low | Requires OTel instrumentation |
| Best for | Contract / happy-path checks | Microservice behavior verification |

You keep your traditional tests for contracts and happy paths. You add trace-based tests where the *how* matters as much as the *what* — which, in distributed systems, is almost everywhere.

## OpenTelemetry Signal Types

OpenTelemetry emits three signal types. Trace-based testing is built on traces, but it helps to know where each fits.

| Signal | What it captures | Role in trace-based testing |
|---|---|---|
| Traces | Request flow as a span tree | Primary — the thing you assert on |
| Metrics | Aggregated numeric measurements | Secondary — trends, SLOs |
| Logs | Discrete timestamped events | Context — correlate via trace ID |

For testing, traces are the star. Metrics and logs become far more useful once they share a trace ID, because you can pivot from a failing span straight to the log line it produced.

## Instrumenting a Service with the OpenTelemetry SDK

Trace-based testing requires your services to emit spans. The good news: OpenTelemetry auto-instrumentation covers the common cases — HTTP frameworks, database drivers, and HTTP clients — with almost no code. Here is a Node.js service instrumented from scratch.

First install the dependencies:

\`\`\`bash
npm install @opentelemetry/sdk-node \\
  @opentelemetry/auto-instrumentations-node \\
  @opentelemetry/exporter-trace-otlp-http
\`\`\`

Create a \`tracing.js\` file that boots the SDK before your app loads:

\`\`\`javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');
const {
  OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  serviceName: 'orders-service',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
\`\`\`

Load it before anything else by requiring it on startup:

\`\`\`bash
node --require ./tracing.js server.js
\`\`\`

That alone produces spans for every incoming HTTP request, every Postgres query, and every outbound fetch. For business-specific spans, add manual instrumentation:

\`\`\`javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('orders-service');

async function reserveInventory(orderId, items) {
  return tracer.startActiveSpan('reserveInventory', async (span) => {
    span.setAttribute('order.id', orderId);
    span.setAttribute('order.item_count', items.length);
    try {
      const result = await inventoryClient.reserve(items);
      span.setAttribute('inventory.reserved', result.reserved);
      return result;
    } finally {
      span.end();
    }
  });
}
\`\`\`

Those custom attributes — \`order.id\`, \`inventory.reserved\` — become the hooks your tests assert against. The same pattern works in Python with \`opentelemetry-instrument python server.py\` and the \`opentelemetry-api\` package; the concepts are identical.

## Tooling: Tracetest, Malabi, and Grafana

Three tools dominate the trace-based testing space in 2026, each with a distinct posture.

**Tracetest** is the most complete dedicated solution. It triggers an operation (HTTP, gRPC, or via your existing test runner), collects the resulting trace from your OpenTelemetry pipeline, and runs assertions written in a declarative spec against any span. It has a UI for building selectors visually and a CLI for CI. This is the tool most teams adopt first.

**Malabi** is a lighter, code-first library. It captures spans inside the test process and lets you assert on them in your existing test framework (Jest, Mocha). It is excellent when you want trace assertions to live right next to your unit and integration tests without standing up extra infrastructure.

**Grafana** (with Tempo for trace storage) is not a testing tool per se, but it is where you store, visualize, and explore traces. Tracetest can pull traces from Tempo, so Grafana often sits underneath your testing pipeline as the trace backend and debugging surface when a test fails.

For most teams the stack is: instrument with the OTel SDK, store traces in Tempo, and assert with Tracetest. Malabi is the alternative when you want everything in-process.

## Writing Trace-Based Assertions with Tracetest

A Tracetest test is a YAML spec. It defines a trigger, then one or more assertions, each scoped by a **selector** that picks the spans you care about. Here is a complete spec for the checkout flow that verifies the response *and* the internal behavior.

\`\`\`yaml
type: Test
spec:
  id: checkout-flow
  name: Checkout creates order and reserves inventory
  trigger:
    type: http
    httpRequest:
      method: POST
      url: http://localhost:8080/checkout
      headers:
        - key: Content-Type
          value: application/json
      body: '{"productId": "sku-42", "quantity": 2}'
  specs:
    # Assert on the root span: the response succeeded
    - selector: span[tracetest.span.type="http" name="POST /checkout"]
      assertions:
        - attr:http.status_code = 201
        - attr:tracetest.span.duration < 800ms

    # Assert a database write span actually happened
    - selector: span[tracetest.span.type="database" db.operation="INSERT"]
      assertions:
        - attr:tracetest.selected_spans.count = 1
        - attr:db.system = "postgresql"

    # Assert inventory was reserved exactly once (no duplicate calls)
    - selector: span[name="reserveInventory"]
      assertions:
        - attr:tracetest.selected_spans.count = 1
        - attr:inventory.reserved = "true"

    # Assert the fulfillment event was published
    - selector: span[name="publish fulfillment.requested"]
      assertions:
        - attr:tracetest.selected_spans.count = 1
\`\`\`

Read what this spec proves. The first block confirms the response is \`201\` and the whole request finished under 800ms. The second confirms a single Postgres \`INSERT\` ran — catching both a missing write and an accidental duplicate. The third confirms inventory was reserved exactly once, directly catching the idempotency bug a response-only test would miss. The fourth confirms the async fulfillment event actually fired. **None of these is visible in the HTTP response.** That is the entire value proposition in one file.

Run it from the CLI:

\`\`\`bash
tracetest run test --file ./checkout-flow.yaml --output pretty
\`\`\`

Tracetest triggers the request, waits for the trace, applies each selector, evaluates the assertions, and prints a pass/fail per assertion with the offending span if one fails.

## Span Selectors and Assertion Patterns

The power of trace-based testing lives in selectors. A few patterns cover most needs:

- **Span existence:** assert \`tracetest.selected_spans.count = 1\` to prove a span happened (or \`= 0\` to prove it did not — useful for "the cache was hit, so no DB span fired").
- **Attribute equality:** \`attr:http.status_code = 200\` or \`attr:db.system = "postgresql"\` to verify a span did the right thing.
- **Child-span relationships:** select by parent name to assert that a specific operation produced the expected downstream calls — e.g. that \`reserveInventory\` made exactly one HTTP call to the inventory service.
- **Timing budgets:** \`attr:tracetest.span.duration < 500ms\` to enforce latency contracts per span, catching a slow query before it reaches production.
- **Negative assertions:** counting spans to prove an N+1 query pattern is absent (\`db.query\` count equals 1, not 10).

This vocabulary lets you encode architectural intent as tests. "The cache must serve repeat reads" becomes "on the second request, the DB span count is 0." That is an assertion you simply cannot write without traces.

## Integrating Trace-Based Tests into CI

Trace-based tests run in CI exactly like any other test, with one prerequisite: the system under test must export traces to a backend the test runner can read. The common pattern uses Docker Compose to stand up your services plus an OpenTelemetry Collector and Tracetest, then runs the specs.

\`\`\`yaml
# .github/workflows/trace-tests.yml
name: Trace-Based Tests
on: [push, pull_request]

jobs:
  trace-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start system under test
        run: docker compose -f docker-compose.test.yml up -d

      - name: Wait for services
        run: ./scripts/wait-for-healthy.sh

      - name: Install Tracetest CLI
        run: curl -L https://raw.githubusercontent.com/kubeshop/tracetest/main/install-cli.sh | bash

      - name: Run trace-based tests
        run: tracetest run test --file ./tests/checkout-flow.yaml --output pretty
\`\`\`

The key design choice: your Compose file wires every service's \`OTEL_EXPORTER_OTLP_ENDPOINT\` to a Collector, and Tracetest reads traces from that same Collector. When an assertion fails, the CI log shows exactly which span and attribute broke — and because the trace is stored, an engineer can open it in Grafana Tempo to see the full picture. This makes failures self-explaining in a way response-diff failures rarely are. Combining trace assertions with resilient automation practices, like those in our [self-healing test automation 2026 guide](/blog/self-healing-test-automation-2026-guide), keeps the whole suite low-maintenance.

## When to Reach for Trace-Based Testing

Trace-based testing is not a replacement for unit tests or contract tests — it is a layer you add where internal behavior matters. Reach for it when: you have a microservices architecture with multiple hops per request; you have caching, retries, or idempotency logic whose correctness is invisible in the response; you have async side effects (events, queues) that must fire; or you are chasing performance regressions and want per-span latency budgets enforced. Skip it for simple CRUD endpoints where the response fully describes the behavior.

The instrumentation cost is real but one-time, and auto-instrumentation does most of the work. Once your services emit traces — which you want anyway for production observability — the same telemetry powers both your dashboards and your tests. That dual use is what makes trace-based testing economical: you are testing on the exact signals you already monitor in production. Explore our [QA skills directory](/skills) for OpenTelemetry and Tracetest skills that scaffold instrumentation and assertion specs for you.

## A Step-by-Step Adoption Path

Teams that succeed with trace-based testing do not boil the ocean. They follow a staged path that delivers value at each step and avoids the trap of instrumenting everything before writing a single assertion.

**Step one: instrument one service end to end.** Pick the service most central to a critical flow — usually the one that orchestrates a request across others. Add the OpenTelemetry SDK with auto-instrumentation and confirm spans appear in your backend. Do not move on until you can open a real trace in Grafana Tempo and see the HTTP, database, and outbound-call spans. This proves your pipeline works before you build anything on top of it.

**Step two: write one trace-based assertion.** Take a single high-value flow and write one Tracetest spec that asserts something the response cannot reveal — for example, that the database \`INSERT\` ran exactly once. Run it locally. The first time a trace assertion catches a duplicate call or a missing event, the whole team understands the value, and adoption accelerates on its own.

**Step three: add the negative assertions.** Now encode the architectural rules that response tests can never check: the cache must be hit on repeat reads (zero database spans), no span may exceed its latency budget, and async events must fire. These negative and timing assertions are where trace-based testing earns its keep, because they guard invariants that are otherwise enforced only by hope.

**Step four: wire it into CI.** Stand up the Docker Compose stack with a Collector and run your specs on every pull request. Once failures point straight at the offending span — visible in CI logs and explorable in Tempo — engineers start writing trace assertions reflexively, the same way they write unit tests.

**Step five: expand by flow, not by service.** Resist the urge to instrument every service at once. Add coverage one critical user flow at a time, instrumenting whatever services that flow touches. This keeps each increment shippable and ties every bit of instrumentation to a concrete test that justifies it.

Following this path, a team can go from zero to a trusted set of trace-based tests guarding their most important flows in a couple of sprints, without a big-bang instrumentation project that stalls.

## Frequently Asked Questions

### What is trace-based testing?

Trace-based testing asserts on the distributed trace a request produces — its spans, their attributes, timing, and parent-child structure — rather than only on the HTTP response. By selecting specific spans and checking their values, you verify what your system did internally: which database it queried, whether a cache was hit, and whether downstream calls fired exactly once. It tests behavior the response cannot reveal.

### How is trace-based testing different from integration testing?

Traditional integration testing checks the response status and body. Trace-based testing additionally inspects every instrumented internal hop. It can catch a wrong database, a skipped cache, a duplicate downstream call, or a missing async event — all of which produce a correct-looking response. The two are complementary: keep integration tests for contracts, add trace-based tests where internal behavior matters.

### Do I need OpenTelemetry to do trace-based testing?

Practically, yes. Trace-based testing asserts on spans, and OpenTelemetry is the standard for producing them. Auto-instrumentation in Node, Python, Java, and Go emits spans for HTTP, databases, and outbound calls with almost no code, and you add custom spans for business logic. Since you likely want OTel for production observability anyway, the same instrumentation powers both your dashboards and your tests.

### What is Tracetest used for?

Tracetest is a dedicated trace-based testing tool. It triggers an operation, collects the resulting OpenTelemetry trace from your pipeline, and evaluates declarative assertions against any span using selectors. You define tests as YAML specs with span selectors and attribute or count assertions, then run them via CLI in CI. It is the most common starting point for teams adopting trace-based testing.

### Can trace-based tests detect N+1 query problems?

Yes, directly. Select the database query spans and assert their count equals the expected number — for example, \`tracetest.selected_spans.count = 1\`. If an N+1 pattern emits ten query spans where one was expected, the count assertion fails. This is something response-only tests fundamentally cannot detect, because the N+1 problem is invisible in the response body.

### How do I assert that a cache was hit?

Use a negative span assertion. On a request that should be served from cache, assert that the database query span count is zero, or assert that a cache span exists with \`cache.hit = true\`. Because the cache hit means no database span is emitted, the absence of that span — provable with a count of zero — is your assertion that caching worked as intended.

### Does trace-based testing slow down CI?

Marginally. The overhead is waiting for the trace to be collected after triggering the operation, typically a few seconds per test. You also need the system under test plus an OpenTelemetry Collector running, usually via Docker Compose. For the bugs it catches in distributed systems — duplicate calls, missing events, wrong data sources — the small added time is easily justified.

### What tools support trace-based testing in 2026?

The main tools are Tracetest, the most complete dedicated solution with a UI and CLI; Malabi, a lighter code-first library that asserts on spans inside your existing test framework; and Grafana with Tempo as the trace storage and visualization backend. A common stack is OTel SDK for instrumentation, Tempo for storage, and Tracetest for assertions.

## Conclusion

In a microservices world, the HTTP response is a summary and the distributed trace is the truth. Trace-based testing with OpenTelemetry lets you assert on that truth — proving that the right database was queried, the cache was honored, downstream calls fired exactly once, and async events actually published. You instrument once with the OTel SDK, write declarative specs with Tracetest selectors, and run them in CI like any other test, with failures that point straight at the offending span.

Start small: pick one critical flow where internal behavior matters, instrument the services, and write a single trace-based spec for it. To accelerate the setup, browse the OpenTelemetry and Tracetest skills in our [QA skills directory](/skills) and drop a ready-made instrumentation and assertion workflow into your stack today.
`,
};
