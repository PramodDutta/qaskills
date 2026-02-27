import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Load Testing — A Practical Guide to Performance Under Pressure',
  description:
    'Complete guide to load testing fundamentals. Covers load vs stress vs spike testing, test scenario design, metrics, tools comparison, and CI/CD integration.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Every application has a breaking point. The question is whether you discover it during a controlled load test or during a production outage at 2 AM when your biggest customer is running a flash sale. **Load testing** is the discipline of deliberately pushing your system to its limits -- under conditions you control -- so you can find bottlenecks, validate capacity plans, and ship with confidence that your infrastructure will hold when real users arrive.

Despite its importance, load testing remains one of the most neglected areas of QA. Teams invest heavily in functional test automation but treat performance as an afterthought. The result is predictable: production incidents caused by slow database queries under concurrent load, connection pool exhaustion during traffic spikes, and memory leaks that only surface after hours of sustained usage.

This guide gives you a practical introduction to **performance testing**. You will learn the different test types, the metrics that matter, how to design realistic scenarios, which **load testing tools** to use, how to run your first test with k6, how to interpret results, and how to integrate performance validation into your CI/CD pipeline.

---

## Key Takeaways

- **Load testing** simulates concurrent users against your system to identify performance limits, bottlenecks, and failure modes before they impact production
- Understanding the differences between **load testing**, **stress testing**, spike testing, and soak testing helps you choose the right test type for each scenario
- The five critical metrics to monitor are **response time** (p50, p95, p99), **throughput** (requests per second), **error rate**, **concurrent users**, and the **saturation point** where performance degrades
- Realistic test scenarios require modeling actual user journeys with think time, ramp-up patterns, and representative data -- not just hammering a single endpoint
- Modern **load testing tools** like k6, Gatling, and Locust offer code-first approaches that integrate naturally into CI/CD pipelines, while JMeter remains strong for GUI-driven test design
- AI coding agents can automate load test creation and scenario generation using installable QA skills from [QASkills.sh](/skills)

---

## What Is Load Testing?

**Load testing** is a type of performance testing that simulates expected concurrent user traffic against your application to measure how it behaves under anticipated production conditions. The goal is to verify that your application meets its performance requirements -- response times, throughput, error rates -- when a realistic number of users are interacting with it simultaneously.

Load testing answers a deceptively simple question: "Can my system handle the expected traffic?" But beneath that question lies a web of dependencies -- database connection pools, thread pools, memory allocation, network bandwidth, and third-party API rate limits that interact in surprising ways under concurrent load.

Understanding where load testing fits within the broader **performance testing** landscape is essential. There are several distinct test types, each designed to answer a different question:

| Test Type | What It Does | Question It Answers | Traffic Pattern |
|---|---|---|---|
| **Load testing** | Simulates expected concurrent users | Can we handle normal production traffic? | Gradual ramp to expected peak, sustain, ramp down |
| **Stress testing** | Pushes beyond expected capacity | Where does the system break? | Ramp beyond expected limits until failure |
| **Spike testing** | Sudden dramatic traffic increase | Can we handle sudden traffic bursts? | Instant jump from low to very high load |
| **Soak testing** | Sustained load over extended time | Are there memory leaks or resource depletion? | Steady moderate load for hours or days |
| **Capacity testing** | Incrementally increases load | What is the maximum supported capacity? | Step-wise increase, measuring at each level |

**Load testing** is the foundation. You start by validating that your system meets requirements under expected conditions. **Stress testing** takes you beyond those conditions to find the breaking point. **Spike testing** validates your system's resilience to sudden, unpredictable traffic surges -- think a product going viral on social media or a flash sale going live. **Soak testing** reveals problems that only manifest over time, like memory leaks, database connection leaks, or log file growth that eventually fills a disk. **Capacity testing** gives you the data you need for capacity planning and autoscaling configuration.

Most teams should start with load testing at expected peak traffic levels, then add stress testing to understand their safety margin, and finally introduce soak testing for long-running systems. Spike testing becomes essential if your application has unpredictable traffic patterns.

---

## Key Performance Metrics

The value of a load test depends entirely on measuring the right things. Raw numbers like "we handled 1,000 requests" are meaningless without context. You need to track specific metrics that tell you whether the system is healthy, degraded, or failing -- and where the bottleneck is.

### Response Time (Latency)

**Response time** measures how long it takes for a request to receive a complete response. A single average response time is dangerously misleading -- if your average is 200ms but 5% of users experience 3-second response times, the average hides a serious problem.

Track **percentile response times** instead:

- **p50 (median)**: The response time that 50% of requests are faster than. This is your "typical" user experience
- **p95**: 95% of requests are faster than this value. This catches the "slow tail" that averages miss
- **p99**: 99% of requests complete within this time. This reveals worst-case scenarios for real users

The difference between p50 and p99 is where the interesting performance stories live. A system with p50 = 100ms and p99 = 150ms is healthy and consistent. A system with p50 = 100ms and p99 = 5,000ms has a severe tail latency problem that needs investigation -- likely caused by garbage collection pauses, database lock contention, or cache misses.

### Throughput (Requests Per Second)

**Throughput** measures the number of requests your system processes per unit of time, typically expressed as **requests per second (RPS)**. Throughput and response time are inversely related under load. As you add concurrent users, throughput initially increases linearly. At the saturation point, adding more users no longer increases throughput -- requests queue, response times climb, and eventually throughput decreases as the system spends more time on contention than useful work.

### Error Rate

**Error rate** is the percentage of requests that result in errors (HTTP 5xx responses, timeouts, connection failures). A healthy system under load should maintain an error rate below 1%. An error rate that climbs as load increases is a strong signal that you are approaching the system's capacity limits.

### Concurrent Users

**Concurrent users** (virtual users or VUs) is the number of simulated users executing scenarios simultaneously. A single user executing a multi-step journey generates multiple requests with think time between them -- so VUs and RPS are not the same metric.

### Saturation Point

The **saturation point** is the load level at which adding more users stops improving throughput and starts degrading it. Ideally, your expected peak traffic is well below this point, giving you a safety margin for unexpected spikes.

### Acceptable Thresholds

What counts as "acceptable" depends on your application type and user expectations, but here are common industry thresholds:

| Metric | Good | Acceptable | Poor |
|---|---|---|---|
| **p50 response time** | < 200ms | < 500ms | > 1s |
| **p95 response time** | < 500ms | < 1s | > 3s |
| **p99 response time** | < 1s | < 2s | > 5s |
| **Error rate** | < 0.1% | < 1% | > 5% |
| **Throughput stability** | Linear to peak | Plateaus at peak | Drops under load |

These are starting points. Adjust based on your application type -- an internal batch API can tolerate higher latencies than a consumer-facing search endpoint.

---

## Designing Load Test Scenarios

The most common mistake in load testing is unrealistic scenario design. Hammering a single endpoint with as many requests as possible tells you almost nothing about how your system will behave in production. Real users do not send 10,000 GET requests per second to the same URL. They browse, search, add items to a cart, check out, and leave -- with pauses between each action.

### User Journey Modeling

Start by identifying the **critical user journeys** in your application. These are the workflows that generate the most traffic and carry the most business value. For an e-commerce site, the critical journeys might be:

1. **Browse and search** (60% of traffic): Homepage, category page, search, product detail page
2. **Add to cart** (25% of traffic): Browse, add item, view cart, update quantities
3. **Checkout** (10% of traffic): Cart, shipping info, payment, order confirmation
4. **Account management** (5% of traffic): Login, order history, profile update

Each journey is a sequence of HTTP requests with **think time** between them -- the pauses where a real user reads a page, fills in a form, or decides what to do next. Think time typically ranges from 1-5 seconds for browsing and 10-30 seconds for form-filling.

### Ramp-Up Patterns

How you increase load matters as much as the final load level. There are three common ramp-up patterns:

**Linear ramp-up** gradually increases users at a constant rate. You start at zero, ramp to your target over a few minutes, sustain, and ramp down. This gives the system time to warm caches, establish connection pools, and reach steady state.

**Stepped ramp-up** increases load in discrete steps, holding each level before adding more users. This is ideal for **capacity testing** because you can observe behavior at each load level and identify exactly where performance starts degrading.

**Spike ramp-up** instantly jumps to a high load level with no warm-up. This simulates sudden traffic bursts and tests autoscaling triggers, cold cache behavior, and connection pool initialization under pressure.

### Scenario Design Example: E-Commerce Site

Here is a concrete example of how you would design a load test scenario for an e-commerce application expecting 500 concurrent users at peak:

**Step 1: Define user distribution**

| Journey | % of Users | Concurrent VUs | Steps | Avg Think Time |
|---|---|---|---|---|
| Browse/search | 60% | 300 | 5 pages | 3s |
| Add to cart | 25% | 125 | 4 pages + 2 API calls | 5s |
| Checkout | 10% | 50 | 6 pages + payment API | 8s |
| Account mgmt | 5% | 25 | 3 pages | 4s |

**Step 2: Calculate expected throughput**

For the browse journey: 300 users x 5 pages / 3s think time = ~500 RPS from browsing alone. Add the other journeys and you get an estimated total throughput of ~800-1,000 RPS at peak.

**Step 3: Design the test profile**

- **Ramp-up**: 0 to 500 VUs over 5 minutes (linear)
- **Sustain**: Hold 500 VUs for 15 minutes
- **Ramp-down**: 500 to 0 VUs over 2 minutes

**Step 4: Define pass/fail criteria**

- p95 response time < 1s for all endpoints
- p99 response time < 3s for all endpoints
- Error rate < 1%
- Throughput sustains at 800+ RPS during the sustain phase

This structured approach ensures your load test reflects real-world usage patterns rather than synthetic traffic that tells you nothing useful.

---

## Load Testing Tools Compared

The **load testing tools** landscape has evolved significantly. Modern tools emphasize code-first test definition, lightweight execution, and native CI/CD integration.

| Tool | Language | Protocol Support | Cloud Option | Learning Curve | Best For |
|---|---|---|---|---|---|
| **k6** | JavaScript (Go runtime) | HTTP, WebSocket, gRPC, Browser | Grafana Cloud k6 | Low | Developers, CI/CD pipelines |
| **JMeter** | XML/GUI (Java runtime) | HTTP, JDBC, JMS, LDAP, FTP, SOAP | BlazeMeter, OctoPerf | Medium | GUI-driven test design, legacy protocols |
| **Gatling** | Scala/Java DSL | HTTP, WebSocket, JMS | Gatling Enterprise | Medium | Scala/JVM teams, detailed reports |
| **Locust** | Python | HTTP (extensible) | Locust Cloud | Low | Python teams, custom protocols |
| **Artillery** | YAML/JavaScript (Node.js) | HTTP, WebSocket, Socket.IO | Artillery Cloud | Low | Node.js teams, quick setup |

**k6** is the standout choice for most modern teams. Written in Go for high performance, it uses JavaScript for test scripting -- meaning virtually any developer can write load tests. It runs as a single binary with zero dependencies, supports thresholds for automated pass/fail decisions, and integrates seamlessly into CI/CD pipelines.

**JMeter** is the legacy heavyweight with the broadest protocol support, including JDBC, JMS, LDAP, and FTP. Its GUI makes it accessible to non-developers, but XML-based test plans are painful to version control.

**Gatling** appeals to Scala and JVM teams with a readable DSL and excellent built-in HTML reports.

**Locust** is the Pythonic choice -- familiar syntax, distributed mode for scaling, and easy extensibility for custom protocols.

**Artillery** is the quickest to start with. YAML-based configuration requires almost no programming knowledge, with JavaScript available for complex scenarios and strong Socket.IO support for real-time applications.

For a deep dive into the two most popular tools, see our guide on [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing).

---

## Your First Load Test with k6

Let us walk through writing, running, and understanding your first **load test** using k6. This example tests a REST API with realistic stages, thresholds, checks, and custom metrics.

### Install k6

\`\`\`bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <script.js
\`\`\`

### Write the Test Script

Create a file called \`load-test.js\`:

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('custom_error_rate');
const loginDuration = new Trend('login_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '5m', target: 50 },   // Hold 50 users for 5 minutes
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Hold 100 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    custom_error_rate: ['rate<0.05'],
  },
};

const BASE_URL = 'https://api.example.com';

export default function () {
  // Step 1: Browse products
  const productsRes = http.get(\`\${BASE_URL}/api/products?page=1&limit=20\`);

  check(productsRes, {
    'products: status 200': (r) => r.status === 200,
    'products: has items': (r) => JSON.parse(r.body).length > 0,
    'products: response < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(productsRes.status !== 200);
  sleep(Math.random() * 3 + 1); // Think time: 1-4 seconds

  // Step 2: View product detail
  const productId = Math.floor(Math.random() * 100) + 1;
  const detailRes = http.get(\`\${BASE_URL}/api/products/\${productId}\`);

  check(detailRes, {
    'detail: status 200': (r) => r.status === 200,
    'detail: has name': (r) => JSON.parse(r.body).name !== undefined,
  });

  errorRate.add(detailRes.status !== 200);
  sleep(Math.random() * 5 + 2); // Think time: 2-7 seconds

  // Step 3: Login (for 30% of iterations)
  if (Math.random() < 0.3) {
    const loginStart = Date.now();
    const loginRes = http.post(
      \`\${BASE_URL}/api/auth/login\`,
      JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    loginDuration.add(Date.now() - loginStart);

    check(loginRes, {
      'login: status 200': (r) => r.status === 200,
      'login: has token': (r) => JSON.parse(r.body).token !== undefined,
    });

    errorRate.add(loginRes.status !== 200);
    sleep(1);
  }
}
\`\`\`

### Run the Test

\`\`\`bash
k6 run load-test.js
\`\`\`

### Reading the Output

k6 produces a summary at the end of the test that looks like this:

\`\`\`
     checks.........................: 95.23% 4812 out of 5053
     custom_error_rate...............: 2.10%  106 out of 5053
     data_received..................: 12 MB  75 kB/s
     data_sent......................: 1.2 MB 7.5 kB/s
     http_req_blocked...............: avg=2.1ms  p(95)=8.3ms   p(99)=25.1ms
     http_req_duration..............: avg=189ms  p(95)=412ms   p(99)=987ms
       { expected_response:true }...: avg=178ms  p(95)=389ms   p(99)=892ms
     http_req_failed................: 2.10%  106 out of 5053
     http_reqs......................: 5053   31.58/s
     iteration_duration.............: avg=6.23s  p(95)=12.1s   p(99)=18.3s
     iterations.....................: 1823   11.39/s
     login_duration.................: avg=245ms  p(95)=512ms   p(99)=1123ms
     vus............................: 1      min=1   max=100
     vus_max........................: 100    min=100 max=100
\`\`\`

The key lines to focus on are **http_req_duration** (your response time percentiles), **http_req_failed** (your error rate), **http_reqs** (your throughput), and any custom metrics you defined. If any threshold is breached, k6 exits with a non-zero exit code -- which makes it perfect for CI/CD gates.

---

## Interpreting Results

Running a load test is only half the job. The real value comes from interpreting the results correctly and translating them into actionable engineering decisions.

### Identifying the Breaking Point

The **breaking point** (or saturation point) is where your system transitions from "handling load well" to "struggling." You can identify it by looking for these signals:

- **Response time inflection**: p95 response times suddenly climb from a stable plateau to an exponential curve
- **Throughput plateau**: RPS stops increasing despite adding more virtual users
- **Error rate spike**: Errors jump from near-zero to a significant percentage
- **Resource saturation**: CPU, memory, or database connections hit their limits

When you plot response time and throughput against concurrent users on the same graph, the breaking point becomes visually obvious. Response time stays flat while throughput climbs linearly, then both curves change direction at the saturation point. This is the single most valuable chart in load testing.

### Correlation Between Response Time and Throughput

A healthy system shows three distinct phases under increasing load:

**Phase 1 -- Linear scaling**: Throughput increases proportionally with users. Response times remain stable. The system has spare capacity and handles each request without queuing.

**Phase 2 -- Saturation**: Throughput plateaus. Response times begin climbing. The system is running at capacity, and new requests are starting to queue behind existing ones. This is your maximum sustainable throughput.

**Phase 3 -- Degradation**: Throughput actually decreases. Response times spike. Error rates climb. The system is overwhelmed -- spending more time on context switching, lock contention, and garbage collection than on processing requests. Adding more users makes everything worse.

Your target operating range is comfortably within Phase 1, with your expected peak traffic well below the Phase 2 transition point.

### When to Stop Ramping

During a stress test or capacity test, you need to know when to stop adding load. Stop ramping when:

- **Error rate exceeds 10%**: The system is breaking, and pushing harder provides no new information
- **Response times exceed 10x your SLA**: Users at this latency level would have already abandoned the page
- **Infrastructure alerts fire**: CPU at 100%, out-of-memory errors, disk full -- the bottleneck is identified
- **Downstream services fail**: Third-party APIs, databases, or message queues are returning errors

Continuing past these points risks crashing your test environment or affecting shared downstream services.

---

## Common Performance Bottlenecks

When a load test reveals performance problems, you need to identify the root cause. Bottlenecks fall into four categories, each requiring a different diagnostic approach.

### Database Bottlenecks

The database is the most common bottleneck. **Slow queries** that perform acceptably with one user become catastrophic with 100 concurrent users competing for table locks and disk I/O. Use slow query logs and explain plans to identify offenders. **Connection pool exhaustion** happens when your application opens more connections than the pool allows -- new requests queue, creating cascading delays. Monitor pool utilization and optimize slow queries to release connections faster. **Lock contention** occurs when multiple transactions modify the same rows simultaneously. Consider optimistic locking or Redis-based counters for high-contention operations.

### Application Bottlenecks

**Thread starvation** happens in thread-pool-based servers when all threads are occupied by slow requests. Monitor pool utilization and consider async architectures for I/O-bound operations. **Memory leaks** are insidious -- a small leak that accumulates 1MB per hour becomes 100MB per hour at 100x traffic. Soak tests are the primary detection tool. **Garbage collection pressure** in JVM and .NET applications causes "stop the world" pauses that appear as p99 latency spikes under load.

### Infrastructure Bottlenecks

**CPU saturation** is the most straightforward bottleneck -- when utilization exceeds 80%, you need vertical scaling, horizontal scaling, or code optimization. **Disk I/O** bottlenecks surface with heavy file operations or database activity on the same machine. Monitor IOPS, latency, and queue depth.

### Network Bottlenecks

**Bandwidth saturation** can surface when serving large files or image-heavy responses. Monitor throughput and consider CDN offloading. **DNS resolution** delays add latency to every outbound request -- use connection pooling and DNS caching to minimize overhead.

For each bottleneck type, follow the same pattern: **monitor** resource utilization, **correlate** saturation with observed degradation, **identify** the specific cause, and **fix** the root cause rather than just adding resources.

---

## CI/CD Integration

The highest-value evolution in **performance testing** is moving from manual, periodic load tests to automated regression detection in every CI/CD pipeline -- making load testing a continuous quality gate rather than a one-time activity.

### Automated Performance Regression Detection

Run a load test on every deployment and fail the build if performance has regressed. k6 makes this straightforward -- define performance requirements as thresholds, and k6 returns a non-zero exit code if any are breached.

\`\`\`yaml
# .github/workflows/performance.yml
name: Performance Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start application
        run: docker compose up -d
        working-directory: ./deploy

      - name: Wait for app to be ready
        run: |
          for i in {1..30}; do
            curl -s http://localhost:3000/health && break
            sleep 2
          done

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install k6

      - name: Run load test
        run: k6 run --out json=results.json tests/load/baseline.js

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: results.json
\`\`\`

### Baseline Comparison

The most effective CI/CD performance gate compares current results against a **baseline** -- a known-good performance profile from a previous release. Instead of static thresholds, compare p95 response times against the last release and flag regressions greater than 10-20%. This catches gradual degradation that absolute thresholds miss -- if p95 climbed from 200ms to 240ms, a static "p95 < 500ms" threshold passes, but a baseline comparison correctly flags the 20% regression.

### Threshold-Based Gates

For teams starting with CI/CD performance testing, threshold-based gates are the simplest approach. Define your thresholds in the k6 script, and the pipeline fails if any are breached:

\`\`\`javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],
  },
};
\`\`\`

This ensures no deployment proceeds unless it meets the minimum performance bar. For more on building robust testing pipelines, see our guide on [CI/CD testing pipelines with GitHub Actions](/blog/cicd-testing-pipeline-github-actions). And for a detailed comparison of the most popular performance testing tools in a pipeline context, check out [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing).

---

## Automate Load Testing with AI Agents

Writing effective load tests requires understanding your application's architecture, identifying critical user journeys, and translating those journeys into realistic test scenarios. AI coding agents can accelerate this process significantly when equipped with the right QA skills.

Install **performance testing skills** into your AI coding agent to generate load test scripts, design realistic scenarios, and analyze results:

\`\`\`bash
npx @qaskills/cli add k6-performance
\`\`\`

This skill teaches your AI agent k6 best practices, including proper staging configurations, threshold definitions, custom metrics, and result interpretation. Your agent will generate production-quality load test scripts instead of naive single-endpoint hammering.

For scenario design assistance:

\`\`\`bash
npx @qaskills/cli add performance-test-scenario-generator
\`\`\`

This skill helps your agent model realistic user journeys, calculate expected throughput, define ramp-up profiles, and set appropriate pass/fail thresholds based on your application's performance requirements.

Browse all available QA skills at [qaskills.sh/skills](/skills) or get started with the CLI at [getting started](/getting-started).

---

## Frequently Asked Questions

### How many virtual users should I use in a load test?

The number of virtual users should reflect your expected production traffic, not an arbitrary round number. Analyze your production analytics: peak concurrent sessions, requests per second, and geographic distribution. Target your actual expected peak plus a 20-50% buffer for safety margin. If you lack production data, use your best estimate and refine as real data becomes available.

### How long should a load test run?

A standard **load test** should sustain peak traffic for at least 15-30 minutes after the ramp-up period completes. This gives the system time to reach a steady state where caches are warm, connection pools are populated, and any lazy initialization has completed. For **soak testing**, run for 4-12 hours to detect memory leaks and resource exhaustion. For quick regression checks in CI/CD, a 5-minute test with a 2-minute ramp-up is usually sufficient to detect major regressions without slowing down the pipeline.

### Should I load test in production or a staging environment?

Both have trade-offs. **Staging environments** are safer but rarely match production in infrastructure, data volume, or third-party behavior. **Production load testing** gives the most realistic results but carries risk. Many teams use a hybrid approach: comprehensive tests against staging with production-like data, supplemented by low-volume synthetic tests in production. Never run destructive stress tests against production without safeguards.

### What is the difference between load testing and stress testing?

**Load testing** validates that your system meets performance requirements under expected traffic conditions. You simulate the number of users you actually expect and verify that response times, throughput, and error rates stay within acceptable bounds. **Stress testing** deliberately pushes beyond expected limits to find the breaking point. The goal of stress testing is not to pass -- it is to find where the system fails so you can understand your safety margin and plan capacity accordingly. Load testing answers "can we handle normal traffic?" while stress testing answers "what happens when traffic exceeds our plans?"

### How do I load test a system with authentication?

Most **load testing tools** support authenticated scenarios. In k6, perform a login request at the beginning of your iteration and use the returned token for subsequent requests. For OAuth2 flows, generate tokens in the \`setup()\` function and share them across virtual users. For session-based auth, k6 automatically handles cookies per VU. Do not skip auth in your load tests -- authentication middleware is often a significant source of latency under load.
`,
};
