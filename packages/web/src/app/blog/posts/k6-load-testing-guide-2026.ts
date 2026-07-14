import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Load Testing Guide 2026: Scripts, Thresholds, and CI Setup',
  description:
    'A complete Grafana k6 load testing guide for 2026: install, write JS scripts, ramp VUs with stages, set thresholds and checks, run scenarios, and gate CI.',
  date: '2026-07-06',
  category: 'Tutorial',
  content: `
# k6 Load Testing Guide 2026: From First Script to CI-Gated Performance Tests

Functional tests answer the question "does this work?" Load tests answer a harder one: "does this still work when a thousand people hit it at once?" Most teams discover the answer the hard way, during a launch or a traffic spike, when response times balloon and the database connection pool runs dry. Load testing moves that discovery earlier, into a controlled environment where you can watch the system degrade on your terms instead of your customers'.

Grafana k6 has become the default tool for this in 2026, and for good reason. It is a modern load-testing engine written in Go for raw performance, but you write your tests in JavaScript, which means the same engineers who write your unit and end-to-end tests can write load tests without learning a new language or wrestling with XML configuration files. A k6 script is just an ES module that exports a default function; k6 runs that function repeatedly across many virtual users (VUs). It is scriptable, version-controllable, CI-friendly, and produces metrics you can gate a pipeline on.

This guide takes you from a cold install to a CI-gated performance test. We will install k6, write and understand a first script, ramp virtual users up and down with stages, add checks to validate responses, set thresholds that make a run pass or fail, organize traffic with scenarios, and finally wire the whole thing into a CI pipeline so a performance regression fails the build the same way a broken unit test does. Every script here is real, runnable k6 JavaScript. If you are coming from a functional-testing background, our overview of [how AI agents are changing QA testing](/blog/how-ai-agents-changing-qa-testing) sets useful context for where performance testing fits in a modern suite.

## What k6 Is and How It Works

k6 is a load-testing tool that executes JavaScript test scripts against a system under test, simulating many concurrent users and measuring how the system responds. Under the hood it runs a Go runtime that embeds a JavaScript engine, so you get Go's concurrency and low memory footprint with JavaScript's approachability. It does not run in a browser or use Node.js; it is a standalone binary with its own module system and a small set of built-in modules like \`k6/http\` and \`k6/metrics\`.

The core mental model is the virtual user. A VU is an independent, concurrent worker that runs your exported default function in a loop. If you configure 50 VUs, k6 spins up 50 workers, each repeatedly executing your script, until the test duration elapses. Each execution of the default function is called an iteration. The total load your test generates is a function of how many VUs run and how fast each iteration completes.

Everything k6 measures flows into metrics: request duration, request rate, failure rate, data transferred, and any custom metrics you define. Thresholds are pass/fail rules you apply to those metrics, and checks are assertions on individual responses. Together they turn a load test from a wall of numbers into a clear pass or fail.

## Installing k6

k6 ships as a single binary with native installers for every major platform. Pick the one for your OS:

\`\`\`bash
# macOS (Homebrew)
brew install k6

# Windows (Chocolatey)
choco install k6

# Debian / Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \\
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \\
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker (no local install)
docker pull grafana/k6
\`\`\`

Confirm the install:

\`\`\`bash
k6 version
\`\`\`

That is the entire toolchain. There is no runtime to configure, no plugins to bootstrap, and no separate GUI to launch. You write a \`.js\` file and run \`k6 run\` against it.

## Writing Your First k6 Script

A k6 script has two required pieces: an import of the HTTP module and a default exported function that performs the work of one iteration. Here is the smallest useful test, which sends a single GET request per iteration and pauses for one second to model user think-time.

\`\`\`javascript
import http from 'k6/http';
import { sleep } from 'k6';

export default function () {
  http.get('https://test-api.k6.io/public/crocodiles/');
  sleep(1);
}
\`\`\`

Run it with a handful of virtual users for ten seconds directly from the command line:

\`\`\`bash
k6 run --vus 10 --duration 10s script.js
\`\`\`

k6 spins up 10 VUs, each hammering the endpoint and sleeping one second between requests, for 10 seconds total. When it finishes, k6 prints a summary: how many requests it sent, the request rate, and percentile breakdowns of response time (\`http_req_duration\`) including the p90, p95, and max. Those percentiles are the numbers that matter. An average hides the slow tail; the p95 tells you what your slowest 5 percent of users actually experienced.

## Configuring Load with the options Export

Passing flags on the command line is fine for a quick check, but real tests declare their load profile in code by exporting an \`options\` object. This makes the test self-contained and version-controllable. The simplest form sets a fixed number of VUs and a duration:

\`\`\`javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
};

export default function () {
  http.get('https://test-api.k6.io/public/crocodiles/');
  sleep(1);
}
\`\`\`

Now \`k6 run script.js\` runs exactly that profile with no flags needed. Anyone who checks out the repo runs the identical load. But a flat 20 VUs for 30 seconds is not how real traffic behaves. Real traffic ramps up, plateaus, and ramps down. That is what stages are for.

## Ramping Virtual Users with Stages

Stages let you define a load profile that changes over time. Each stage has a \`duration\` and a \`target\` VU count, and k6 linearly interpolates the number of active VUs from the previous stage's target to this one. This models a realistic traffic curve: a gradual ramp-up, a sustained peak, and a controlled ramp-down.

\`\`\`javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // ramp up from 0 to 50 VUs over 1 minute
    { duration: '3m', target: 50 },  // hold steady at 50 VUs for 3 minutes
    { duration: '1m', target: 100 }, // ramp up to 100 VUs (spike)
    { duration: '2m', target: 100 }, // hold the spike
    { duration: '1m', target: 0 },   // ramp down to 0 (cool off)
  ],
};

export default function () {
  http.get('https://test-api.k6.io/public/crocodiles/');
  sleep(1);
}
\`\`\`

This eight-minute test tells a story. The gradual ramp lets you watch response times as concurrency climbs, so you can see the exact point where the system starts to strain. The sustained hold reveals whether performance is stable under load or degrades over time (a classic symptom of a memory leak or a connection pool that never releases). The spike to 100 VUs stresses the system beyond its comfort zone, and the cool-down confirms it recovers. This ramp-hold-spike-recover shape is the workhorse profile for most load tests.

## Adding Checks to Validate Responses

Load without validation is meaningless. A server can return a 500 error in two milliseconds, and if you only measure response time, that looks fast and healthy. Checks are assertions on individual responses that verify the system is not just fast but correct under load.

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const res = http.get('https://test-api.k6.io/public/crocodiles/');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time under 500ms': (r) => r.timings.duration < 500,
    'body is not empty': (r) => r.body.length > 0,
    'returns a JSON array': (r) => Array.isArray(r.json()),
  });

  sleep(1);
}
\`\`\`

Each check returns a boolean, and k6 tallies the pass rate for each named check in the summary. A crucial detail: a failed check does not fail the test or stop the VU. It records a false and moves on. This is by design, because during a load test you want to keep applying load and measure how often correctness breaks, not abort at the first hiccup. To actually fail a run based on that data, you use thresholds.

## Setting Thresholds to Pass or Fail a Run

Thresholds are the mechanism that turns a load test into a pass/fail gate, and they are what make k6 useful in CI. A threshold is a rule applied to a metric that, if violated, causes k6 to exit with a non-zero status code. That non-zero exit is what fails a CI job.

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // 95% of requests must complete in under 500ms.
    http_req_duration: ['p(95)<500'],
    // Less than 1% of requests may fail.
    http_req_failed: ['rate<0.01'],
    // At least 99% of "status is 200" checks must pass.
    checks: ['rate>0.99'],
  },
};

export default function () {
  const res = http.get('https://test-api.k6.io/public/crocodiles/');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
\`\`\`

Read those thresholds as your service-level objectives expressed in code. \`p(95)<500\` says the 95th-percentile response time must stay under 500 milliseconds. \`rate<0.01\` says the failure rate must be under one percent. \`rate>0.99\` says at least 99 percent of checks must pass. If any threshold is breached, k6 prints it in red and exits non-zero. A green run means every objective held under load; a red run means you have a regression to investigate before shipping.

## Understanding k6 Metrics

k6 collects a set of built-in metrics automatically, and you can define your own. Knowing what the standard ones mean is essential to reading a report.

| Metric | Type | What it measures |
|---|---|---|
| \`http_req_duration\` | Trend | Total time per request (the headline latency metric) |
| \`http_req_failed\` | Rate | Proportion of requests that failed |
| \`http_reqs\` | Counter | Total number of requests sent |
| \`iterations\` | Counter | Total default-function executions |
| \`vus\` | Gauge | Currently active virtual users |
| \`data_received\` | Counter | Bytes received from responses |
| \`checks\` | Rate | Proportion of checks that passed |

Trend metrics like \`http_req_duration\` are the ones you percentile: k6 reports avg, min, med, max, p90, and p95. Always judge latency by p95 or p99, never by the average, because the average masks the slow tail that actually annoys users. You can also create custom metrics, for example a \`Trend\` that isolates the duration of only your checkout requests, so a slow checkout does not hide behind fast static-asset requests.

## Organizing Traffic with Scenarios

For anything beyond a single load profile, k6 scenarios let you run multiple independent workloads in one test, each with its own executor, VU count, and timing. This is how you model realistic mixed traffic, for instance a steady stream of browsers plus a periodic batch job.

\`\`\`javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  scenarios: {
    // A constant background of browsing users.
    browsing_users: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'browse',
    },
    // A burst of checkout traffic that ramps and fades.
    checkout_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      exec: 'checkout',
      startTime: '1m', // begins one minute into the run
    },
  },
};

export function browse() {
  http.get('https://test-api.k6.io/public/crocodiles/');
  sleep(2);
}

export function checkout() {
  const payload = JSON.stringify({ item: 'croc-plushie', qty: 1 });
  const params = { headers: { 'Content-Type': 'application/json' } };
  http.post('https://test-api.k6.io/public/echo/', payload, params);
  sleep(1);
}
\`\`\`

Each scenario points at its own exported function via \`exec\`, so \`browse\` and \`checkout\` run as genuinely separate workloads with separate VU pools. Executors control the shape: \`constant-vus\` holds a fixed VU count, \`ramping-vus\` follows stages, \`constant-arrival-rate\` targets a fixed requests-per-second regardless of how long each request takes (better for modeling real throughput), and \`per-vu-iterations\` runs a fixed number of iterations per VU. Scenarios are the tool for realistic, multi-pattern load that mirrors production traffic mixes.

## Integrating k6 into CI

The payoff of thresholds is that k6 exits non-zero on failure, which any CI system understands as a failed job. Here is a complete GitHub Actions workflow that runs a k6 test on every pull request and fails the build if the performance objectives are not met.

\`\`\`yaml
name: Load Test

on:
  pull_request:
    branches: [main]

jobs:
  k6_load_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run k6 load test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/api-load.js
        env:
          # Point the script at the environment under test.
          BASE_URL: \${{ secrets.STAGING_BASE_URL }}
\`\`\`

Because the script defines thresholds, no extra assertion logic is needed in the workflow: if the p95 latency or error rate breaches its threshold, k6 exits non-zero and the job goes red. To make the script environment-aware, read the base URL from an environment variable inside the test:

\`\`\`javascript
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://test-api.k6.io';

export const options = {
  vus: 25,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const res = http.get(\`\${BASE_URL}/public/crocodiles/\`);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
\`\`\`

The \`__ENV\` object exposes environment variables to the script, so the same test file runs against staging in CI and against localhost when you run it manually. This pattern, gating a merge on performance thresholds, is the same shift-left discipline covered in our [CI/CD testing pipeline with GitHub Actions guide](/blog/cicd-testing-pipeline-github-actions), applied to performance instead of functional correctness.

## k6 vs JMeter vs Gatling vs Locust

k6 is not the only load-testing tool, and the right choice depends on your team's language, workflow, and scale. Here is an honest comparison of the four most common options in 2026.

| Tool | Language | Model | Strengths | Trade-offs |
|---|---|---|---|---|
| k6 | JavaScript | CLI, code-first | Great DX, CI-native, low resource use, thresholds as gates | No native GUI recorder; browser testing is limited |
| JMeter | XML / GUI | GUI-driven | Mature, huge plugin ecosystem, protocol coverage | Verbose XML, heavier resource use, GUI-centric workflow |
| Gatling | Scala / Java | Code-first (DSL) | High performance, expressive DSL, rich HTML reports | Steeper learning curve, JVM-centric |
| Locust | Python | Code-first | Pythonic, easy for Python teams, distributed by design | Lower single-node throughput, less polished metrics |

The pattern is clear. If your team lives in JavaScript and values a code-first, CI-native workflow with pass/fail gates, k6 is the natural fit and the reason it has become the 2026 default. JMeter remains unbeatable for exotic protocol coverage and teams that prefer a GUI, though its XML-heavy workflow feels dated. Gatling delivers exceptional throughput and beautiful reports if you or your team are comfortable in the JVM and Scala. Locust is the obvious pick for Python-heavy teams who want to reuse existing Python code. None of these is wrong; they optimize for different teams. For a deeper head-to-head on the two most common choices, see our dedicated [k6 vs JMeter performance testing comparison](/blog/k6-vs-jmeter-2026).

## Frequently Asked Questions

### What is k6 used for?

k6 is an open-source load-testing tool used to measure how a system behaves under concurrent traffic. You write a test in JavaScript, and k6 simulates many virtual users hitting your API or service, reporting response-time percentiles, error rates, and throughput. It is used to find performance bottlenecks, validate scalability before launches, and gate CI pipelines so a performance regression fails the build.

### Is k6 free to use?

Yes. k6 is open source and free to run locally or in your own CI, with no limit on virtual users or test duration on your own infrastructure. Grafana also offers Grafana Cloud k6, a paid managed service that runs large distributed tests and stores results, but the core \`k6 run\` command and all the scripting features described in this guide are completely free.

### What language does k6 use?

k6 tests are written in JavaScript (ES modules), even though the k6 engine itself is written in Go for performance. You export a default function that k6 runs repeatedly across virtual users. k6 does not run on Node.js and does not have full browser APIs; it provides its own modules like \`k6/http\`, \`k6/metrics\`, and \`k6/check\` for building load tests.

### What is the difference between VUs and iterations in k6?

A virtual user (VU) is an independent concurrent worker that executes your test script in a loop. An iteration is one complete execution of the exported default function by a VU. If you run 10 VUs, each VU independently runs iterations back to back for the test duration, so total iterations equals roughly VUs multiplied by how many times each completes the function within the run.

### How do thresholds work in k6?

Thresholds are pass/fail rules applied to metrics, defined in the \`options.thresholds\` object. For example \`http_req_duration: ['p(95)<500']\` requires the 95th-percentile response time to stay under 500 milliseconds. If any threshold is breached during the run, k6 exits with a non-zero status code, which fails the CI job. Thresholds are what turn a load test into an automated quality gate.

### Can k6 run in CI/CD pipelines?

Yes, and it is one of k6's biggest strengths. Because thresholds cause k6 to exit non-zero on failure, any CI system treats a threshold breach as a failed job with no extra glue code. In GitHub Actions you use the official \`grafana/k6-action\`, pass the script filename, and inject the target environment through an environment variable so the same test runs in CI and locally.

### How many virtual users can k6 handle?

A single k6 instance can typically drive tens of thousands of virtual users on a modest machine thanks to its Go runtime and low per-VU memory overhead, far more than most GUI-based tools on the same hardware. For loads beyond a single machine, Grafana Cloud k6 or a distributed k6 setup coordinates many instances to generate hundreds of thousands of concurrent users.

### What is the difference between checks and thresholds in k6?

Checks are assertions on individual responses, like verifying a status code is 200, and a failed check records a false but does not stop the test or fail the run. Thresholds are rules on aggregated metrics that do fail the run by causing a non-zero exit. In practice you use checks to record correctness and a threshold on \`checks: ['rate>0.99']\` to fail the build if too many checks fail.

## Conclusion

Load testing is no longer a specialist activity reserved for a performance team before a big launch. With k6, it is a JavaScript file in your repository that any engineer can write, run locally, and gate a pipeline on. In this guide you installed k6, wrote a first script, shaped realistic traffic with stages, validated correctness with checks, enforced service-level objectives with thresholds, modeled mixed traffic with scenarios, and wired the whole thing into CI so a performance regression fails the build the same way a broken test does.

The most important habit to take away is thresholds in CI. A load test that only prints numbers gets ignored; a load test that fails the build when p95 latency crosses your objective becomes a genuine safety net. Start with one endpoint, one ramp profile, and two thresholds, then grow from there. When you are ready to expand your performance and reliability toolkit, explore the full library of load-testing and QA [skills](/skills) built for AI coding agents and add k6 to your automated quality gates today.
`,
};
