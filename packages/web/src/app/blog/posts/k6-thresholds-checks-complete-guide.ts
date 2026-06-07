import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Thresholds and Checks Complete Guide: Pass/Fail CI 2026',
  description:
    'k6 thresholds vs checks in 2026: http_req_duration and http_req_failed gates, abortOnFail, tagged and per-scenario thresholds, custom metrics, and failing CI.',
  date: '2026-06-07',
  category: 'Guide',
  content: `
# k6 Thresholds and Checks Complete Guide: Pass/Fail CI (2026)

A load test that prints latency numbers but never fails a build is just an expensive screensaver. The whole point of performance testing in CI is a clear, automated pass/fail verdict: if p95 latency crosses your budget or the error rate spikes, the pipeline goes red and the bad change does not ship. In [k6](https://k6.io/), the current Grafana load-testing tool, that verdict comes from two features people constantly confuse: **checks** and **thresholds**. They look similar, they are written near each other, and only one of them actually fails your build.

This guide untangles checks versus thresholds once and for all, on the current k6 line in 2026. We will cover check syntax, threshold expressions on built-in metrics like \`http_req_duration\` and \`http_req_failed\`, \`abortOnFail\` for early exit, per-scenario and tagged thresholds, the four custom metric types (Trend, Counter, Rate, Gauge), how thresholds make CI fail with the right exit code, and grouping. If you are weighing tools, our [k6 vs JMeter comparison](/blog/k6-vs-jmeter-performance-testing) covers the broader trade-offs; here we go deep on getting a reliable gate.

If you would rather have an AI coding agent write your k6 scripts, define sensible thresholds, and wire the exit code into CI, install a [k6 performance testing skill](/skills) into Claude Code, Cursor, or Copilot.

## Checks vs Thresholds: The Core Difference

This is the distinction that matters most, so we lead with it. **Checks are assertions that record a true/false result but never, by themselves, fail the test.** A failed check is logged, counted, and shown in the summary, but k6 still exits with code 0. **Thresholds are pass/fail criteria evaluated against a metric, and a breached threshold makes k6 exit non-zero, which fails your CI build.**

In short: checks tell you *what happened*; thresholds *decide the verdict*. You almost always want both. Checks give you granular, per-request validation and a human-readable summary; thresholds turn aggregate signals (including the rate of failing checks) into a gate.

\`\`\`javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  thresholds: {
    // A THRESHOLD: breaching this exits non-zero and fails CI.
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://test.k6.io');
  // A CHECK: records pass/fail but does NOT fail the test on its own.
  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
  });
}
\`\`\`

Here is the difference at a glance:

| Aspect | Checks | Thresholds |
|---|---|---|
| Purpose | Validate individual responses | Gate the whole test result |
| Failure effect | Logged and counted only | Non-zero exit, fails CI |
| Scope | Per-iteration / per-request | Aggregate over a metric |
| Defined in | \`check()\` calls in code | \`options.thresholds\` |
| Typical use | "status is 200", "has token" | "p95 < 500ms", "error rate < 1%" |

The classic mistake is relying on checks alone, seeing red "checks failed" in the output, and assuming CI will catch it. It will not. To fail the build on failing checks, add a threshold on the built-in \`checks\` metric, shown later.

## Writing Checks: Boolean Assertions

A \`check\` evaluates one or more boolean functions against a value (usually an HTTP response) and records each result. Checks are cheap and you should use them liberally to validate correctness during a load test.

\`\`\`javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.post('https://api.example.com/login', {
    username: 'tester',
    password: 'secret',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response under 800ms': (r) => r.timings.duration < 800,
    'returns a token': (r) => r.json('token') !== undefined,
    'content-type is json': (r) =>
      r.headers['Content-Type'].includes('application/json'),
  });
}
\`\`\`

Each key is a human-readable label and each value is a function returning a boolean. k6 aggregates these into the \`checks\` metric (a Rate of how many passed). Note that a thrown exception inside a check function counts as a failed check, not a crash, so checks are safe even on malformed responses.

You can tag checks to slice them later, which pairs powerfully with tagged thresholds:

\`\`\`javascript
check(res, { 'login ok': (r) => r.status === 200 }, { endpoint: 'login' });
\`\`\`

## Threshold Syntax on Built-in Metrics

Thresholds live in \`options.thresholds\`, keyed by metric name, with an array of expression strings. Each expression is a boolean over an aggregation of that metric. If any expression evaluates false at the end of the test, that threshold fails and k6 exits non-zero.

The two most important built-in metrics are \`http_req_duration\` (response time, a Trend) and \`http_req_failed\` (the request error rate, a Rate).

\`\`\`javascript
export const options = {
  thresholds: {
    // 95th percentile under 500ms AND 99th under 1000ms.
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Less than 1% of requests may fail.
    http_req_failed: ['rate<0.01'],
    // Median (p50) under 200ms, average under 300ms.
    'http_req_duration{expected_response:true}': ['p(50)<200', 'avg<300'],
  },
};
\`\`\`

Different metric types support different aggregation methods inside the expression:

| Metric type | Valid aggregations | Example expression |
|---|---|---|
| Trend (e.g. \`http_req_duration\`) | \`avg\`, \`min\`, \`max\`, \`med\`, \`p(N)\` | \`p(95)<500\` |
| Rate (e.g. \`http_req_failed\`) | \`rate\` | \`rate<0.01\` |
| Counter (e.g. \`http_reqs\`) | \`count\`, \`rate\` | \`count>10000\` |
| Gauge | \`value\` | \`value<100\` |

A few common, battle-tested thresholds you can copy:

\`\`\`javascript
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],          // < 1% errors
    http_req_duration: ['p(95)<500'],        // p95 latency budget
    http_reqs: ['count>1000'],               // sanity: did the test do enough work
    checks: ['rate>0.99'],                   // > 99% of checks must pass
  },
};
\`\`\`

That last one, a threshold on the \`checks\` metric, is the bridge that finally makes failing checks fail your build.

## abortOnFail: Stopping Early

By default a threshold is only evaluated at the *end* of the test, so even a hopelessly failing run consumes its full duration. The object form of a threshold lets you abort early with \`abortOnFail\`, which stops the test as soon as the threshold is breached (after an optional grace period). This saves time and CI minutes when a build is clearly broken.

\`\`\`javascript
export const options = {
  thresholds: {
    http_req_failed: [
      {
        threshold: 'rate<0.05',
        abortOnFail: true,
        delayAbortEval: '30s', // give it 30s of warm-up before evaluating
      },
    ],
    http_req_duration: [{ threshold: 'p(95)<800', abortOnFail: true }],
  },
};
\`\`\`

\`delayAbortEval\` is important: without it, the very first few requests during ramp-up can trip a sensitive rate threshold and kill the test before it represents steady state. A 30-second grace period lets the system warm up before the gate is armed.

| Threshold form | Behavior |
|---|---|
| \`'p(95)<500'\` (string) | Evaluated only at test end |
| \`{ threshold: 'rate<0.05', abortOnFail: true }\` | Aborts mid-test when breached |
| \`{ ..., delayAbortEval: '30s' }\` | Waits 30s before arming the abort |

## Per-Scenario and Tagged Thresholds

Real tests have multiple endpoints with different budgets: a static asset should be far faster than a search query. Thresholds support tag filters using the \`metric{tag:value}\` syntax, so you can hold different parts of the test to different standards. This is the single most powerful threshold feature for realistic gating.

First, tag your requests, then write thresholds against those tags:

\`\`\`javascript
import http from 'k6/http';

export const options = {
  thresholds: {
    // Overall budget.
    'http_req_duration': ['p(95)<800'],
    // Tighter budget just for the static asset endpoint.
    'http_req_duration{name:static}': ['p(95)<200'],
    // Looser budget for the heavy search endpoint.
    'http_req_duration{name:search}': ['p(95)<1500'],
    // Per-endpoint error rate.
    'http_req_failed{name:search}': ['rate<0.02'],
  },
};

export default function () {
  http.get('https://test.k6.io/static/logo.png', {
    tags: { name: 'static' },
  });
  http.get('https://test.k6.io/api/search?q=k6', {
    tags: { name: 'search' },
  });
}
\`\`\`

For per-scenario gating, k6's scenarios feature lets you run named workloads, and the built-in \`scenario\` tag is automatically attached, so you can hold each scenario to its own threshold:

\`\`\`javascript
export const options = {
  scenarios: {
    browse: { executor: 'constant-vus', vus: 20, duration: '2m', exec: 'browse' },
    checkout: { executor: 'constant-vus', vus: 5, duration: '2m', exec: 'checkout' },
  },
  thresholds: {
    'http_req_duration{scenario:browse}': ['p(95)<400'],
    'http_req_duration{scenario:checkout}': ['p(95)<1200'],
  },
};

export function browse() {
  // ...browse traffic
}

export function checkout() {
  // ...checkout traffic
}
\`\`\`

## Custom Metrics: Trend, Counter, Rate, Gauge

Beyond the built-in metrics, you can define your own from the \`k6/metrics\` module. There are exactly four types, and choosing the right one determines which threshold aggregations are available.

\`\`\`javascript
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';

const apiLatency = new Trend('api_latency', true); // true = time unit
const businessErrors = new Counter('business_errors');
const validationRate = new Rate('valid_responses');
const queueDepth = new Gauge('queue_depth');
\`\`\`

Each type captures a different shape of data:

| Type | Captures | Threshold aggregations | Example use |
|---|---|---|---|
| \`Trend\` | Distribution of values | \`avg\`, \`min\`, \`max\`, \`med\`, \`p(N)\` | Custom latency timings |
| \`Counter\` | Cumulative sum | \`count\`, \`rate\` | Count of business errors |
| \`Rate\` | Percentage true/false | \`rate\` | % of valid responses |
| \`Gauge\` | Last recorded value | \`value\` | Current queue depth |

Record values with \`.add()\` and gate them with thresholds keyed by your custom metric name:

\`\`\`javascript
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const apiLatency = new Trend('api_latency', true);
const businessErrors = new Counter('business_errors');
const validResponses = new Rate('valid_responses');

export const options = {
  thresholds: {
    api_latency: ['p(95)<600'],
    business_errors: ['count<10'],
    valid_responses: ['rate>0.95'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/orders');
  apiLatency.add(res.timings.duration);

  const ok = res.status === 200 && res.json('orders') !== undefined;
  validResponses.add(ok);
  if (!ok) {
    businessErrors.add(1);
  }

  check(res, { 'orders fetched': () => ok });
}
\`\`\`

## Failing CI on a Threshold Breach

This is the payoff. When any threshold fails, k6 exits with a non-zero status code (99 by default for threshold failures), and any CI system treats a non-zero exit as a failed step. There is no extra wiring needed beyond running k6 and letting the exit code propagate.

\`\`\`yaml
name: load-test
on: [pull_request]

jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 load test
        uses: grafana/setup-k6-action@v1
      - run: k6 run --quiet tests/load.js
        # If a threshold breaches, k6 exits non-zero and this step fails,
        # turning the whole job red. No extra assertion step required.
\`\`\`

A few practical notes for reliable CI gating:

\`\`\`bash
# Emit a machine-readable summary alongside the human one.
k6 run --summary-export=summary.json tests/load.js

# Run a short smoke test on every PR, full test nightly.
k6 run -e SCENARIO=smoke tests/load.js
\`\`\`

It is worth understanding the exit codes precisely so you can distinguish a script error from a performance failure in CI logs. A k6 run that completes but breaches one or more thresholds exits with code 99, which is distinct from a script syntax error or a network problem that prevents the test from running at all. Most CI systems only care whether the code is zero or non-zero, but if you build custom dashboards or notifications, keying off exit code 99 specifically lets you label a red build as a genuine performance regression rather than tooling breakage. You can also pass \`--no-thresholds\` during local debugging to run the script and inspect metrics without the gate failing your shell, then remove it once you are ready to enforce the budget again.

If you want CI to fail on *checks* (not just thresholds), remember checks alone never change the exit code. Add a threshold on the \`checks\` metric so a high check-failure rate breaches a threshold and fails the build:

\`\`\`javascript
export const options = {
  thresholds: {
    // Fail CI if more than 1% of checks fail.
    checks: ['rate>0.99'],
  },
};
\`\`\`

| What you want to gate on | Mechanism |
|---|---|
| Latency budget (p95, p99) | Threshold on \`http_req_duration\` |
| Error rate | Threshold on \`http_req_failed\` |
| Failing checks | Threshold on the \`checks\` metric |
| Custom business signal | Custom metric + threshold |
| Fail fast on disaster | \`abortOnFail: true\` |

## Grouping for Readable Results

The \`group\` function (from \`k6\`) wraps related steps into a labeled block so the summary and metrics are organized by logical flow rather than a flat list of URLs. Groups make a multi-step user journey readable and let you attach a \`group\` tag to thresholds.

\`\`\`javascript
import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
  thresholds: {
    // Per-group latency budgets via the automatic group tag.
    'http_req_duration{group:::login}': ['p(95)<500'],
    'http_req_duration{group:::checkout}': ['p(95)<1200'],
  },
};

export default function () {
  group('login', function () {
    const res = http.post('https://test.k6.io/login', { user: 'a', pass: 'b' });
    check(res, { 'logged in': (r) => r.status === 200 });
  });

  group('checkout', function () {
    const res = http.post('https://test.k6.io/checkout', { item: '42' });
    check(res, { 'order placed': (r) => r.status === 201 });
  });
}
\`\`\`

Note the \`group:::name\` syntax in the threshold tag: k6 uses a triple-colon separator for group tags. Groups nest, so a step inside another group gets a combined tag like \`outer::inner\`. Use groups to mirror the user journey, and your summary plus your tagged thresholds will read like a story instead of a wall of metrics. For end-to-end correctness testing of those same flows, our [API testing complete guide](/blog/api-testing-complete-guide) covers the functional side that complements load testing.

## Putting It All Together

A production-grade k6 script combines all of this: scenarios for realistic workloads, checks for correctness, custom metrics for business signals, tagged and grouped thresholds for granular gates, and \`abortOnFail\` to stop a clearly broken run early.

\`\`\`javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const checkoutLatency = new Trend('checkout_latency', true);
const validCheckout = new Rate('valid_checkout');

export const options = {
  scenarios: {
    load: { executor: 'ramping-vus', startVUs: 0, stages: [
      { duration: '30s', target: 50 },
      { duration: '1m', target: 50 },
      { duration: '30s', target: 0 },
    ] },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.02', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_duration: ['p(95)<800'],
    'http_req_duration{group:::checkout}': ['p(95)<1500'],
    checkout_latency: ['p(95)<1500'],
    valid_checkout: ['rate>0.98'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  group('checkout', function () {
    const res = http.post('https://test.k6.io/checkout', { item: '42' });
    checkoutLatency.add(res.timings.duration);
    const ok = res.status === 201;
    validCheckout.add(ok);
    check(res, { 'order placed': () => ok });
  });
  sleep(1);
}
\`\`\`

That script fails CI on any of: a too-high error rate (aborting early after a grace period), a blown overall or per-group latency budget, a failed business success rate, or too many failing checks. That is exactly the reliable, automated pass/fail gate performance testing in CI is supposed to give you. For tool selection context, revisit [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing), and browse [QA skills](/skills) to drop these patterns into your AI coding agent.

## Frequently Asked Questions

### What is the difference between checks and thresholds in k6?

Checks are boolean assertions that validate individual responses and record pass/fail counts, but a failed check never changes the exit code, so it cannot fail CI on its own. Thresholds are pass/fail criteria evaluated against an aggregated metric, and a breached threshold makes k6 exit non-zero, failing the build. Use checks for granular validation and thresholds as the actual gate.

### How do I make k6 fail CI when a threshold is breached?

You do not need extra wiring. When any threshold fails, k6 exits with a non-zero status code (99 by default for threshold failures), and your CI step treats that as a failure automatically. Just run \`k6 run tests/load.js\` and let the exit code propagate. Define your gates in \`options.thresholds\`, such as \`http_req_duration: ['p(95)<500']\` and \`http_req_failed: ['rate<0.01']\`.

### How do I write a threshold on http_req_duration?

Add it under \`options.thresholds\` keyed by the metric name with an array of expression strings. Since \`http_req_duration\` is a Trend, you can use aggregations like \`avg\`, \`med\`, \`max\`, and percentiles: for example \`http_req_duration: ['p(95)<500', 'p(99)<1000']\` requires the 95th percentile under 500ms and the 99th under 1000ms. Any false expression fails the threshold.

### What does abortOnFail do in k6?

By default thresholds are only checked at the end of a test, so a failing run still consumes its full duration. Using the object form \`{ threshold: 'rate<0.05', abortOnFail: true }\` stops the test as soon as the threshold is breached, saving CI minutes on a clearly broken build. Add \`delayAbortEval: '30s'\` to give the system a warm-up period before the abort is armed.

### How do I make CI fail when k6 checks fail?

Checks alone never affect the exit code, so add a threshold on the built-in \`checks\` metric, which is a Rate of passing checks. Setting \`checks: ['rate>0.99']\` fails the build whenever more than one percent of checks fail. This is the standard bridge that turns granular check failures into an actual CI gate, combining the readability of checks with the enforcement of thresholds.

### What are the four custom metric types in k6?

Trend captures a distribution and supports \`avg\`, \`min\`, \`max\`, \`med\`, and \`p(N)\`; use it for custom timings. Counter sums values cumulatively and supports \`count\` and \`rate\`; use it to tally events like errors. Rate tracks the percentage of true values and supports \`rate\`; use it for success ratios. Gauge stores the last value and supports \`value\`; use it for point-in-time readings like queue depth.

### How do I set different thresholds for different endpoints in k6?

Tag your requests, then write thresholds with the \`metric{tag:value}\` filter syntax. For example, tag a request with \`{ tags: { name: 'search' } }\` and gate it with \`'http_req_duration{name:search}': ['p(95)<1500']\` while holding a static asset to \`'http_req_duration{name:static}': ['p(95)<200']\`. Scenarios and groups also attach automatic \`scenario\` and \`group\` tags you can filter on.

### Is k6 better than JMeter for CI performance testing?

k6 fits CI naturally because tests are JavaScript files, thresholds give a built-in pass/fail exit code, and it is lightweight to run in a pipeline. JMeter is GUI-driven with a heavier footprint and needs extra plugins for code-based assertions and CI gating. For most modern, code-first teams k6 is the better CI fit, though JMeter still shines for some protocols. See our k6 vs JMeter comparison for the full breakdown.
`,
};
