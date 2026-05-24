import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Artillery Node Load Testing Complete Guide for 2026',
  description:
    'Master Artillery for Node-first teams in 2026. Cover YAML configs, scenarios, processors, plugins, Lambda and Fargate workers, distributed runs, and CI patterns.',
  date: '2026-05-09',
  category: 'Performance',
  content: `
# Artillery Node Load Testing Complete Guide for 2026

Artillery is the load testing tool of choice for Node.js-first teams who want their performance tests to live in the same npm ecosystem as their application code. The test plan is YAML, the runner is npx, the extensions are JavaScript or TypeScript, and the cloud runner spins up AWS Lambda and Fargate workers on demand. For a startup with a Node backend and no full-time SRE, the path from zero to a thousand-VU test in CI is shorter with Artillery than with any other tool we have benchmarked.

This guide walks through Artillery 2.x end-to-end in 2026. We cover the YAML config, scenarios, the processor file for custom logic, plugins for protocols like WebSocket and Playwright, the Pro cloud for distributed runs, AWS integration via Fargate workers, and CI patterns. We also compare to k6 and Locust on developer experience and per-test cost. For broader comparisons see [JMeter vs Locust vs Gatling](/blog/jmeter-vs-locust-vs-gatling-comparison) and the [skills directory](/skills) for more performance content.

## Why Artillery

Three reasons stand out for Node-first teams. First, YAML config plus JavaScript processors means anyone on the team can read or edit a test plan. Second, the npm install is fast and reproducible: \`npm install artillery\` and you have everything. Third, the cloud runner abstracts away infrastructure. Artillery Pro provisions Fargate workers per run, distributes load across regions, and aggregates results. Total cost is often lower than maintaining your own k6 cluster or JMeter master-slave farm.

The trade-off is throughput per worker. Artillery is built on Node, which is single-threaded with non-blocking I/O. A single worker tops out around 5,000 to 8,000 RPS depending on the scenario. For higher throughput you scale workers horizontally, which Artillery Pro handles automatically. The model is similar to k6 Cloud but built on Lambda and Fargate primitives, so AWS-heavy organizations integrate more easily.

| Feature | Artillery | k6 | Locust |
|---|---|---|---|
| Config language | YAML + JS | JavaScript | Python |
| Concurrency | Node event loop | Goroutines | gevent or asyncio |
| Single-worker peak RPS | 5k-8k | 30k-40k | 5k-10k |
| Cloud runner | Artillery Pro (Lambda + Fargate) | Grafana Cloud k6 | Locust Cloud |
| Plugins | npm packages | xk6 extensions | PyPI packages |
| WebSocket / Socket.IO | First-class | First-class | Custom |
| Playwright integration | First-class | k6 browser module | Manual |

## Installing Artillery

Two install paths. Global install for ad-hoc usage. Local devDependency for project-scoped reproducibility. We recommend the latter in real projects.

\`\`\`bash
# Project-scoped
npm install --save-dev artillery@2.0.20

# Then run with
npx artillery --version
\`\`\`

Pin the version. Artillery 2 changed several config keys from Artillery 1. Mixing them produces confusing errors. Lock it in \`package.json\` and CI installs are deterministic.

## Your First Test

The simplest Artillery test is a YAML file with a target, phases, and one or more scenarios.

\`\`\`yaml
# tests/load/baseline.yml
config:
  target: 'https://staging.example.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: warmup
    - duration: 300
      arrivalRate: 50
      name: sustained
    - duration: 60
      arrivalRate: 100
      name: peak
  defaults:
    headers:
      Content-Type: application/json
      User-Agent: 'Artillery LoadTest'
  ensure:
    p95: 800
    p99: 2000
    maxErrorRate: 1

scenarios:
  - name: checkout-flow
    flow:
      - post:
          url: /auth/login
          json:
            email: 'load-test@example.com'
            password: '{{ $env.LOAD_TEST_PASSWORD }}'
          capture:
            - json: $.token
              as: token

      - think: 2

      - get:
          url: /products?q=laptop
          headers:
            Authorization: 'Bearer {{ token }}'

      - think: 3

      - post:
          url: /cart
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            sku: ABC-123
            qty: 1
          capture:
            - json: $.id
              as: cartId

      - post:
          url: /checkout
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            cartId: '{{ cartId }}'
\`\`\`

Run it:

\`\`\`bash
npx artillery run tests/load/baseline.yml
\`\`\`

Artillery prints stats as the test runs and a summary at the end. The \`ensure\` block sets thresholds; if any fail, the exit code is non-zero and CI fails.

## Phases and Arrival Rates

Artillery uses arrival-rate (open model) load by default. Each phase specifies a duration and an arrival rate (new virtual users per second). This matches real user behavior: users arrive, do their journey, leave.

\`\`\`yaml
config:
  phases:
    - duration: 30
      arrivalRate: 0
      rampTo: 100
      name: ramp_up
    - duration: 600
      arrivalRate: 100
      name: sustained
    - duration: 60
      arrivalRate: 100
      rampTo: 500
      name: spike
    - duration: 30
      arrivalRate: 500
      name: hold
    - duration: 60
      arrivalRate: 500
      rampTo: 0
      name: ramp_down
\`\`\`

\`arrivalRate\` is constant, \`rampTo\` ramps linearly between the start and target. For fixed-throughput phases use \`arrivalCount\` instead which spawns exactly N users over the duration.

## Variables and Capture

Variables come from three sources. Environment variables via \`{{ $env.VAR }}\`. Captures from previous responses. Payload files (CSV).

\`\`\`yaml
config:
  payload:
    path: 'data/users.csv'
    fields:
      - email
      - password
    order: random

scenarios:
  - flow:
      - post:
          url: /auth/login
          json:
            email: '{{ email }}'
            password: '{{ password }}'
          capture:
            - json: $.token
              as: token
            - header: x-session-id
              as: sessionId
\`\`\`

The CSV is loaded once and shared across workers. Each virtual user picks a row in the order specified (\`random\`, \`sequence\`).

## Processor Files for Custom Logic

For logic that YAML cannot express you write a JavaScript processor module.

\`\`\`javascript
// processor.js
module.exports = {
  generatePayload,
  logCheckoutResult,
  signJWT,
};

function generatePayload(context, events, done) {
  const products = ['LAPTOP-789', 'PHONE-456', 'TABLET-123'];
  context.vars.sku = products[Math.floor(Math.random() * products.length)];
  context.vars.qty = 1 + Math.floor(Math.random() * 3);
  return done();
}

function logCheckoutResult(requestParams, response, context, events, done) {
  if (response.statusCode !== 200) {
    events.emit('counter', 'checkout.failures', 1);
    console.log('Checkout failed:', response.statusCode, response.body);
  }
  return done();
}

function signJWT(context, events, done) {
  const jwt = require('jsonwebtoken');
  context.vars.signedToken = jwt.sign(
    { sub: context.vars.userId },
    process.env.JWT_SECRET
  );
  return done();
}
\`\`\`

Reference it from YAML:

\`\`\`yaml
config:
  processor: './processor.js'

scenarios:
  - flow:
      - function: generatePayload
      - post:
          url: /cart
          json:
            sku: '{{ sku }}'
            qty: '{{ qty }}'
          afterResponse: logCheckoutResult
\`\`\`

\`function\` runs before a request, \`afterResponse\` runs after. Processors give you full Node.js power inside the test.

## Plugins

Artillery has a plugin ecosystem published as npm packages. The most useful in 2026:

\`\`\`yaml
config:
  plugins:
    expect: {}
    metrics-by-endpoint: {}
    apdex: {}
    publish-metrics:
      - type: cloudwatch
        region: us-east-1
        namespace: artillery
    ensure: {}
\`\`\`

| Plugin | Purpose |
|---|---|
| expect | Per-request assertions |
| metrics-by-endpoint | Per-route stats in reports |
| apdex | Apdex score calculation |
| publish-metrics | Push to CloudWatch, Datadog, Honeycomb |
| ensure | Threshold-based pass/fail |
| memory-inspector | Memory profiling per worker |
| fake-data | Faker.js integration |

## WebSocket and Socket.IO

Artillery has first-class WebSocket and Socket.IO support. Use the \`ws\` or \`socketio\` engine instead of HTTP.

\`\`\`yaml
config:
  target: 'wss://chat.example.com'
  engines:
    socketio: {}

scenarios:
  - engine: socketio
    flow:
      - emit:
          channel: 'join'
          data: { room: 'lobby' }
      - think: 1
      - emit:
          channel: 'message'
          data: { text: 'hello' }
      - loop:
          - emit:
              channel: 'message'
              data: { text: '{{ $randomString() }}' }
          - think:
              min: 1
              max: 5
        count: 50
\`\`\`

WebSocket and Socket.IO tests are common for chat apps, real-time dashboards, and trading platforms. Artillery handles the connection lifecycle automatically.

## Playwright Integration

Artillery integrates with Playwright for browser-driven load tests. The \`playwright\` engine spawns a real Chromium per virtual user.

\`\`\`yaml
config:
  target: 'https://example.com'
  engines:
    playwright: {}
  processor: './browser-flow.js'

scenarios:
  - engine: playwright
    testFunction: 'checkoutFlow'
\`\`\`

\`\`\`javascript
// browser-flow.js
async function checkoutFlow(page, vuContext, events, test) {
  await page.goto('https://example.com');
  await page.click('[data-testid="login"]');
  await page.fill('#email', vuContext.vars.email);
  await page.fill('#password', vuContext.vars.password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-testid="dashboard"]');
}

module.exports = { checkoutFlow };
\`\`\`

Browser tests are heavier (200-500 MB per Chromium) so you cap concurrent VUs lower than HTTP tests. Use them for Core Web Vitals validation under load.

## Distributed Runs with Artillery Pro

Artillery Pro is the cloud offering. You authenticate with a token and run with the \`--platform\` flag:

\`\`\`bash
npx artillery run-fargate tests/load/checkout.yml \\
  --region us-east-1 \\
  --count 10 \\
  --tags 'env:staging,test:checkout'

# Or for Lambda-based runs
npx artillery run-lambda tests/load/checkout.yml \\
  --region us-east-1 \\
  --count 50
\`\`\`

\`--count\` is the number of Fargate or Lambda workers. Each worker runs the YAML config and contributes to total load. Pro aggregates results in real time on a web dashboard.

The cost model is per-Fargate-minute or per-Lambda-invocation. For typical 30-minute tests with 10 workers, cost is in the low single-digit dollars per test. Compare to setting up and maintaining k6-operator on Kubernetes: the per-test cost is usually higher in Artillery Pro but the operational cost is lower.

## CI Integration

Standard pattern with GitHub Actions:

\`\`\`yaml
name: Load Tests

on:
  pull_request:
    branches: [main]

jobs:
  artillery:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install
        run: npm ci

      - name: Run Artillery
        env:
          LOAD_TEST_PASSWORD: \${{ secrets.LOAD_TEST_PASSWORD }}
        run: |
          npx artillery run tests/load/checkout.yml \\
            --output results.json

      - name: Generate HTML report
        run: |
          npx artillery report results.json --output report.html

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: artillery-report
          path: |
            report.html
            results.json
\`\`\`

For cloud runs, configure \`ARTILLERY_CLOUD_API_KEY\` and use \`run-fargate\` or \`run-lambda\` instead. The exit code is non-zero on threshold breach.

## Reporting

Artillery prints summary stats to stdout and writes JSON to the file specified by \`--output\`. The \`artillery report\` command turns JSON into a single-page HTML report.

\`\`\`bash
npx artillery report results.json --output report.html
open report.html
\`\`\`

The report shows latency percentiles, error rates, request distributions, and per-scenario breakdowns. For richer dashboards push metrics to Datadog or CloudWatch via the \`publish-metrics\` plugin.

## Common Patterns

Five patterns we see repeatedly in production Artillery tests:

\`\`\`yaml
# 1. Multi-environment config
config:
  target: '{{ $env.TARGET || "https://staging.example.com" }}'
  variables:
    apiVersion: 'v2'
\`\`\`

\`\`\`yaml
# 2. Auth setup once per VU
scenarios:
  - beforeRequest: 'setupAuth'
    flow:
      - get: { url: /products }
\`\`\`

\`\`\`yaml
# 3. Weighted scenarios
scenarios:
  - name: browse
    weight: 70
    flow: [...]
  - name: purchase
    weight: 25
    flow: [...]
  - name: profile
    weight: 5
    flow: [...]
\`\`\`

\`\`\`yaml
# 4. Conditional logic
scenarios:
  - flow:
      - get:
          url: /products
          capture:
            - json: '$.length'
              as: productCount
      - function: 'maybeAddToCart'
\`\`\`

\`\`\`yaml
# 5. Soak with periodic checkpoints
config:
  phases:
    - duration: 3600  # 1 hour soak
      arrivalRate: 50
      name: soak
\`\`\`

## When to Pick Artillery

Pick Artillery if:

- Your team is Node-first
- You want YAML configs and JS processors
- You need WebSocket or Socket.IO load testing
- You want first-class Playwright integration
- You prefer Fargate or Lambda for cloud runs

Skip Artillery if:

- You need 30k+ RPS per worker (use k6 or Gatling)
- Your team is Python or Java first
- You need a GUI test plan editor

## Conclusion

Artillery is the right load tool for Node.js teams. The YAML-plus-JS combination is approachable, the npm ecosystem is rich, and the cloud runner abstracts infrastructure. For Node-first product teams running standard HTTP and WebSocket workloads it is hard to beat.

If you are evaluating, write a YAML test for one critical flow, run it locally, then push to Artillery Pro for distributed runs. Browse the [skills directory](/skills) for Artillery AI agent skills and read [JMeter vs Locust vs Gatling](/blog/jmeter-vs-locust-vs-gatling-comparison) for tool comparisons.
`,
};
