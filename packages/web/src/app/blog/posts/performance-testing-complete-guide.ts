import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Performance Testing Complete Guide: Load, Stress, and Scalability in 2026',
  description:
    'Comprehensive performance testing guide covering load, stress, spike, soak, and scalability testing with metrics, tools like k6, JMeter, Gatling, Artillery, CI integration, cloud testing, and real-world scenarios for 2026.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Performance testing is no longer optional. In a world where users abandon pages that take more than three seconds to load and where a single slow API endpoint can cascade into a full system outage, understanding how your application behaves under load is a core engineering responsibility. This guide covers every dimension of performance testing in 2026 -- the different types, the metrics that matter, the tools you should use, and how to integrate performance testing into your CI/CD pipeline with practical code examples.

## Key Takeaways

- Performance testing encompasses load, stress, spike, soak, and scalability testing -- each answers a different question about system behavior
- The four golden metrics are throughput, latency (especially p95 and p99 percentiles), error rate, and resource utilization
- k6 with TypeScript is the fastest path to scriptable, CI-integrated performance tests in 2026
- JMeter remains the standard for complex enterprise scenarios with GUI-based test design
- Gatling excels at high-throughput simulation with its Scala DSL and detailed HTML reports
- Artillery bridges the gap between load testing and monitoring with its YAML-first approach
- Performance tests belong in CI/CD pipelines with automated thresholds that fail builds before regressions reach production
- Cloud-based distributed testing lets you simulate realistic geographic load patterns without maintaining infrastructure

---

## Why Performance Testing Matters

Every production incident postmortem that mentions "unexpected traffic" or "database connection pool exhaustion" points to the same root cause: insufficient performance testing. The cost of these incidents is staggering -- not just in engineering hours, but in lost revenue, damaged reputation, and eroded user trust.

Performance testing answers critical questions: How many concurrent users can our system handle? What happens when traffic doubles during a marketing campaign? How does response time degrade as the database grows? Does the system recover gracefully after a traffic spike, or does it enter a death spiral?

Teams that integrate performance testing into their development workflow catch these problems before they reach production. The investment is small compared to the cost of a single production performance incident.

---

## Types of Performance Testing

### Load Testing

Load testing validates system behavior under expected production traffic. You define a target number of concurrent users or requests per second that represents normal or peak production load, then measure whether the system meets its performance SLAs.

A load test answers: "Can our system handle the traffic we expect?" The load profile is realistic -- it ramps up gradually, sustains the target load for a period, and ramps down.

\`\`\`typescript
// k6 load test example
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 },   // Hold at 100 users for 5 minutes
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Hold at 200 users for 5 minutes
    { duration: '2m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'body is not empty': (r) => r.body !== '',
  });

  errorRate.add(res.status !== 200);
  responseTime.add(res.timings.duration);

  sleep(Math.random() * 3 + 1); // Realistic think time between 1-4 seconds
}
\`\`\`

### Stress Testing

Stress testing pushes the system beyond its expected capacity to find breaking points. The goal is not to prove the system works -- it is to discover how it fails. Does it degrade gracefully with increasing response times, or does it crash abruptly? Are error messages helpful? Does the system recover after the load is removed?

\`\`\`typescript
// k6 stress test example
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 600 },   // Push beyond expected capacity
    { duration: '5m', target: 600 },
    { duration: '2m', target: 1000 },  // Find breaking point
    { duration: '5m', target: 1000 },
    { duration: '5m', target: 0 },     // Recovery period
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // Relaxed thresholds for stress testing
    http_req_failed: ['rate<0.15'],
  },
};
\`\`\`

### Spike Testing

Spike testing simulates sudden bursts of traffic -- flash sales, viral social media posts, breaking news events. The system has no time to scale gradually. The key questions are: Does the auto-scaler react fast enough? Do circuit breakers activate correctly? Does the CDN absorb the spike?

\`\`\`typescript
// k6 spike test example
export const options = {
  stages: [
    { duration: '30s', target: 10 },    // Baseline
    { duration: '10s', target: 1000 },  // Spike
    { duration: '2m', target: 1000 },   // Hold spike
    { duration: '10s', target: 10 },    // Drop back
    { duration: '2m', target: 10 },     // Recovery observation
  ],
};
\`\`\`

### Soak Testing (Endurance Testing)

Soak testing runs the system under moderate load for extended periods -- hours or even days. It catches memory leaks, connection pool exhaustion, log file growth, database connection accumulation, and other issues that only manifest over time.

\`\`\`typescript
// k6 soak test example
export const options = {
  stages: [
    { duration: '5m', target: 50 },     // Ramp up
    { duration: '8h', target: 50 },     // Sustain for 8 hours
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};
\`\`\`

### Scalability Testing

Scalability testing measures how well the system handles increasing load as resources are added. It validates horizontal scaling (adding more instances) and vertical scaling (adding more CPU/memory). The ideal result is linear or near-linear scaling: doubling resources should roughly double capacity.

---

## Performance Metrics That Matter

### Throughput

Throughput measures the number of requests the system processes per unit time, typically expressed as requests per second (RPS) or transactions per second (TPS). High throughput with acceptable latency indicates a healthy system.

Monitor throughput at multiple levels: the load balancer, the application server, the database, and external service calls. A bottleneck at any level limits overall throughput.

### Latency

Latency is the time from when a request is sent to when the response is received. Average latency is misleading because it hides the experience of your slowest users. Always measure percentiles:

- **p50 (median)**: The response time for half of all requests. Useful for understanding typical user experience.
- **p90**: 90% of requests are faster than this value. Your "fast path" users.
- **p95**: The industry standard for SLAs. Most cloud providers target p95 < 200ms for API endpoints.
- **p99**: One in 100 requests is slower than this. These are your most frustrated users, often your most valuable ones -- power users making complex queries.
- **p99.9**: Critical for payment systems, trading platforms, and healthcare applications where even rare slowdowns are unacceptable.

\`\`\`typescript
// k6 custom percentile tracking
import { Trend } from 'k6/metrics';

const apiLatency = new Trend('api_latency', true);
const dbLatency = new Trend('db_query_latency', true);

export default function () {
  const start = Date.now();
  const res = http.get('https://api.example.com/search?q=test');
  apiLatency.add(Date.now() - start);

  // Server-Timing header contains backend breakdown
  const serverTiming = res.headers['Server-Timing'];
  if (serverTiming) {
    const dbTime = parseServerTiming(serverTiming, 'db');
    if (dbTime) dbLatency.add(dbTime);
  }
}
\`\`\`

### Error Rate

The percentage of requests that result in errors (HTTP 5xx, timeouts, connection failures). A healthy system under load maintains an error rate below 0.1%. Error rates above 1% typically indicate a systemic problem.

Track error rates by endpoint, by error type, and over time. A gradually increasing error rate during a load test often indicates resource exhaustion (connection pools, file descriptors, memory).

### Resource Utilization

Monitor CPU, memory, disk I/O, network bandwidth, and application-specific resources like thread pools and connection pools. High resource utilization is not inherently bad -- a system running at 70% CPU under peak load is well-tuned. But a system hitting 95% CPU at normal load has no headroom for spikes.

---

## Tool Deep Dives

### k6: Modern Performance Testing in TypeScript

k6 is the performance testing tool of choice for teams that want scriptable, developer-friendly load tests that integrate seamlessly into CI/CD pipelines. Written in Go, it executes JavaScript (and TypeScript with bundling) test scripts with minimal resource overhead.

\`\`\`typescript
// k6 comprehensive API test
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const loginErrors = new Rate('login_errors');
const orderCount = new Counter('orders_created');
const checkoutTime = new Trend('checkout_duration');

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      exec: 'browseProducts',
    },
    purchase: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      exec: 'purchaseFlow',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    login_errors: ['rate<0.05'],
    checkout_duration: ['p(95)<3000'],
  },
};

export function browseProducts() {
  group('Browse', () => {
    const catalog = http.get('https://api.example.com/products?page=1&limit=20');
    check(catalog, { 'catalog loaded': (r) => r.status === 200 });

    const products = JSON.parse(catalog.body as string);
    if (products.data && products.data.length > 0) {
      const product = products.data[Math.floor(Math.random() * products.data.length)];
      const detail = http.get(\`https://api.example.com/products/\${product.id}\`);
      check(detail, { 'product detail loaded': (r) => r.status === 200 });
    }
  });
  sleep(Math.random() * 5 + 2);
}

export function purchaseFlow() {
  const start = Date.now();

  group('Login', () => {
    const loginRes = http.post('https://api.example.com/auth/login', JSON.stringify({
      email: 'loadtest@example.com',
      password: 'testpassword',
    }), { headers: { 'Content-Type': 'application/json' } });

    loginErrors.add(loginRes.status !== 200);

    if (loginRes.status === 200) {
      const token = JSON.parse(loginRes.body as string).token;

      group('Checkout', () => {
        const cartRes = http.post('https://api.example.com/cart', JSON.stringify({
          productId: 'prod-001',
          quantity: 1,
        }), {
          headers: {
            'Content-Type': 'application/json',
            Authorization: \`Bearer \${token}\`,
          },
        });

        if (cartRes.status === 200) {
          const orderRes = http.post('https://api.example.com/orders', JSON.stringify({
            paymentMethod: 'test-card',
          }), {
            headers: {
              'Content-Type': 'application/json',
              Authorization: \`Bearer \${token}\`,
            },
          });

          check(orderRes, { 'order created': (r) => r.status === 201 });
          if (orderRes.status === 201) orderCount.add(1);
        }
      });
    }
  });

  checkoutTime.add(Date.now() - start);
  sleep(1);
}
\`\`\`

### JMeter: Enterprise-Grade Load Testing

JMeter is the workhorse of enterprise performance testing. Its GUI lets non-developers build complex test plans, and its plugin ecosystem covers every protocol imaginable -- HTTP, JDBC, JMS, FTP, LDAP, SMTP, and more.

A JMeter test plan in XML:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="API Load Test">
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
        <collectionProp name="Arguments.arguments">
          <elementProp name="BASE_URL" elementType="Argument">
            <stringProp name="Argument.name">BASE_URL</stringProp>
            <stringProp name="Argument.value">api.example.com</stringProp>
          </elementProp>
          <elementProp name="PROTOCOL" elementType="Argument">
            <stringProp name="Argument.name">PROTOCOL</stringProp>
            <stringProp name="Argument.value">https</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="API Users">
        <intProp name="ThreadGroup.num_threads">100</intProp>
        <intProp name="ThreadGroup.ramp_time">60</intProp>
        <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
          <intProp name="LoopController.loops">-1</intProp>
        </elementProp>
        <stringProp name="ThreadGroup.duration">300</stringProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy"
          testname="Get Products">
          <stringProp name="HTTPSampler.domain">\${BASE_URL}</stringProp>
          <stringProp name="HTTPSampler.protocol">\${PROTOCOL}</stringProp>
          <stringProp name="HTTPSampler.path">/api/v1/products</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
        <hashTree>
          <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion"
            testname="Status 200">
            <collectionProp name="Asserion.test_strings">
              <stringProp name="49586">200</stringProp>
            </collectionProp>
            <intProp name="Assertion.test_type">8</intProp>
            <intProp name="Assertion.test_field">2</intProp>
          </ResponseAssertion>
        </hashTree>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
\`\`\`

Run JMeter in non-GUI mode for CI integration:

\`\`\`bash
jmeter -n -t test-plan.jmx -l results.jtl -e -o report/ \\
  -JBASE_URL=api-staging.example.com \\
  -JTHREADS=200 \\
  -JRAMP_UP=120 \\
  -JDURATION=600
\`\`\`

### Gatling: High-Performance Simulation

Gatling excels at simulating high-throughput scenarios. Its async architecture generates more load per machine than JMeter, and its Scala DSL creates readable simulation scripts:

\`\`\`scala
// Gatling simulation (Scala)
class ApiLoadSimulation extends Simulation {
  val httpProtocol = http
    .baseUrl("https://api.example.com")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val searchProducts = scenario("Search Products")
    .exec(
      http("product_search")
        .get("/products")
        .queryParam("q", "laptop")
        .queryParam("page", "1")
        .check(status.is(200))
        .check(jsonPath("$.data").exists)
        .check(responseTimeInMillis.lte(500))
    )
    .pause(2, 5)

  setUp(
    searchProducts.inject(
      rampUsers(100).during(60),
      constantUsersPerSec(20).during(300),
      rampUsers(0).during(30)
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.percentile3.lt(800),
      global.successfulRequests.percent.gt(99.0)
    )
}
\`\`\`

### Artillery: YAML-First Load Testing

Artillery is ideal for teams that prefer configuration over code. Its YAML-first approach makes test scenarios readable and version-control friendly:

\`\`\`yaml
# artillery-config.yml
config:
  target: "https://api.example.com"
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak"
  defaults:
    headers:
      Content-Type: "application/json"
  plugins:
    expect: {}
  ensure:
    p95: 500
    maxErrorRate: 1

scenarios:
  - name: "Browse and Purchase"
    flow:
      - get:
          url: "/products"
          expect:
            - statusCode: 200
      - think: 3
      - post:
          url: "/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            - json: "$.token"
              as: "authToken"
          expect:
            - statusCode: 200
      - post:
          url: "/orders"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            productId: "prod-001"
            quantity: 1
          expect:
            - statusCode: 201
\`\`\`

Run with: \`artillery run artillery-config.yml\`

---

## Setting Thresholds and SLAs

Performance thresholds turn observational tests into automated gatekeepers. Define thresholds based on business requirements, not arbitrary numbers.

### Defining Meaningful Thresholds

Start with your SLA or SLO (Service Level Objective). If your SLA promises 99.9% uptime with sub-500ms response times, your thresholds should be stricter than the SLA to provide a safety margin:

\`\`\`typescript
// k6 thresholds aligned to SLA
export const options = {
  thresholds: {
    // SLA: p95 < 500ms. Test threshold: p95 < 400ms (80% of SLA)
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    // SLA: 99.9% success. Test threshold: 99.95% (stricter)
    http_req_failed: ['rate<0.0005'],
    // Custom business metrics
    checkout_duration: ['p(95)<2000'],
    search_latency: ['p(95)<200'],
    // Iteration duration (full user journey)
    iteration_duration: ['p(95)<10000'],
  },
};
\`\`\`

### Progressive Thresholds

Tighten thresholds as your system matures:

- **Phase 1**: Establish baselines. Record current performance without thresholds.
- **Phase 2**: Set relaxed thresholds at 150% of baseline. Catch major regressions.
- **Phase 3**: Tighten to 120% of baseline. Catch moderate regressions.
- **Phase 4**: Set thresholds at SLA values. Enforce production-grade performance.

---

## CI/CD Integration

### GitHub Actions with k6

\`\`\`yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM UTC

jobs:
  load-test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      app:
        image: your-app:latest
        ports:
          - 3000:3000
        env:
          DATABASE_URL: postgresql://test:test@postgres:5432/testdb
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Tests
        run: k6 run tests/performance/load-test.js --out json=results.json
        env:
          K6_BASE_URL: http://localhost:3000

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json

      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = fs.readFileSync('results.json', 'utf-8');
            // Parse and format results as PR comment
\`\`\`

### Automated Regression Detection

Compare results against a baseline to detect regressions:

\`\`\`typescript
// scripts/compare-results.ts
interface PerfBaseline {
  p95: number;
  p99: number;
  errorRate: number;
  throughput: number;
}

function detectRegression(current: PerfBaseline, baseline: PerfBaseline): string[] {
  const regressions: string[] = [];
  const threshold = 0.1; // 10% degradation tolerance

  if (current.p95 > baseline.p95 * (1 + threshold)) {
    regressions.push(\`p95 latency regression: \${current.p95}ms vs baseline \${baseline.p95}ms\`);
  }
  if (current.p99 > baseline.p99 * (1 + threshold)) {
    regressions.push(\`p99 latency regression: \${current.p99}ms vs baseline \${baseline.p99}ms\`);
  }
  if (current.errorRate > baseline.errorRate * 2) {
    regressions.push(\`Error rate regression: \${current.errorRate}% vs baseline \${baseline.errorRate}%\`);
  }
  if (current.throughput < baseline.throughput * (1 - threshold)) {
    regressions.push(\`Throughput regression: \${current.throughput} RPS vs baseline \${baseline.throughput} RPS\`);
  }

  return regressions;
}
\`\`\`

---

## Cloud-Based Distributed Testing

When a single machine cannot generate enough load, distribute tests across multiple regions using cloud services.

### k6 Cloud

\`\`\`typescript
// k6 cloud-ready test
export const options = {
  ext: {
    loadimpact: {
      projectID: 12345,
      name: 'Production Load Test',
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 40 },
        'amazon:eu:dublin': { loadZone: 'amazon:eu:dublin', percent: 30 },
        'amazon:ap:tokyo': { loadZone: 'amazon:ap:tokyo', percent: 30 },
      },
    },
  },
  scenarios: {
    global_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 500 },
        { duration: '10m', target: 500 },
        { duration: '5m', target: 0 },
      ],
    },
  },
};
\`\`\`

---

## Real-World Scenarios

### E-Commerce Flash Sale

\`\`\`typescript
export const options = {
  scenarios: {
    pre_sale_browsing: {
      executor: 'ramping-vus',
      startTime: '0s',
      stages: [
        { duration: '5m', target: 200 },
        { duration: '5m', target: 200 },
      ],
      exec: 'browseCatalog',
    },
    flash_sale_start: {
      executor: 'ramping-vus',
      startTime: '5m',
      stages: [
        { duration: '30s', target: 2000 },  // Sudden spike at sale start
        { duration: '10m', target: 2000 },   // Sustained high traffic
        { duration: '5m', target: 500 },      // Gradual decline
      ],
      exec: 'purchaseItem',
    },
  },
};
\`\`\`

### API Gateway Rate Limiting Validation

\`\`\`typescript
export default function () {
  const responses: number[] = [];

  for (let i = 0; i < 120; i++) {
    const res = http.get('https://api.example.com/products');
    responses.push(res.status);
  }

  const rateLimited = responses.filter((s) => s === 429).length;
  const successful = responses.filter((s) => s === 200).length;

  check(null, {
    'rate limiting activates': () => rateLimited > 0,
    'some requests succeed': () => successful > 0,
    'rate limit is within expected range': () => rateLimited >= 15 && rateLimited <= 25,
  });
}
\`\`\`

### Database Connection Pool Saturation

\`\`\`typescript
export const options = {
  scenarios: {
    heavy_queries: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 500,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Endpoint that triggers complex database queries
  const res = http.get('https://api.example.com/reports/sales?range=90d&groupBy=product');
  check(res, {
    'report generated': (r) => r.status === 200,
    'response in time': (r) => r.timings.duration < 3000,
  });
}
\`\`\`

---

## Performance Testing Anti-Patterns

**Testing only the happy path**: Real production traffic includes 404s, malformed requests, and slow queries. Include realistic error scenarios in your load profile.

**Using unrealistic think times**: Real users do not send requests as fast as possible. Use realistic pause times between requests (2-10 seconds) to simulate actual user behavior.

**Ignoring warm-up periods**: Application servers, JIT compilers, and connection pools need warm-up time. Always include a ramp-up phase and exclude the first few minutes from SLA calculations.

**Running tests from a single location**: Network latency varies by geography. Distributed tests from multiple regions give a more realistic picture of production performance.

**Not monitoring the test infrastructure**: If your load generator is CPU-saturated, your results are meaningless. Always monitor the machines running the tests alongside the system under test.

**Hardcoding test data**: A test that always searches for the same product or logs in with the same user does not exercise the full system. Use parameterized data and randomized access patterns.

---

## Integrating with QA Skills

For teams using AI coding agents, install performance testing skills to get framework-specific best practices:

\`\`\`bash
npx @qaskills/cli add k6-performance-testing
\`\`\`

Browse all 450+ QA skills at [qaskills.sh/skills](/skills).

---

## Conclusion

Performance testing is a discipline, not a checkbox. It requires understanding your system's architecture, defining meaningful metrics and thresholds, choosing the right tools for your tech stack, and integrating tests into your CI/CD pipeline so regressions are caught automatically.

Start with load tests that mirror production traffic patterns. Add stress tests to find breaking points. Run soak tests weekly to catch slow leaks. And always, always measure percentiles, not averages.

The tools are mature, the cloud infrastructure is available, and the cost of not testing is higher than ever. Make performance testing a first-class citizen in your engineering workflow.
`,
};
