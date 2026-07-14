import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Load Testing With p95 and p99 Latency Percentiles Guide',
  description:
    'A practical k6 load testing guide to p95 and p99 latency percentiles: why they beat averages, setting http_req_duration thresholds, load vs spike vs soak tests.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# k6 Load Testing With p95 and p99 Latency Percentiles Guide

If your load test report says "average response time: 180ms" and everyone nods, you are measuring the wrong thing. The average hides the customers who waited two seconds. Percentiles do not. p95 and p99 latency tell you what your slowest users actually experienced, and those slow users are the ones who churn, retry, and file support tickets. This guide shows how to run k6 load tests that measure and enforce percentile latency, how to set thresholds on \`http_req_duration\` at p(95) and p(99), the difference between load, spike, and soak tests, and how to read the results without fooling yourself.

k6 is an open-source load testing tool where you write your scenarios in JavaScript and the engine runs them in a high-performance Go runtime. That combination, familiar scripting language plus a fast executor, is why it has become a default choice for developer-owned performance testing. If you are choosing a tool, our [k6 vs JMeter comparison](/blog/k6-vs-jmeter-2026) walks through the trade-offs.

## Why Percentiles Beat Averages

An average is a single number that mixes fast and slow requests into a mush. Imagine 100 requests: 95 finish in 100ms and 5 finish in 5000ms. The average is 345ms, which sounds fine. But 5% of your users waited five seconds. The average told you a comforting lie.

Percentiles describe the distribution instead of collapsing it. p95 = 100ms means "95% of requests were at or below 100ms". p99 = 5000ms means "1% of requests were at or above 5000ms". Now you can see the tail, and the tail is where user pain lives.

| Metric | What it tells you | What it hides |
| --- | --- | --- |
| Average (mean) | Central tendency | The slow tail entirely |
| Median (p50) | The typical request | Anything above the halfway point |
| p90 | Most requests | The worst 10% |
| p95 | The common SLA line | The worst 5% |
| p99 | Near-worst experience | Only the extreme 1% |
| Max | The single worst case | Everything except one outlier |

The rule of thumb: set your SLA on p95 or p99, never on the average. At scale, p99 matters more than it looks. If a page makes 20 backend calls and each has a 1% chance of being slow, the probability that at least one call is slow on any given page load is roughly 18%. Tail latency compounds.

## Installing k6

k6 is a single binary. Install it with your package manager.

\`\`\`bash
# macOS
brew install k6

# Debian / Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring \\
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \\
  --keyserver hkp://keyserver.ubuntu.com:80 \\
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \\
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Verify
k6 version
\`\`\`

## Your First k6 Script

A k6 script exports an options object (how to run) and a default function (what each virtual user does on each iteration). Here is a minimal test.

\`\`\`js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10, // 10 virtual users
  duration: '30s', // for 30 seconds
};

export default function () {
  const res = http.get('https://test-api.example.com/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
  });

  sleep(1); // think time between iterations
}
\`\`\`

Run it:

\`\`\`bash
k6 run script.js
\`\`\`

At the end, k6 prints a summary. The line that matters most is \`http_req_duration\`, which reports avg, min, med, max, p(90), and p(95) out of the box.

## Setting Thresholds on p95 and p99

A test that only prints numbers is a dashboard, not a gate. Thresholds turn k6 into a pass/fail gate: if p95 exceeds your budget, k6 exits non-zero and your CI job fails. This is the whole point. Define thresholds in options.

\`\`\`js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    // 95% of requests must complete below 500ms
    // 99% of requests must complete below 1200ms
    http_req_duration: ['p(95)<500', 'p(99)<1200'],
    // Less than 1% of requests may fail
    http_req_failed: ['rate<0.01'],
    // Custom check pass rate must stay above 99%
    checks: ['rate>0.99'],
  },
};

export default function () {
  const res = http.get('https://test-api.example.com/products');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
\`\`\`

When you run this, k6 prints a green check or a red cross next to each threshold, and the process exit code reflects the result. Our dedicated [k6 thresholds and checks guide](/blog/k6-thresholds-checks-complete-guide) covers the full expression syntax, including per-scenario and per-tag thresholds.

### Threshold Expression Reference

| Expression | Meaning |
| --- | --- |
| \`p(95)<500\` | 95th percentile below 500ms |
| \`p(99)<1200\` | 99th percentile below 1200ms |
| \`avg<300\` | Mean below 300ms |
| \`med<200\` | Median below 200ms |
| \`max<3000\` | Slowest request below 3s |
| \`rate<0.01\` | Failure rate below 1% |
| \`count<100\` | Absolute count below 100 |

A healthy starting policy is one p95 threshold (your SLA) plus one p99 threshold (your tail budget) plus one \`http_req_failed\` rate threshold. Add more only when you have a reason.

## Load, Spike, and Soak: Choosing the Test Shape

The \`vus\` + \`duration\` shorthand is fine for a smoke test, but real performance testing shapes the load over time using \`stages\` or \`scenarios\`. The three canonical shapes answer different questions.

| Test type | Question it answers | Load profile |
| --- | --- | --- |
| Load test | Does the system meet its SLA at expected traffic? | Ramp to target, hold, ramp down |
| Stress test | Where does the system break? | Ramp past target until it fails |
| Spike test | Does the system survive a sudden surge? | Jump to very high load instantly |
| Soak test | Does the system degrade over hours? | Moderate load held for a long time |

### A Realistic Load Test

Ramp up so you do not shock the system, hold at target to measure steady-state percentiles, then ramp down.

\`\`\`js
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // ramp up to 100 VUs
    { duration: '5m', target: 100 }, // hold at 100 VUs (measure here)
    { duration: '2m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};
\`\`\`

### A Spike Test

Jump to a large VU count almost instantly to model a flash sale or a viral moment, then drop back.

\`\`\`js
export const options = {
  stages: [
    { duration: '10s', target: 20 }, // warm baseline
    { duration: '30s', target: 1000 }, // sudden spike
    { duration: '1m', target: 1000 }, // hold the spike
    { duration: '30s', target: 20 }, // recover
    { duration: '2m', target: 20 }, // observe recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'],
  },
};
\`\`\`

For spike tests, watch p99 during and immediately after the spike. A system that recovers cleanly returns to baseline percentiles within a minute. One that does not is leaking connections or queueing requests.

### A Soak Test

Hold a moderate load for hours to expose memory leaks, connection-pool exhaustion, and slow database bloat that only appears over time.

\`\`\`js
export const options = {
  stages: [
    { duration: '5m', target: 200 },
    { duration: '4h', target: 200 }, // the soak
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
  },
};
\`\`\`

The tell in a soak test is drift: if p95 is 300ms at hour one and 900ms at hour four under identical load, you have a leak.

## Custom Metrics and Trends

Built-in metrics cover HTTP timing, but you often want to measure something specific, like the latency of a single critical endpoint separated from the rest, or a business timing like "time to first search result". Use a \`Trend\` metric.

\`\`\`js
import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { check } from 'k6';

const searchLatency = new Trend('search_latency', true);

export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    'search_latency': ['p(95)<400', 'p(99)<900'],
  },
};

export default function () {
  const res = http.get('https://test-api.example.com/search?q=shoes');
  searchLatency.add(res.timings.duration);
  check(res, { 'search ok': (r) => r.status === 200 });
}
\`\`\`

The \`true\` second argument tells k6 to treat the values as time, so the summary prints them in milliseconds with percentiles. Now \`search_latency\` gets its own p95 and p99 in the report and its own threshold, isolated from noisier endpoints.

## Understanding the k6 Timing Breakdown

\`http_req_duration\` is the total, but k6 breaks it into sub-timings. When p99 is bad, these tell you where the time went.

| Timing metric | Phase it measures |
| --- | --- |
| \`http_req_blocked\` | Waiting for a free TCP connection / DNS |
| \`http_req_connecting\` | Establishing the TCP connection |
| \`http_req_tls_handshaking\` | TLS negotiation |
| \`http_req_sending\` | Uploading the request body |
| \`http_req_waiting\` | Server processing (time to first byte) |
| \`http_req_receiving\` | Downloading the response body |
| \`http_req_duration\` | Sum of sending + waiting + receiving |

If p99 is dominated by \`http_req_waiting\`, the server is slow. If it is dominated by \`http_req_blocked\` or \`http_req_connecting\`, you are running out of connections or hitting DNS, which is often a test-harness or network problem rather than an application one.

## Modeling Real Traffic With Arrival-Rate Executors

The \`vus\` model controls concurrency, but real production traffic is better described by a rate: requests per second, independent of how long each request takes. If a request slows down under load, a VU-based test sends fewer requests (each VU is stuck waiting), which masks the problem. An arrival-rate executor keeps the request rate constant and adds VUs as needed to sustain it, so a slowdown shows up as either a rising percentile or a shortfall in achieved rate.

\`\`\`js
export const options = {
  scenarios: {
    steady_traffic: {
      executor: 'constant-arrival-rate',
      rate: 200, // 200 iterations per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100, // VUs ready at start
      maxVUs: 500, // ceiling if requests slow down
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  http.get('https://test-api.example.com/products');
}
\`\`\`

| Executor | Controls | Use when |
| --- | --- | --- |
| \`constant-vus\` | Fixed concurrency | Simple steady load |
| \`ramping-vus\` | VUs over stages | Classic ramp/hold/ramp-down |
| \`constant-arrival-rate\` | Fixed requests/sec | Modeling production RPS |
| \`ramping-arrival-rate\` | Requests/sec over stages | Traffic that grows over time |

When you know your production peak is, say, 200 requests per second, \`constant-arrival-rate\` at \`rate: 200\` is the honest test. Watch \`maxVUs\`: if k6 warns it could not reach the target rate because it hit the VU ceiling, that is itself a finding, your system could not keep up.

## Exporting Results to Grafana

The terminal summary is fine for a quick run, but for trend analysis over many runs you want a time-series backend. k6 streams metrics to Prometheus, InfluxDB, or k6 Cloud, and Grafana visualizes them. Stream to Prometheus remote write:

\`\`\`bash
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \\
  k6 run \\
  --out experimental-prometheus-rw \\
  script.js
\`\`\`

In Grafana, plot \`http_req_duration\` at the p95 and p99 quantiles over the run duration. The shape you want is flat: percentiles that stay level as VUs climb mean the system scales. Percentiles that hockey-stick upward at a certain VU count reveal your capacity ceiling, which is exactly what a stress test is looking for.

You can also emit a machine-readable summary for CI artifacts:

\`\`\`bash
k6 run --summary-export=summary.json script.js
\`\`\`

## Running k6 in CI

Because thresholds control the exit code, wiring k6 into CI is mostly about running it and letting a red threshold fail the job.

\`\`\`yaml
name: performance

on:
  pull_request:
    paths:
      - 'src/**'

jobs:
  k6-load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring \\
            --keyring /usr/share/keyrings/k6-archive-keyring.gpg \\
            --keyserver hkp://keyserver.ubuntu.com:80 \\
            --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \\
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install k6

      - name: Run load test
        run: k6 run --summary-export=summary.json load-test.js

      - name: Upload summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-summary
          path: summary.json
\`\`\`

Keep CI runs short (a few minutes at moderate VUs) so feedback stays fast, and run the long soak tests on a nightly schedule against a staging environment.

## Reading Results Without Fooling Yourself

A few disciplines separate a trustworthy load test from theater:

1. **Measure the hold phase, not the ramp.** Percentiles collected while VUs are still ramping mix light and heavy load. Tag the steady-state window and read percentiles from there.
2. **Compare like with like.** A p95 of 400ms means nothing without the VU count and endpoint. Always report percentile plus load level plus target.
3. **Watch \`http_req_failed\` alongside duration.** A fast p95 with a 20% failure rate is not fast, it is broken. Errors often return quickly, which can artificially lower duration percentiles.
4. **Do not test from a laptop over WiFi.** Network jitter pollutes your timings. Run the generator close to the target, ideally in the same region.
5. **Establish a baseline and track drift.** One run is a snapshot. The value is comparing today's p99 to last week's under identical conditions.

For a broader treatment of test design, capacity planning, and result interpretation, see the [performance testing complete guide](/blog/performance-testing-complete-guide) and, if you are new to the discipline, the [load testing beginners guide](/blog/load-testing-beginners-guide).

## Setting Realistic Percentile Targets

A threshold is only useful if the number is defensible. Pulling "p95 under 200ms" out of the air leads to either a gate that never fails (too loose) or one that everyone learns to ignore (too tight). Derive your targets from three sources, in order of authority.

First, existing SLAs and SLOs. If your service already promises 99.9% availability and a 300ms response budget to internal or external consumers, your p95 and p99 thresholds should encode that promise directly. The load test becomes the mechanism that proves you keep it.

Second, real production percentiles. If you have observability in place, read the current p95 and p99 for the endpoint under real traffic and set your load-test threshold at or slightly below today's number, so the test fails if a change regresses live performance. This anchors the target in reality rather than aspiration.

Third, user-experience research where no SLA exists. The rough, widely cited guidance is that responses under roughly 100ms feel instant, under about one second keep the user's flow of thought intact, and beyond several seconds risk abandonment. Treat these as approximate design guidelines, not hard facts, and translate them into per-endpoint budgets: an autocomplete call needs a far tighter p99 than a monthly report export.

| Endpoint class | Reasonable p95 target | Reasonable p99 target |
| --- | --- | --- |
| Autocomplete / typeahead | under 100ms | under 250ms |
| Interactive read (page load API) | under 300ms | under 800ms |
| Write / transaction | under 500ms | under 1500ms |
| Heavy report / export | under 3000ms | under 8000ms |

These are starting points to calibrate against your own data, not universal truths. The discipline that matters is writing the target down as a threshold, tying it to a source, and letting CI enforce it so performance stops being a matter of opinion.

## Frequently Asked Questions

### What does p95 mean in load testing?

p95, the 95th percentile, is the response time below which 95% of requests completed. If p95 is 500ms, then 95 out of every 100 requests finished in 500ms or less, and 5 took longer. It is a common SLA line because it captures the experience of nearly all users while ignoring rare extreme outliers.

### Why use p99 instead of the average response time?

The average blends fast and slow requests into one number and hides the slow tail. p99 shows what your slowest 1% of users experienced. At scale that tail matters: a single page making many backend calls is very likely to hit at least one slow call, so tail latency drives real user pain that the average conceals entirely.

### How do I set a p95 threshold in k6?

Add a \`thresholds\` block to your options object with the metric and expression, for example \`http_req_duration: ['p(95)<500']\`. When you run the test, k6 evaluates the percentile against the budget and exits non-zero if it fails, which lets a CI job fail the build automatically on a performance regression.

### What is the difference between a load test and a soak test?

A load test ramps to expected traffic, holds briefly, and checks that the system meets its SLA. A soak test holds a moderate load for hours to expose problems that only appear over time, like memory leaks, connection-pool exhaustion, and gradual latency drift. Both matter: load tests catch capacity issues, soak tests catch stability issues.

### How many virtual users equals real-world traffic?

There is no fixed conversion because it depends on think time and request rate per user. A VU with one second of sleep between iterations sends far fewer requests than one with no sleep. Model traffic by target requests per second rather than raw VUs, using k6's \`constant-arrival-rate\` executor, so results map to real load.

### Can k6 export results to Grafana?

Yes. k6 streams metrics to Prometheus (via remote write), InfluxDB, or k6 Cloud, and Grafana visualizes them. A common setup uses \`--out experimental-prometheus-rw\` to push to Prometheus, then a Grafana dashboard plots \`http_req_duration\` at the p95 and p99 quantiles over time so you can watch percentiles as load ramps.

### Should thresholds fail my CI build?

Yes, that is their purpose. Thresholds make k6 exit with a non-zero status when a percentile or failure-rate budget is breached, which fails the CI job. Treat a breached p95 or p99 threshold like a failing unit test: it is a performance regression that should block the merge until it is understood and fixed.

## Conclusion

Averages comfort you; percentiles tell you the truth. By measuring p95 and p99 on \`http_req_duration\`, setting them as thresholds so CI fails on a regression, and choosing the right test shape (load, spike, or soak) for the question you are asking, k6 turns performance from a vague worry into a measurable, enforceable gate. Add custom \`Trend\` metrics for your critical endpoints, watch the timing breakdown when the tail goes bad, and stream everything to Grafana so you can track drift over time.

Write your first threshold-gated k6 script today, run it against staging, and read the p99 line before the average. Then explore the [k6 thresholds and checks guide](/blog/k6-thresholds-checks-complete-guide) on qaskills.sh and grab a ready-made load-testing skill from the catalog to standardize performance gates across your team.
`,
};
