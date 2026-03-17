import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Observability-Driven Testing: Using Logs, Traces, and Metrics for Better QA',
  description:
    'Complete guide to observability-driven testing. Covers using OpenTelemetry traces in tests, log-based assertions, metrics validation, distributed tracing for test debugging, and building observable test suites.',
  date: '2026-03-16',
  category: 'Guide',
  content: `
Modern software systems are complex, distributed, and increasingly difficult to test with traditional assertion-based approaches alone. **Observability-driven testing** bridges the gap between what your tests check and what your systems actually do in production. By leveraging **logs, traces, and metrics** directly inside your test suites, you gain deeper insight into system behavior, catch subtle regressions that assertions miss, and dramatically reduce the time spent debugging failures.

This guide covers everything you need to know about applying the three pillars of observability to your QA practice -- from instrumenting test environments with **OpenTelemetry** to building dashboards that correlate test failures with production incidents.

## Key Takeaways

- **Observability-driven testing** uses logs, traces, and metrics as first-class test artifacts, going beyond simple pass/fail assertions to validate system behavior holistically
- **OpenTelemetry (OTel)** is the industry standard for instrumenting test environments, providing vendor-neutral trace context propagation and telemetry collection
- **Log-based testing patterns** such as structured log assertions and console error detection catch issues that traditional UI or API assertions miss entirely
- **Trace-based testing** enables you to validate distributed request flows, assert on span durations, and debug flaky tests by inspecting the exact execution path
- **Metrics-based testing** lets you encode SLI/SLO compliance directly into your test suites, ensuring performance budgets are enforced before code reaches production
- **AI coding agents** equipped with observability testing skills can automatically instrument test suites, set up trace assertions, and generate metrics validation code

---

## Introduction: What Is Observability-Driven Testing?

Traditional testing follows a straightforward pattern: set up state, perform an action, assert on the outcome. This works well for deterministic, synchronous operations. But modern architectures -- microservices, event-driven systems, serverless functions, distributed databases -- introduce behaviors that are invisible to conventional assertions.

Consider a simple e-commerce checkout flow. A traditional E2E test might verify that clicking "Place Order" shows a confirmation page. But what happened underneath? Did the payment service retry three times before succeeding? Did the inventory service take 4 seconds to respond instead of the expected 200ms? Did the notification service silently fail to send the order confirmation email? Did an error get logged that indicates a race condition under load?

**Observability-driven testing** answers these questions by treating telemetry data -- logs, traces, and metrics -- as testable outputs alongside traditional assertions. Instead of only checking that the system produced the right result, you verify that it produced the right result *in the right way*.

The convergence of testing and observability is not accidental. As organizations adopt **Site Reliability Engineering (SRE)** practices, the line between "testing" and "monitoring" blurs. SLOs defined by SRE teams become test assertions. Production traces become test debugging tools. Metrics dashboards become test result dashboards. Observability-driven testing formalizes this convergence into a repeatable practice.

This approach does not replace existing testing strategies. It augments them. You still write unit tests, integration tests, and E2E tests. But you enrich those tests with telemetry-aware assertions that catch an entire class of bugs that traditional testing misses.

---

## The Three Pillars Applied to Testing

The three pillars of observability -- **logs**, **traces**, and **metrics** -- each serve a distinct purpose in testing. Understanding how each pillar maps to testing patterns is the foundation of observability-driven testing.

### Logs in Testing

**Logs** are timestamped records of discrete events. In a testing context, logs serve two purposes:

1. **Assertions**: Verify that specific log messages were (or were not) emitted during test execution. For example, assert that no error-level logs appeared during an E2E flow, or that a specific audit log entry was created when a user performed a privileged action.

2. **Debugging**: When a test fails, structured logs from the system under test provide context that stack traces alone cannot. Logs tell you *what the system was doing* when the failure occurred.

| Log Level | Testing Use Case |
|-----------|-----------------|
| ERROR | Assert no unexpected errors during test execution |
| WARN | Detect deprecation warnings, performance degradation signals |
| INFO | Validate business logic events (order created, email sent) |
| DEBUG | Deep debugging of test failures in CI |

### Traces in Testing

**Traces** represent the end-to-end journey of a request through a distributed system. Each trace contains **spans** -- named, timed operations that form a tree structure. In testing, traces enable:

1. **Flow validation**: Assert that a request traversed the expected services in the expected order
2. **Performance assertions**: Verify that individual spans (database queries, API calls, message processing) completed within acceptable durations
3. **Dependency verification**: Confirm that services communicated correctly, with proper headers, payloads, and status codes
4. **Flaky test debugging**: Inspect the trace of a failed test run to see exactly where and why it diverged from expected behavior

### Metrics in Testing

**Metrics** are numerical measurements collected over time. Unlike logs and traces, metrics are pre-aggregated and optimized for time-series analysis. In testing, metrics enable:

1. **SLO validation**: Assert that error rates, latencies, and throughput meet defined service level objectives
2. **Resource monitoring**: Verify that tests do not cause memory leaks, CPU spikes, or connection pool exhaustion
3. **Regression detection**: Compare metrics from the current test run against historical baselines to detect performance regressions
4. **Capacity validation**: Ensure the system handles expected load within resource constraints

---

## OpenTelemetry for Test Engineers

**OpenTelemetry (OTel)** is the CNCF project that provides a vendor-neutral standard for collecting and exporting telemetry data. For test engineers, OTel is the key technology that makes observability-driven testing practical across any stack.

### Setting Up OTel in Test Environments

The first step is instrumenting your application under test with OpenTelemetry. Most modern frameworks have OTel auto-instrumentation libraries that require minimal code changes.

\`\`\`typescript
// otel-test-setup.ts -- OpenTelemetry configuration for test environments
import { NodeSDK } from '@opentelemetry/sdk-node';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';

// Use in-memory exporter for unit/integration tests
export const testSpanExporter = new InMemorySpanExporter();

// Use OTLP exporter for E2E tests that send to a local collector
const otlpExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const isE2E = process.env.TEST_TYPE === 'e2e';

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'my-app-test',
    'deployment.environment': 'test',
    'test.run.id': process.env.TEST_RUN_ID || \`local-\${Date.now()}\`,
  }),
  traceExporter: isE2E ? otlpExporter : testSpanExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Helper to get completed spans for assertions
export function getFinishedSpans() {
  return testSpanExporter.getFinishedSpans();
}

// Reset spans between tests
export function resetSpans() {
  testSpanExporter.reset();
}
\`\`\`

### Trace Context Propagation in Tests

When your test makes an HTTP request to the application, you want the trace to connect the test execution with the application's internal spans. This requires **trace context propagation** -- passing the W3C \`traceparent\` header from your test client to the application.

\`\`\`typescript
// trace-aware-test-client.ts
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

const propagator = new W3CTraceContextPropagator();

export async function tracedFetch(url: string, options: RequestInit = {}) {
  const tracer = trace.getTracer('test-client');

  return tracer.startActiveSpan(\`TEST: \${options.method || 'GET'} \${url}\`, async (span) => {
    // Inject trace context into request headers
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
    const carrier: Record<string, string> = {};
    propagator.inject(context.active(), carrier);

    Object.assign(headers, carrier);

    try {
      const response = await fetch(url, { ...options, headers });
      span.setAttribute('http.status_code', response.status);

      if (!response.ok) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: \`HTTP \${response.status}\` });
      }

      return response;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  });
}
\`\`\`

This approach means every test request creates a trace that spans from your test code through the entire application stack. When a test fails, you can look up the trace by the test's trace ID and see exactly what happened.

### Python OTel Setup for pytest

\`\`\`python
# conftest.py -- OpenTelemetry setup for pytest
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
from opentelemetry.sdk.resources import Resource

_exporter = InMemorySpanExporter()

@pytest.fixture(autouse=True, scope="session")
def setup_otel():
    """Initialize OpenTelemetry for the entire test session."""
    resource = Resource.create({
        "service.name": "my-app-test",
        "deployment.environment": "test",
    })
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(SimpleSpanProcessor(_exporter))
    trace.set_tracer_provider(provider)
    yield
    provider.shutdown()

@pytest.fixture(autouse=True)
def reset_spans():
    """Clear spans before each test."""
    _exporter.clear()
    yield

@pytest.fixture
def finished_spans():
    """Access completed spans for assertions."""
    return _exporter.get_finished_spans
\`\`\`

---

## Log-Based Testing Patterns

Log-based testing is often the most accessible entry point into observability-driven testing. Every application produces logs, and asserting on log output requires minimal infrastructure changes.

### Asserting on Log Output

The simplest pattern is capturing log output during test execution and asserting that specific messages appeared or did not appear.

\`\`\`typescript
// log-capture.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createLogCapture } from './test-utils/log-capture';

describe('Order Processing', () => {
  const logCapture = createLogCapture();

  beforeEach(() => {
    logCapture.clear();
  });

  it('should log audit trail for order creation', async () => {
    // Arrange
    const orderData = { items: [{ sku: 'WIDGET-1', qty: 2 }], userId: 'user-123' };

    // Act
    await createOrder(orderData);

    // Assert on log output
    const auditLogs = logCapture.getByLevel('info').filter(
      (log) => log.category === 'audit'
    );

    expect(auditLogs).toContainEqual(
      expect.objectContaining({
        message: 'Order created',
        orderId: expect.any(String),
        userId: 'user-123',
        itemCount: 1,
      })
    );
  });

  it('should not produce any error logs during happy path', async () => {
    await createOrder({ items: [{ sku: 'WIDGET-1', qty: 1 }], userId: 'user-456' });

    const errorLogs = logCapture.getByLevel('error');
    expect(errorLogs).toHaveLength(0);
  });
});
\`\`\`

### Structured Logging in Tests

Structured logging -- emitting log entries as JSON objects rather than free-form strings -- makes log-based assertions reliable and maintainable.

\`\`\`typescript
// structured-log-capture.ts
import pino from 'pino';

interface CapturedLog {
  level: string;
  msg: string;
  [key: string]: unknown;
}

export function createTestLogger() {
  const captured: CapturedLog[] = [];

  const transport = pino.transport({
    target: 'pino/file',
    options: { destination: 1 }, // stdout
  });

  const logger = pino(
    {
      level: 'debug',
      hooks: {
        logMethod(inputArgs, method) {
          // Capture every log entry for assertions
          const entry = typeof inputArgs[0] === 'object' ? inputArgs[0] : { msg: inputArgs[0] };
          captured.push({ level: method.name || 'info', ...entry } as CapturedLog);
          return method.apply(this, inputArgs);
        },
      },
    },
    transport
  );

  return {
    logger,
    getLogs: () => [...captured],
    getByLevel: (level: string) => captured.filter((l) => l.level === level),
    getByField: (field: string, value: unknown) =>
      captured.filter((l) => l[field] === value),
    clear: () => (captured.length = 0),
  };
}
\`\`\`

### Error Log Monitoring During E2E Tests

One of the highest-value log-based testing patterns is monitoring for unexpected errors during E2E test execution. This catches issues that pass traditional assertions but indicate underlying problems.

\`\`\`typescript
// playwright-error-monitor.ts -- Monitor application logs during E2E tests
import { test, expect } from '@playwright/test';

// Custom fixture that monitors console errors
test.extend({
  errorMonitor: async ({ page }, use) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(\`Page error: \${error.message}\`);
    });

    await use({ errors, warnings });

    // After test: assert no unexpected errors
    const unexpectedErrors = errors.filter(
      (e) => !e.includes('known-flaky-third-party') // allowlist known issues
    );
    expect(unexpectedErrors, 'Unexpected console errors detected').toHaveLength(0);
  },
});
\`\`\`

This pattern is closely related to the **console error detection** approach. You can install a dedicated QA skill for this:

\`\`\`bash
npx @qaskills/cli add console-error-hunter
\`\`\`

The **console-error-hunter** skill teaches your AI agent to automatically set up console error monitoring in Playwright and Cypress tests, with smart filtering to ignore known third-party errors while catching genuine application issues.

### Python: Log-Based Assertions with pytest

\`\`\`python
# test_order_logging.py
import logging
import pytest

def test_order_creation_logs_audit_trail(caplog):
    """Verify that order creation emits structured audit log."""
    with caplog.at_level(logging.INFO):
        order = create_order(items=[{"sku": "WIDGET-1", "qty": 2}], user_id="user-123")

    audit_records = [
        r for r in caplog.records
        if r.getMessage().startswith("Order created")
    ]
    assert len(audit_records) == 1
    assert hasattr(audit_records[0], "order_id")
    assert audit_records[0].user_id == "user-123"

def test_no_error_logs_during_checkout(caplog):
    """Ensure checkout flow produces no error-level logs."""
    with caplog.at_level(logging.ERROR):
        complete_checkout(cart_id="cart-789")

    assert len(caplog.records) == 0, (
        f"Unexpected error logs: {[r.getMessage() for r in caplog.records]}"
    )
\`\`\`

---

## Trace-Based Testing

**Trace-based testing** is where observability-driven testing delivers its most unique value. By asserting on distributed traces, you can validate behaviors that are impossible to check with traditional testing approaches.

### Distributed Trace Assertions

After a test action completes, you can inspect the trace to verify that the request flowed through the expected services.

\`\`\`typescript
// trace-assertions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getFinishedSpans, resetSpans } from './otel-test-setup';
import { tracedFetch } from './trace-aware-test-client';

describe('Checkout Flow - Trace Validation', () => {
  beforeEach(() => {
    resetSpans();
  });

  it('should traverse payment, inventory, and notification services', async () => {
    // Act: trigger checkout via API
    const response = await tracedFetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId: 'cart-123', paymentMethod: 'card' }),
    });

    expect(response.status).toBe(200);

    // Wait for spans to flush
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Assert on trace structure
    const spans = getFinishedSpans();
    const spanNames = spans.map((s) => s.name);

    // Verify expected services were called
    expect(spanNames).toContain('POST /api/checkout');
    expect(spanNames).toContain('payment-service.charge');
    expect(spanNames).toContain('inventory-service.reserve');
    expect(spanNames).toContain('notification-service.send-confirmation');

    // Verify correct order: payment before inventory reservation
    const paymentSpan = spans.find((s) => s.name === 'payment-service.charge');
    const inventorySpan = spans.find((s) => s.name === 'inventory-service.reserve');

    expect(paymentSpan).toBeDefined();
    expect(inventorySpan).toBeDefined();
    expect(paymentSpan!.startTime).toBeLessThan(inventorySpan!.startTime);
  });
});
\`\`\`

### Span Validation in Integration Tests

For integration tests, you can validate individual span attributes to ensure services communicate with the correct parameters.

\`\`\`typescript
it('should include correct database query spans', async () => {
  await tracedFetch('http://localhost:3000/api/users/user-123');

  const spans = getFinishedSpans();
  const dbSpans = spans.filter((s) => s.attributes['db.system'] === 'postgresql');

  expect(dbSpans.length).toBeGreaterThanOrEqual(1);

  const userQuery = dbSpans.find((s) =>
    String(s.attributes['db.statement']).includes('SELECT')
  );

  expect(userQuery).toBeDefined();
  expect(userQuery!.attributes['db.name']).toBe('app_db');
  expect(userQuery!.status.code).toBe(0); // UNSET = success
});
\`\`\`

### Performance Assertions Using Trace Data

Traces provide precise timing data for every operation. Use this to enforce performance budgets at the span level.

\`\`\`typescript
it('should complete database queries within 100ms', async () => {
  await tracedFetch('http://localhost:3000/api/products?category=electronics');

  const spans = getFinishedSpans();
  const dbSpans = spans.filter((s) => s.attributes['db.system'] === 'postgresql');

  for (const span of dbSpans) {
    const durationMs = (span.endTime[0] - span.startTime[0]) * 1000 +
      (span.endTime[1] - span.startTime[1]) / 1_000_000;

    expect(durationMs, \`Span "\${span.name}" exceeded 100ms: \${durationMs.toFixed(1)}ms\`)
      .toBeLessThan(100);
  }
});

it('should complete the full checkout in under 2 seconds', async () => {
  const start = performance.now();
  await tracedFetch('http://localhost:3000/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ cartId: 'cart-456' }),
    headers: { 'Content-Type': 'application/json' },
  });
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(2000);

  // Also verify via trace data for more granular insight
  const spans = getFinishedSpans();
  const rootSpan = spans.find((s) => s.name === 'POST /api/checkout');
  expect(rootSpan).toBeDefined();

  const rootDurationMs = (rootSpan!.endTime[0] - rootSpan!.startTime[0]) * 1000 +
    (rootSpan!.endTime[1] - rootSpan!.startTime[1]) / 1_000_000;

  expect(rootDurationMs).toBeLessThan(2000);
});
\`\`\`

### Debugging Flaky Tests with Traces

**Flaky tests** are one of the most frustrating problems in test automation. Traces transform flaky test debugging from guesswork into forensic analysis.

When a test intermittently fails, the trace from the failing run shows you exactly what happened differently. Common findings include:

- **Slow database queries** that occasionally exceed timeout thresholds
- **Retry storms** where a downstream service returns errors, causing the upstream service to retry multiple times
- **Race conditions** where two spans that should be sequential overlap
- **Cold starts** where a serverless function or container took longer than usual to initialize

\`\`\`typescript
// Export trace data for failed tests only
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  traceCollector: async ({}, use, testInfo) => {
    const traceId = crypto.randomUUID().replace(/-/g, '');

    await use({ traceId });

    // On failure, log the trace ID for lookup in Jaeger/Grafana
    if (testInfo.status === 'failed') {
      console.log(\`\\n[TRACE DEBUG] Test failed: \${testInfo.title}\`);
      console.log(\`[TRACE DEBUG] Trace ID: \${traceId}\`);
      console.log(\`[TRACE DEBUG] Jaeger URL: http://jaeger:16686/trace/\${traceId}\`);
      console.log(\`[TRACE DEBUG] Grafana URL: http://grafana:3000/explore?traceId=\${traceId}\\n\`);
    }
  },
});
\`\`\`

---

## Metrics-Based Testing

**Metrics-based testing** encodes your performance and reliability requirements directly into your test suite. Instead of relying on manual monitoring after deployment, you verify SLIs and SLOs as part of your CI/CD pipeline.

### Validating SLIs/SLOs in Tests

Service Level Indicators (SLIs) and Service Level Objectives (SLOs) define the reliability targets for your system. Metrics-based tests assert that these targets are met.

\`\`\`typescript
// slo-validation.test.ts
import { describe, it, expect } from 'vitest';
import { PrometheusClient } from './test-utils/prometheus-client';

const prometheus = new PrometheusClient('http://localhost:9090');

describe('SLO Compliance', () => {
  it('should maintain error rate below 0.1% SLO', async () => {
    // Run a burst of requests
    const results = await Promise.all(
      Array.from({ length: 1000 }, () =>
        fetch('http://localhost:3000/api/health').then((r) => r.status)
      )
    );

    const errorCount = results.filter((status) => status >= 500).length;
    const errorRate = errorCount / results.length;

    expect(errorRate, \`Error rate \${(errorRate * 100).toFixed(2)}% exceeds 0.1% SLO\`)
      .toBeLessThan(0.001);
  });

  it('should meet p99 latency SLO of 500ms', async () => {
    // Query Prometheus for p99 latency
    const result = await prometheus.query(
      'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="api"}[5m]))'
    );

    const p99Seconds = parseFloat(result.data.result[0]?.value[1] || '0');
    const p99Ms = p99Seconds * 1000;

    expect(p99Ms, \`p99 latency \${p99Ms.toFixed(0)}ms exceeds 500ms SLO\`)
      .toBeLessThan(500);
  });
});
\`\`\`

### Custom Metrics in Test Suites

You can emit custom metrics from your test suite itself to track test execution characteristics over time.

\`\`\`typescript
// test-metrics.ts
import { Counter, Histogram, Registry } from 'prom-client';

const registry = new Registry();

export const testExecutionDuration = new Histogram({
  name: 'test_execution_duration_seconds',
  help: 'Duration of individual test cases',
  labelNames: ['suite', 'test_name', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

export const testAssertionCount = new Counter({
  name: 'test_assertions_total',
  help: 'Total number of assertions executed',
  labelNames: ['suite', 'type'],
  registers: [registry],
});

export const testFlakyRetries = new Counter({
  name: 'test_flaky_retries_total',
  help: 'Number of test retries due to flakiness',
  labelNames: ['suite', 'test_name'],
  registers: [registry],
});

// Push metrics after test suite completion
export async function pushTestMetrics() {
  const metrics = await registry.metrics();
  await fetch('http://localhost:9091/metrics/job/test-suite', {
    method: 'POST',
    body: metrics,
    headers: { 'Content-Type': 'text/plain' },
  });
}
\`\`\`

### Latency Percentile Assertions

Rather than asserting on a single request's latency, assert on percentile distributions across multiple requests to detect performance regressions reliably.

\`\`\`typescript
it('should maintain acceptable latency distribution under load', async () => {
  const latencies: number[] = [];

  // Send 200 requests and record latencies
  for (let i = 0; i < 200; i++) {
    const start = performance.now();
    await fetch('http://localhost:3000/api/products');
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  expect(p50, \`p50 latency \${p50.toFixed(0)}ms\`).toBeLessThan(100);
  expect(p95, \`p95 latency \${p95.toFixed(0)}ms\`).toBeLessThan(300);
  expect(p99, \`p99 latency \${p99.toFixed(0)}ms\`).toBeLessThan(500);
});
\`\`\`

### Resource Utilization Checks

Metrics-based tests can verify that the system operates within resource constraints, catching memory leaks and resource exhaustion issues.

\`\`\`python
# test_resource_utilization.py
import pytest
import psutil
import requests

class TestResourceUtilization:
    """Verify the application stays within resource bounds during testing."""

    def test_memory_does_not_leak_under_load(self):
        """Send 500 requests and verify memory stays stable."""
        # Get baseline memory
        baseline = self._get_app_memory()

        # Generate load
        for _ in range(500):
            requests.get("http://localhost:3000/api/products")

        # Check memory after load
        after_load = self._get_app_memory()
        growth_mb = (after_load - baseline) / (1024 * 1024)

        assert growth_mb < 50, (
            f"Memory grew by {growth_mb:.1f}MB during load test "
            f"(baseline: {baseline / (1024 * 1024):.1f}MB, "
            f"after: {after_load / (1024 * 1024):.1f}MB)"
        )

    def test_connection_pool_not_exhausted(self):
        """Verify database connection pool is not exhausted after tests."""
        response = requests.get("http://localhost:3000/api/health/db")
        health = response.json()

        assert health["pool"]["active"] < health["pool"]["max"] * 0.8, (
            f"Connection pool at {health['pool']['active']}/{health['pool']['max']} "
            f"({health['pool']['active'] / health['pool']['max'] * 100:.0f}% utilized)"
        )

    def _get_app_memory(self):
        """Get application memory usage via metrics endpoint."""
        response = requests.get("http://localhost:3000/metrics")
        for line in response.text.splitlines():
            if line.startswith("process_resident_memory_bytes"):
                return float(line.split()[-1])
        return 0
\`\`\`

---

## Building Observable Test Suites

An observable test suite is one that produces telemetry about its own execution, not just about the system under test. This meta-level observability helps you understand and improve your testing practice itself.

### Test Telemetry: Instrumenting Your Test Framework

Just as you instrument application code, you can instrument your test framework to emit traces and metrics about test execution.

\`\`\`typescript
// vitest-otel-reporter.ts -- Custom Vitest reporter with OpenTelemetry
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { Reporter, TestCase, TestResult } from 'vitest';

const tracer = trace.getTracer('vitest-reporter');

export class OTelReporter implements Reporter {
  private suiteSpans = new Map<string, ReturnType<typeof tracer.startSpan>>();

  onTestSuiteBegin(suite: { name: string }) {
    const span = tracer.startSpan(\`suite: \${suite.name}\`);
    this.suiteSpans.set(suite.name, span);
  }

  onTestBegin(test: TestCase) {
    // Each test gets its own span, child of the suite span
    const suiteSpan = this.suiteSpans.get(test.suite?.name || '');
    const ctx = suiteSpan ? trace.setSpan(trace.context.active(), suiteSpan) : undefined;

    const span = tracer.startSpan(
      \`test: \${test.name}\`,
      {
        attributes: {
          'test.name': test.name,
          'test.suite': test.suite?.name || 'unknown',
          'test.file': test.file?.name || 'unknown',
        },
      },
      ctx
    );
    // Store span for later
    (test as any).__otelSpan = span;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const span = (test as any).__otelSpan;
    if (!span) return;

    span.setAttribute('test.status', result.state || 'unknown');
    span.setAttribute('test.duration_ms', result.duration || 0);

    if (result.state === 'fail') {
      span.setStatus({ code: SpanStatusCode.ERROR, message: result.errors?.[0]?.message });
      span.setAttribute('test.error', result.errors?.[0]?.stack || '');
    }

    span.end();
  }

  onTestSuiteEnd(suite: { name: string }) {
    const span = this.suiteSpans.get(suite.name);
    span?.end();
    this.suiteSpans.delete(suite.name);
  }
}
\`\`\`

### Test Execution Dashboards

With test telemetry flowing into your observability backend, you can build dashboards that answer critical questions about your test suite:

- **Which tests are slowest?** Sort by span duration to find optimization candidates
- **Which tests fail most often?** Track failure rates over time to identify chronic flaky tests
- **How long does the full suite take?** Monitor suite duration trends to catch regressions
- **What is the retry rate?** High retry rates indicate systemic flakiness

A typical **Grafana dashboard** for test observability includes these panels:

| Panel | Data Source | Query |
|-------|------------|-------|
| Suite Duration Trend | Prometheus | \`test_suite_duration_seconds{suite="e2e"}\` |
| Test Failure Rate | Prometheus | \`rate(test_failures_total[24h]) / rate(test_runs_total[24h])\` |
| Slowest Tests (Top 10) | Jaeger/Tempo | Trace search by \`service.name=vitest\`, sort by duration |
| Flaky Test Retries | Prometheus | \`sum(test_flaky_retries_total) by (test_name)\` |
| Test Coverage Trend | Custom | Coverage metrics pushed from CI |

### Failure Correlation with Production Metrics

The ultimate value of observable test suites is correlating test failures with production metrics. When a test fails in CI, you can automatically query production metrics to determine if the failure reflects a real production issue or a test environment problem.

\`\`\`typescript
// failure-correlator.ts
export async function correlateWithProduction(testName: string, failureTime: Date) {
  const window = 300; // 5-minute window around failure
  const start = new Date(failureTime.getTime() - window * 1000).toISOString();
  const end = new Date(failureTime.getTime() + window * 1000).toISOString();

  // Query production error rate during the same time window
  const prodErrorRate = await queryPrometheus(
    \`rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])\`,
    start,
    end
  );

  // Query production latency
  const prodLatency = await queryPrometheus(
    \`histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))\`,
    start,
    end
  );

  return {
    testName,
    failureTime: failureTime.toISOString(),
    productionErrorRate: prodErrorRate,
    productionP99Latency: prodLatency,
    likelyProductionIssue: prodErrorRate > 0.01 || prodLatency > 1.0,
  };
}
\`\`\`

---

## Tools and Stack

Building an observability-driven testing practice requires choosing the right tools. Here is a breakdown of the key components and how they fit together.

### OpenTelemetry

**Role**: Instrumentation standard and SDK
**Why**: Vendor-neutral, widely adopted, supports all three pillars. OTel auto-instrumentation libraries cover most popular frameworks and languages with minimal code changes.

### Jaeger

**Role**: Distributed trace visualization and search
**Why**: Open source, easy to run locally via Docker, integrates with OTel natively. Ideal for debugging individual test failures by inspecting trace details.

\`\`\`bash
# Run Jaeger locally for test trace collection
docker run -d --name jaeger \\
  -p 16686:16686 \\
  -p 4318:4318 \\
  jaegertracing/all-in-one:latest
\`\`\`

### Grafana + Tempo + Loki + Prometheus

**Role**: Full observability stack (traces + logs + metrics)
**Why**: The Grafana stack provides a unified interface for all three pillars. Tempo stores traces, Loki stores logs, Prometheus stores metrics, and Grafana correlates them all.

### Datadog

**Role**: Commercial all-in-one observability platform
**Why**: If your organization already uses Datadog, its **CI Visibility** and **Synthetic Monitoring** features integrate observability directly into your testing pipeline. Datadog's trace-test correlation is particularly strong.

### Prometheus

**Role**: Metrics collection and querying
**Why**: The de facto standard for metrics. Prometheus's PromQL language makes it straightforward to write metric-based test assertions.

| Tool | Pillar | Open Source | Best For |
|------|--------|-------------|----------|
| OpenTelemetry | All three | Yes | Instrumentation layer |
| Jaeger | Traces | Yes | Local development, debugging |
| Grafana Tempo | Traces | Yes | Production-scale trace storage |
| Grafana Loki | Logs | Yes | Log aggregation and search |
| Prometheus | Metrics | Yes | Metrics collection and alerting |
| Grafana | Visualization | Yes | Dashboards for all pillars |
| Datadog | All three | No | Enterprise all-in-one solution |
| Honeycomb | Traces + Events | No | High-cardinality trace analysis |
| Sentry | Errors + Traces | Partial | Error tracking with trace context |

---

## AI-Assisted Observability Testing

Setting up observability-driven testing from scratch involves significant boilerplate: OTel configuration, trace context propagation, metric clients, log capture utilities, and assertion helpers. **AI coding agents** equipped with the right QA skills can automate much of this setup.

### QA Skills for Observability Testing

The [QASkills.sh](https://qaskills.sh) directory includes skills specifically designed for observability testing. Install them to give your AI agent deep knowledge of observability testing patterns:

\`\`\`bash
# OpenTelemetry testing patterns -- trace assertions, span validation, context propagation
npx @qaskills/cli add opentelemetry-testing

# Test observability -- instrumenting test frameworks, test telemetry dashboards
npx @qaskills/cli add test-observability

# Sentry error monitoring -- error tracking integration in test suites
npx @qaskills/cli add sentry-error-monitoring
\`\`\`

Once installed, your AI agent can:

- **Generate OTel setup code** for your specific framework and language
- **Write trace-based assertions** that validate distributed request flows
- **Create log capture utilities** tailored to your logging library (pino, winston, Python logging, etc.)
- **Build metric validation tests** that enforce SLOs in your CI pipeline
- **Set up test execution dashboards** with pre-configured Grafana panels

### Example: AI-Generated Trace Test

After installing the \`opentelemetry-testing\` skill, asking your AI agent to "write a test that verifies the checkout flow traces through payment and inventory services" produces production-ready test code with proper OTel setup, trace context propagation, and span assertions -- no manual boilerplate required.

Browse all available QA skills at [qaskills.sh/skills](https://qaskills.sh/skills) or search directly:

\`\`\`bash
npx @qaskills/cli search observability
npx @qaskills/cli search monitoring
npx @qaskills/cli search opentelemetry
\`\`\`

---

## Best Practices

Following these best practices will help you build a sustainable and effective observability-driven testing practice.

**1. Start with error log monitoring.** The highest-value, lowest-effort pattern is asserting that no unexpected error logs appear during test execution. This catches a surprising number of issues that traditional assertions miss.

**2. Use structured logging exclusively.** Free-form log strings are fragile to assert on. Structured JSON logs with consistent field names make log-based assertions reliable and maintainable.

**3. Propagate trace context from tests to application.** Without trace context propagation, your test traces and application traces are disconnected. Use the W3C \`traceparent\` header standard for interoperability.

**4. Assert on trace structure, not just outcomes.** Verifying that the right services were called in the right order catches architectural regressions that outcome-based assertions miss entirely.

**5. Set performance budgets at the span level.** Overall request latency can hide individual span regressions. Assert on individual span durations to catch performance issues early.

**6. Use in-memory exporters for unit and integration tests.** Do not require a running OTel collector for fast tests. Use \`InMemorySpanExporter\` and switch to OTLP exporters only for E2E and staging tests.

**7. Build test execution dashboards.** Treat your test suite as a system that needs monitoring. Track suite duration, failure rates, flaky test counts, and retry rates over time.

**8. Correlate test failures with production metrics.** When a test fails, automatically check whether production metrics show a related issue. This reduces time wasted investigating test-environment-only problems.

**9. Version your SLO thresholds alongside your code.** Store latency budgets, error rate thresholds, and resource limits in configuration files that are reviewed and updated as the system evolves.

**10. Do not block CI on flaky observability checks.** When introducing observability-driven tests, start in reporting mode. Only promote assertions to blocking after they have proven stable over multiple CI runs.

---

## Anti-Patterns

Avoid these common mistakes when implementing observability-driven testing.

**1. Asserting on exact log messages.** Log messages change frequently. Assert on structured fields (log level, event type, key attributes) rather than exact message strings.

**2. Requiring a full observability stack for local development.** Developers should be able to run tests locally without Jaeger, Prometheus, and Grafana. Use in-memory exporters and conditional instrumentation.

**3. Creating brittle trace assertions.** Do not assert on the exact number of spans or their exact names if those are auto-generated by instrumentation libraries. Assert on the spans you control and care about.

**4. Ignoring trace sampling in test environments.** Test environments should use 100% trace sampling (no sampling). Production sampling rates will cause intermittent test failures if applied to test environments.

**5. Treating metrics tests as load tests.** Metrics-based tests validate SLO compliance under normal conditions, not maximum capacity. Use dedicated load testing tools (k6, JMeter) for load testing.

**6. Collecting telemetry without acting on it.** Observable test suites that produce dashboards nobody looks at are worse than no observability -- they add complexity without value. Assign ownership of test observability dashboards.

**7. Over-instrumenting test code.** Instrument the system under test, not every line of your test setup code. Test instrumentation should focus on the test execution lifecycle (start, end, status, duration), not internal test helper functions.

**8. Skipping cleanup of test telemetry data.** Test environments that accumulate unbounded telemetry data will eventually cause storage and performance problems. Set retention policies and clean up test traces and metrics regularly.

---

## Getting Started Checklist

Use this checklist to incrementally adopt observability-driven testing in your project.

**Phase 1: Foundation (Week 1)**
- [ ] Add OpenTelemetry SDK to your application's test dependencies
- [ ] Configure \`InMemorySpanExporter\` for unit and integration tests
- [ ] Set up console error monitoring in your E2E test framework
- [ ] Add a "no unexpected error logs" assertion to your critical E2E flows

**Phase 2: Trace-Based Testing (Week 2-3)**
- [ ] Implement trace context propagation from test clients to application
- [ ] Write trace structure assertions for your most important user flows
- [ ] Add span-level performance assertions for database queries and external API calls
- [ ] Configure trace export to a local Jaeger instance for debugging

**Phase 3: Metrics Integration (Week 3-4)**
- [ ] Define SLIs and SLOs for your key API endpoints
- [ ] Write metrics-based tests that validate SLO compliance
- [ ] Add resource utilization checks (memory, connection pool) to your test suite
- [ ] Set up latency percentile assertions for performance-critical endpoints

**Phase 4: Test Observability (Week 4-5)**
- [ ] Instrument your test framework to emit execution telemetry
- [ ] Build a Grafana dashboard for test suite health metrics
- [ ] Set up failure correlation between test failures and production metrics
- [ ] Implement automated flaky test detection using trace analysis

**Phase 5: Continuous Improvement (Ongoing)**
- [ ] Review test observability dashboards weekly
- [ ] Update SLO thresholds as the system evolves
- [ ] Add observability assertions to new features as they are built
- [ ] Share learnings across teams to scale the practice

---

## Conclusion

**Observability-driven testing** represents a fundamental shift in how we think about test quality. By leveraging logs, traces, and metrics as first-class test artifacts, you move beyond the binary pass/fail model of traditional testing into a richer understanding of system behavior.

The key insight is that passing tests do not guarantee correct behavior -- they only guarantee that the specific conditions you checked were met. Observability-driven testing expands the scope of what your tests verify, catching an entire class of issues that traditional assertions miss: silent errors, performance regressions, architectural violations, and resource exhaustion.

Start small with error log monitoring, grow into trace-based assertions, and build toward full test observability with metrics and dashboards. The investment pays for itself the first time a trace from a failed test shows you in seconds what would have taken hours of debugging.

Equip your AI coding agent with observability testing skills from [qaskills.sh](https://qaskills.sh) to accelerate your adoption:

\`\`\`bash
npx @qaskills/cli add opentelemetry-testing
npx @qaskills/cli add test-observability
npx @qaskills/cli add sentry-error-monitoring
\`\`\`

The future of testing is observable. Start building your observable test suite today.
`,
};
