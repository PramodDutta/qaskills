import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 + Grafana Cloud Load Testing: Full Tutorial (2026)',
  description:
    'Learn k6 load testing end to end: write JS test scripts, set thresholds and scenarios, run locally, then scale to 1M VUs on Grafana Cloud k6 with CI.',
  date: '2026-06-18',
  category: 'Tutorial',
  content: `
# k6 + Grafana Cloud Load Testing Tutorial (2026)

Load testing has a reputation for being painful: heavyweight GUIs, XML config, and tests that nobody on the team can read. k6 throws all of that out. It is a modern, developer-first load testing tool where your tests are plain JavaScript, your assertions are real code, and your results are first-class metrics you can stream straight into Grafana dashboards.

This tutorial walks you through k6 from a cold install to running a distributed test on Grafana Cloud k6 at up to 1 million virtual users. You will learn the test lifecycle, the \`options\` block, thresholds as service-level objectives (SLOs), scenarios and executors, multi-protocol testing (HTTP, WebSocket, gRPC, and the browser module), and how to wire it all into a GitHub Actions pipeline. Every code sample here is runnable.

If you are evaluating load tools more broadly, our [k6 vs JMeter comparison](/blog/k6-vs-jmeter-2026) and the broader [QA skills directory](/skills) are good companions to this piece.

## What Is k6 and Why It Wins in 2026

k6 is an open-source load testing tool created by Load Impact and now maintained by Grafana Labs. The engine is written in Go, which gives it a tiny memory footprint per virtual user and lets a single mid-range machine drive tens of thousands of concurrent users. But you do not write Go. You write test scripts in JavaScript (ES2015+), which k6 executes on an embedded JavaScript runtime (goja) wrapped by the Go scheduler.

That split is the whole trick. Go handles concurrency, scheduling, and the network stack; JavaScript gives you an ergonomic scripting layer. The result is a tool that feels like writing a small Node program but performs like a purpose-built load generator.

Key properties that matter in practice:

- **Virtual Users (VUs):** each VU is a parallel execution of your script in its own JavaScript context, looping continuously for the duration of the test.
- **Iterations:** one complete pass through the default function. Throughput is measured in iterations per second.
- **Checks:** boolean assertions that record pass/fail rates without aborting the test.
- **Thresholds:** pass/fail criteria on metrics that set the exit code of the whole run, which is what makes k6 usable as a CI gate.
- **Metrics:** built-in (\`http_req_duration\`, \`http_req_failed\`, \`iterations\`, \`vus\`) plus custom Trend, Counter, Gauge, and Rate metrics you define yourself.

## Installing k6

k6 ships as a single static binary, so installation is fast on every platform.

\`\`\`bash
# macOS (Homebrew)
brew install k6

# Windows (winget or Chocolatey)
winget install k6 --source winget
choco install k6

# Debian / Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring \\
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \\
  --keyserver hkp://keyserver.ubuntu.com:80 \\
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \\
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker (no install at all)
docker run --rm -i grafana/k6 run - < script.js
\`\`\`

Verify the install:

\`\`\`bash
k6 version
# k6 v0.x.x (commit hash, go1.2x.x, darwin/arm64)
\`\`\`

## Writing Your First Test

A k6 script has a predictable lifecycle. Code in the module scope (the "init context") runs once per VU at startup to load files and define options. The exported \`default\` function is the VU code, executed repeatedly for the test duration. Optional \`setup()\` and \`teardown()\` functions run once each, before and after the test, on a single VU.

Here is a minimal but complete first test:

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  const res = http.get('https://test.k6.io');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
    'response under 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
\`\`\`

Run it locally with one VU for one iteration:

\`\`\`bash
k6 run script.js
\`\`\`

A few things to internalize:

- \`http.get()\` returns a response object with \`status\`, \`body\`, \`headers\`, and a \`timings\` breakdown (\`duration\`, \`waiting\`, \`connecting\`, \`tls_handshaking\`, etc.).
- \`check()\` does **not** stop the test on failure. It records a pass/fail rate you see in the summary. Use it for soft validation.
- \`sleep()\` simulates user think time. Without it, each VU hammers the target as fast as possible, which rarely models real traffic.

## The options Block: Load Shape and Configuration

The \`options\` object is how you describe the load profile without touching the VU logic. The simplest form is a flat VU count and duration.

\`\`\`javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function () {
  http.get('https://test.k6.io');
  sleep(1);
}
\`\`\`

For realistic tests you almost always want to ramp load up and down using \`stages\`. Each stage moves the active VU count toward a \`target\` over a \`duration\`, interpolating linearly.

\`\`\`javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // ramp up to 100 VUs
    { duration: '5m', target: 100 },  // hold steady at 100
    { duration: '2m', target: 200 },  // spike to 200
    { duration: '5m', target: 200 },  // hold the spike
    { duration: '2m', target: 0 },    // ramp down to zero
  ],
};
\`\`\`

This stages syntax is shorthand for the \`ramping-vus\` executor (covered below). It is perfect for load, stress, and spike tests where you care about how the system behaves as concurrency changes.

## Thresholds: Turning Metrics into Pass/Fail SLOs

Checks tell you what fraction of requests passed. Thresholds tell k6 whether the **whole run** succeeded. A failed threshold sets the process exit code to a non-zero value, which is exactly what your CI pipeline needs to fail a build. Thresholds are where load testing becomes SLO enforcement.

\`\`\`javascript
export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // 95% of requests must complete below 500ms, 99% below 1s
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // error rate must stay under 1%
    http_req_failed: ['rate<0.01'],
    // at least 100 iterations per second on average
    iterations: ['rate>100'],
  },
};
\`\`\`

You can also abort early when a threshold is badly breached, which saves time and load-generator cost on doomed runs:

\`\`\`javascript
thresholds: {
  http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' }],
},
\`\`\`

Custom metrics get their own thresholds too. Define a \`Trend\` for a business-critical timing and assert on it:

\`\`\`javascript
import { Trend } from 'k6/metrics';
import http from 'k6/http';

const checkoutLatency = new Trend('checkout_latency', true);

export const options = {
  thresholds: { checkout_latency: ['p(95)<800'] },
};

export default function () {
  const res = http.post('https://api.example.com/checkout', JSON.stringify({ cart: 1 }), {
    headers: { 'Content-Type': 'application/json' },
  });
  checkoutLatency.add(res.timings.duration);
}
\`\`\`

## Scenarios and Executors

Scenarios let you model multiple workloads in one test, each with its own executor, VU allocation, and even its own function. This is the most powerful feature in k6 and the one that separates a toy script from a real performance test.

The two executors you will reach for most often are \`ramping-vus\` (concurrency-driven, the same engine behind \`stages\`) and \`constant-arrival-rate\` (throughput-driven, which keeps a fixed request rate regardless of how long responses take). Arrival-rate executors are usually the more honest model for APIs, because real traffic arrives at a rate independent of your server's speed.

\`\`\`javascript
import http from 'k6/http';

export const options = {
  scenarios: {
    browsing_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      exec: 'browse',
    },
    checkout_traffic: {
      executor: 'constant-arrival-rate',
      rate: 100,             // 100 iterations
      timeUnit: '1s',        // per second
      duration: '9m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: 'checkout',
    },
  },
};

export function browse() {
  http.get('https://test.k6.io');
}

export function checkout() {
  http.post('https://test.k6.io/checkout', JSON.stringify({ id: 1 }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
\`\`\`

Here is a reference of the executors you can choose from:

| Executor | Driven by | Use case | Key options |
|---|---|---|---|
| \`shared-iterations\` | fixed total iterations split across VUs | smoke tests, fixed work | \`vus\`, \`iterations\` |
| \`per-vu-iterations\` | iterations per VU | each VU does N passes | \`vus\`, \`iterations\` |
| \`constant-vus\` | fixed concurrency | steady soak test | \`vus\`, \`duration\` |
| \`ramping-vus\` | varying concurrency | load, stress, spike | \`stages\`, \`startVUs\` |
| \`constant-arrival-rate\` | fixed throughput | API rate modeling | \`rate\`, \`timeUnit\`, \`maxVUs\` |
| \`ramping-arrival-rate\` | varying throughput | gradual rate ramps | \`stages\`, \`maxVUs\` |
| \`externally-controlled\` | live control via API | pause/resume/scale | \`vus\`, \`maxVUs\` |

A quick rule of thumb: use the \`*-vus\` executors when you care about concurrent connections (websockets, long-lived sessions) and the \`*-arrival-rate\` executors when you care about request throughput (REST APIs).

## Running Locally vs Grafana Cloud k6

Running \`k6 run\` locally is fine for development and CI smoke tests, but a single machine caps out somewhere in the tens of thousands of VUs depending on script complexity and network. When you need geographically distributed load or millions of users, you reach for Grafana Cloud k6, the managed execution platform.

Cloud execution is a one-line change. Authenticate once, then swap \`run\` for \`cloud run\`:

\`\`\`bash
# Authenticate with your Grafana Cloud k6 token
k6 cloud login --token <YOUR_API_TOKEN>

# Run the test entirely on Grafana's distributed infrastructure
k6 cloud run script.js
\`\`\`

You can pin the load zones and split the traffic geographically right in the script options:

\`\`\`javascript
export const options = {
  cloud: {
    name: 'Checkout API - peak traffic',
    projectID: 123456,
    distribution: {
      us: { loadZone: 'amazon:us:ashburn', percent: 60 },
      eu: { loadZone: 'amazon:de:frankfurt', percent: 40 },
    },
  },
  stages: [
    { duration: '5m', target: 10000 },
    { duration: '10m', target: 10000 },
    { duration: '5m', target: 0 },
  ],
};
\`\`\`

Here is how the two execution modes compare:

| Capability | Local (\`k6 run\`) | Grafana Cloud k6 (\`k6 cloud run\`) |
|---|---|---|
| Max scale | tens of thousands of VUs (1 machine) | up to 1,000,000 VUs / 5,000,000 rps |
| Geographic distribution | single origin | 20+ AWS load zones worldwide |
| Result storage | terminal summary / your own backend | hosted, retained, shareable |
| Dashboards | bring your own (Grafana + Prometheus/InfluxDB) | built-in cloud dashboards |
| Cost | free (you provide hardware) | subscription / VUh based |
| Best for | dev loop, CI smoke + small load | large-scale, distributed, stakeholder reports |

A useful hybrid is to **generate load locally but stream results to the cloud** for storage and visualization. This keeps the traffic origin on your own infrastructure while still giving you the hosted dashboards:

\`\`\`bash
k6 run --out cloud script.js
# also valid: k6 run -o cloud script.js
\`\`\`

## The Test Builder and Recording Traffic

Not everyone wants to start from a blank script. Grafana Cloud k6 includes a **Test Builder**, a visual editor where you add HTTP requests, checks, think time, and load options through a form, then export the generated JavaScript. It is a good on-ramp for teammates who are not comfortable in code and a fast way to scaffold a test you refine by hand later.

For complex user journeys, the better path is to record a browser session as a HAR file and convert it:

\`\`\`bash
# Convert a recorded HAR into a runnable k6 script
k6 har-to-k6 session.har -o recorded-test.js
\`\`\`

Whatever the entry point, the exported artifact is always plain JavaScript that lives in your repo and is reviewed like any other code. That is a deliberate design choice: there is no opaque binary project format, which keeps tests diffable and version-controlled.

## Streaming Results and Correlating with Grafana

The output flag is k6's integration surface. You pick where metrics go and then visualize them in Grafana exactly like any other data source. Common targets:

\`\`\`bash
# Stream to Prometheus remote write (then dashboard in Grafana)
k6 run -o experimental-prometheus-rw script.js

# Stream to InfluxDB
k6 run -o influxdb=http://localhost:8086/k6 script.js

# Write raw JSON for offline analysis
k6 run --out json=results.json script.js

# Multiple outputs at once
k6 run -o cloud -o json=results.json script.js
\`\`\`

Once metrics land in Prometheus or InfluxDB, the official k6 Grafana dashboards give you request rate, p95/p99 latency, error rate, and VU count over time on one screen. The real power comes from putting your k6 panels next to your application's own dashboards: when p99 latency spikes during a ramp, you can immediately correlate it with CPU saturation, database connection pool exhaustion, or GC pauses on the same timeline. That side-by-side correlation is the whole reason to keep load metrics and system metrics in the same Grafana instance.

## Beyond HTTP: WebSocket, gRPC, and the Browser Module

k6 is not HTTP-only. It ships protocol modules so you can load test the rest of your stack with the same script structure.

WebSocket testing uses the \`k6/ws\` (or newer \`k6/experimental/websockets\`) module:

\`\`\`javascript
import ws from 'k6/ws';
import { check } from 'k6';

export default function () {
  const url = 'wss://echo.websocket.org';
  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () => socket.send('ping'));
    socket.on('message', (msg) => {
      check(msg, { 'echoed ping': (m) => m === 'ping' });
      socket.close();
    });
    socket.setTimeout(() => socket.close(), 3000);
  });
  check(res, { 'ws status is 101': (r) => r && r.status === 101 });
}
\`\`\`

gRPC testing loads your \`.proto\` definitions and invokes methods directly:

\`\`\`javascript
import grpc from 'k6/net/grpc';
import { check } from 'k6';

const client = new grpc.Client();
client.load(['definitions'], 'orders.proto');

export default function () {
  client.connect('grpc.example.com:443', { plaintext: false });
  const res = client.invoke('orders.OrderService/GetOrder', { id: 42 });
  check(res, { 'grpc status OK': (r) => r && r.status === grpc.StatusOK });
  client.close();
}
\`\`\`

The browser module (\`k6/browser\`) drives a real Chromium instance so you can measure front-end metrics like first contentful paint alongside back-end load, mixing protocol-level and browser-level VUs in the same test:

\`\`\`javascript
import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: { browser: { type: 'chromium' } },
    },
  },
};

export default async function () {
  const page = await browser.newPage();
  try {
    await page.goto('https://test.k6.io/');
    await page.locator('a[href="/my_messages.php"]').click();
    const header = page.locator('h2');
    check(await header.textContent(), { 'on login page': (t) => t.includes('Login') });
  } finally {
    await page.close();
  }
}
\`\`\`

## CI Integration with GitHub Actions

The point of thresholds is to fail the build automatically. The official \`grafana/setup-k6-action\` and \`grafana/run-k6-action\` make this clean. Run a small smoke test on every pull request, and a full cloud test on merges to main.

\`\`\`yaml
name: Load Test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        uses: grafana/setup-k6-action@v1
      - name: Run smoke test
        uses: grafana/run-k6-action@v1
        with:
          path: ./tests/smoke.js
        # k6 exits non-zero if any threshold fails, failing the job

  cloud-test:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        uses: grafana/setup-k6-action@v1
      - name: Run full cloud test
        uses: grafana/run-k6-action@v1
        env:
          K6_CLOUD_TOKEN: \${{ secrets.K6_CLOUD_TOKEN }}
        with:
          path: ./tests/load.js
          cloud-run-locally: false
\`\`\`

Keep the PR smoke test short (under a minute, low VUs) so it does not slow down your feedback loop, and reserve the multi-zone cloud run for the main branch. For more on building test gates into pipelines, see our guide on [CI/CD testing pipelines with GitHub Actions](/blog/cicd-testing-pipeline-github-actions).

## Frequently Asked Questions

### Is k6 free to use?

The k6 engine is fully open source under the AGPL-3.0 license and free for unlimited local execution, so you can run any number of virtual users on your own hardware at no cost. The paid component is Grafana Cloud k6, the managed platform that provides distributed execution up to 1 million VUs, hosted result storage, and built-in dashboards. Most teams use the free CLI for development and CI and add the cloud tier only when they need large-scale distributed load.

### What is the difference between a VU and an iteration in k6?

A virtual user (VU) is a parallel thread of execution that runs your script in its own isolated JavaScript context, looping for the test's duration. An iteration is one complete pass through the default function by a single VU. So 50 VUs running for one minute might produce thousands of iterations. Throughput is reported as iterations per second, while concurrency is reported as active VUs.

### How do thresholds make k6 work in CI?

Thresholds are pass/fail rules attached to metrics, such as p(95) response time below 500ms or an error rate under 1 percent. When a threshold is breached, k6 sets a non-zero process exit code at the end of the run. CI systems treat that non-zero exit as a build failure, so a load test that violates your SLOs automatically blocks the pipeline without any extra scripting on your part.

### When should I use constant-arrival-rate instead of ramping-vus?

Use constant-arrival-rate when you want to model a fixed request throughput, like 100 requests per second, regardless of how fast the server responds. It is the most realistic model for public APIs because real traffic arrives independently of your server's latency. Use ramping-vus when you care about the number of concurrent connections or long-lived sessions, such as WebSocket load or simulating a fixed pool of logged-in users.

### Can k6 do browser and front-end testing?

Yes. The k6/browser module drives a real Chromium instance, letting you script clicks, navigation, and assertions while capturing front-end Web Vitals such as first contentful paint. You can mix browser-based VUs and protocol-level HTTP VUs in the same test using scenarios, which lets you measure how the back end behaves under load while a smaller set of real browsers report on the user-perceived experience.

### How do I visualize k6 results in Grafana?

Use the output flag to stream metrics to a time-series backend: -o experimental-prometheus-rw for Prometheus or -o influxdb for InfluxDB. Then add that backend as a Grafana data source and import the official k6 dashboards, which chart request rate, p95/p99 latency, error rate, and VU count. Grafana Cloud k6 skips this setup entirely by providing hosted dashboards automatically when you run k6 cloud run.

### How many virtual users can k6 handle?

Locally, a single well-resourced machine can typically drive tens of thousands of VUs because each VU is lightweight thanks to the Go-based engine; the exact ceiling depends on script complexity and network. For larger or geographically distributed tests, Grafana Cloud k6 scales to up to 1 million VUs and 5 million requests per second across more than 20 AWS load zones, which removes the single-machine limit entirely.

### Can I convert existing recordings into k6 scripts?

Yes. You can record a browser session as a HAR file and run k6 har-to-k6 session.har -o test.js to generate a runnable script, or use the visual Test Builder in Grafana Cloud k6 to assemble requests, checks, and load options through a form and export the JavaScript. Both approaches produce plain, diffable code that you refine by hand and commit to version control like any other test.

## Conclusion

k6 hits a rare sweet spot: tests are readable JavaScript, the engine is fast enough to be honest about your system's limits, and the same script scales from a one-VU smoke test on your laptop to a million-VU distributed run on Grafana Cloud k6 with a single command change. Master the lifecycle, lean on arrival-rate scenarios for APIs, encode your SLOs as thresholds, and wire it into CI so performance regressions get caught before they ship.

Ready to level up your performance testing practice? Browse the [QASkills directory](/skills) to find ready-to-install k6, load testing, and performance engineering skills for your AI coding agent and start shipping faster, more resilient services today.
`,
};
