import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Artillery Load Testing in Node.js: Complete 2026 Guide',
  description:
    'A complete Artillery load testing guide for Node.js in 2026: install, write YAML scenarios, test HTTP and WebSocket, add JS processors, assert thresholds, and run in CI.',
  date: '2026-07-13',
  category: 'Performance',
  content: `
# Artillery Load Testing in Node.js: Complete 2026 Guide

Load tests fail teams for a boring reason: the tool lives too far from the code. If your API is written in JavaScript and your load test is written in a different language with a GUI editor, the test rots. **Artillery** solves that by keeping the whole thing in the Node.js world. You describe traffic in a small YAML file, extend it with plain JavaScript, run it from the command line, and ship it in the same repository as your service. No GUI, no separate runtime, no context switch.

This is a practical, code-first **Artillery load testing guide for 2026**. We install Artillery, walk through the structure of a test script (config, phases, scenarios), load test HTTP APIs, WebSocket, and Socket.io endpoints, write custom JavaScript processors, enforce SLA thresholds so a slow build fails, output metrics for dashboards, run in CI, drive full-page browser load with the Playwright engine, and scale out with Artillery Cloud. Every snippet is real and runnable against Artillery 2.x.

If you are still choosing a tool, our [k6 vs JMeter comparison](/blog/k6-vs-jmeter-2026) and the [Gatling load testing guide](/blog/gatling-load-testing-guide) are worth reading alongside this one, and the [QA skills directory](/skills) has ready-made performance-testing skills for AI coding agents.

## Why Artillery for Node.js Teams

Artillery's pitch is simplicity plus extensibility. The test itself is declarative YAML that a product manager can read, but every hook drops you into ordinary JavaScript when you need logic. Because it runs on Node.js, it reuses the ecosystem you already have: npm packages, environment variables, dotenv, and your existing auth helpers.

The engine model matters. Artillery uses an event-loop, non-blocking core, so a single worker generates a high number of virtual users without a thread per user. Version 2.x runs virtual users across multiple worker threads and can fan out to AWS Lambda or Fargate through Artillery Cloud when one machine is not enough. For most API load tests, a laptop is plenty.

The other reason teams pick Artillery: it does more than HTTP. The same YAML style covers WebSocket, Socket.io, and (through the Playwright engine) full browser page loads. One tool, one config format, many protocols.

## Installing Artillery

Artillery ships as an npm package. Install it as a dev dependency so the version is pinned in your repository and reproducible in CI.

\`\`\`bash
# Install as a project dev dependency (recommended)
npm install --save-dev artillery

# Confirm the version
npx artillery version

# Or install globally for ad-hoc use
npm install -g artillery
artillery version
\`\`\`

Artillery requires a maintained Node.js LTS release. Stick to Node 20.x or 22.x in 2026; the engine and its worker-thread model are tested against LTS lines. Once installed, the \`artillery\` binary exposes the subcommands you will use most: \`run\`, \`quick\`, and \`report\`.

\`\`\`bash
# Smoke test any URL with no config file at all
npx artillery quick --count 20 --num 10 https://example.com/api/health

# Run a full YAML scenario file
npx artillery run load-test.yml
\`\`\`

## Anatomy of an Artillery Test Script

An Artillery script is a YAML document with two top-level keys that do almost all the work: \`config\` (where and how to generate load) and \`scenarios\` (what each virtual user does). Here is a complete, minimal example.

\`\`\`yaml
config:
  target: "https://api.example.com"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "List and read products"
    flow:
      - get:
          url: "/products"
      - get:
          url: "/products/1"
\`\`\`

The \`target\` is the base URL. Every request URL in a scenario is resolved against it. The \`phases\` array describes the shape of traffic over time. The \`scenarios\` array is a weighted list of user journeys; Artillery picks one per virtual user according to its \`weight\`. The \`flow\` is the ordered list of steps that user performs.

### Config keys you will actually use

| Key | Location | Purpose |
| --- | --- | --- |
| \`target\` | config | Base URL for all requests |
| \`phases\` | config | Traffic shape over time (load profile) |
| \`defaults.headers\` | config | Headers merged into every request |
| \`payload\` | config | CSV feeder file for data-driven load |
| \`processor\` | config | Path to a JS module with custom functions |
| \`plugins\` | config | Enable ensure, expect, metrics-by-endpoint, publish-metrics |
| \`variables\` | config | Inline variables usable in templates |
| \`tls\` | config | TLS options, for example rejectUnauthorized |

## Load Phases: Shaping Traffic Over Time

Phases are how you model real traffic. Each phase runs for a \`duration\` (seconds) and introduces new virtual users at an \`arrivalRate\` (users per second). Chain phases to build a realistic profile: warm up, ramp, sustain, spike, cool down.

\`\`\`yaml
config:
  target: "https://api.example.com"
  phases:
    # 1. Warm up: gentle constant load to fill caches and JIT
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    # 2. Ramp: climb from 5 to 50 new users per second
    - duration: 120
      arrivalRate: 5
      rampTo: 50
      name: "Ramp to peak"
    # 3. Sustain: hold peak load to find steady-state behavior
    - duration: 300
      arrivalRate: 50
      name: "Sustained peak"
    # 4. Spike: sudden burst to test elasticity
    - duration: 30
      arrivalRate: 150
      name: "Spike"
\`\`\`

An important distinction: \`arrivalRate\` controls how many new virtual users arrive per second, not how many are concurrent. A user that takes ten seconds to finish its flow overlaps with users that arrive after it, so concurrency is a function of arrival rate times flow duration. If you want a fixed number of active users instead, use \`arrivalCount\` with \`maxVusers\`, or the \`ramp\` you build with \`rampTo\`.

### Phase field reference

| Field | Meaning |
| --- | --- |
| \`duration\` | How long the phase runs, in seconds |
| \`arrivalRate\` | New virtual users created per second |
| \`rampTo\` | Linearly ramp arrivalRate up (or down) to this value |
| \`arrivalCount\` | Total users to spread evenly across the duration |
| \`maxVusers\` | Cap on simultaneously active virtual users |
| \`pause\` | Pause for N seconds before the next phase |
| \`name\` | Label shown in the report and metrics |

## Writing HTTP Scenarios

Real user journeys are more than one GET. Scenarios chain requests, pass data between them, capture values from responses, and add think time. Here is a login-then-act flow that captures a token and reuses it.

\`\`\`yaml
config:
  target: "https://api.example.com"
  phases:
    - duration: 120
      arrivalRate: 10
  payload:
    path: "users.csv"
    fields:
      - "email"
      - "password"

scenarios:
  - name: "Login and create order"
    weight: 7
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.token"
              as: "authToken"
      - think: 2
      - get:
          url: "/cart"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - post:
          url: "/orders"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            productId: 42
            quantity: 1
          expect:
            - statusCode: 201
  - name: "Browse only"
    weight: 3
    flow:
      - get:
          url: "/products"
\`\`\`

The \`payload\` block wires a CSV file to variables. Each virtual user pulls a row, so \`{{ email }}\` and \`{{ password }}\` differ per user. The \`capture\` block pulls the token out of the login response with a JSONPath expression and stores it as \`authToken\`, which later steps reference. \`think\` adds a pause in seconds to model a human reading the page. \`weight\` makes the login flow run seven times as often as the browse-only flow.

## WebSocket and Socket.io Load Testing

Artillery is one of the few load tools with first-class support for realtime protocols. For a raw WebSocket endpoint, set the engine to \`ws\`.

\`\`\`yaml
config:
  target: "wss://realtime.example.com"
  phases:
    - duration: 60
      arrivalRate: 10
  engines:
    ws: {}

scenarios:
  - engine: ws
    name: "Subscribe and receive"
    flow:
      - send: '{"action":"subscribe","channel":"prices"}'
      - think: 5
      - send: '{"action":"ping"}'
\`\`\`

For a Socket.io server, install the plugin and select the \`socketio\` engine. It understands emit and acknowledgement semantics that a raw WebSocket engine does not.

\`\`\`bash
npm install --save-dev @artillery/engine-socketio-v3
\`\`\`

\`\`\`yaml
config:
  target: "https://chat.example.com"
  phases:
    - duration: 60
      arrivalRate: 5
  engines:
    socketio-v3: {}

scenarios:
  - engine: socketio-v3
    name: "Join room and chat"
    flow:
      - emit:
          channel: "join"
          data: "general"
      - think: 1
      - emit:
          channel: "message"
          data:
            room: "general"
            text: "hello from artillery"
      - think: 3
\`\`\`

## Custom JavaScript Processors

When YAML runs out of expressiveness, drop into JavaScript. A processor is a plain Node module whose exported functions you reference by name. You can generate dynamic data before a request, inspect a response after it, or sign a payload.

\`\`\`javascript
// processor.js
const crypto = require('crypto');

// Runs before a request; mutate context.vars to set variables
function setSignedPayload(requestParams, context, ee, next) {
  const nonce = crypto.randomBytes(8).toString('hex');
  context.vars.nonce = nonce;
  context.vars.signature = crypto
    .createHash('sha256')
    .update(nonce + context.vars.email)
    .digest('hex');
  return next();
}

// Runs after a response; assert or record custom metrics
function checkLatency(requestParams, response, context, ee, next) {
  if (response.timings && response.timings.phases.firstByte > 500) {
    ee.emit('counter', 'slow_responses', 1);
  }
  return next();
}

module.exports = { setSignedPayload, checkLatency };
\`\`\`

Wire the processor into the config and reference the hooks in a scenario step.

\`\`\`yaml
config:
  target: "https://api.example.com"
  processor: "./processor.js"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - flow:
      - function: "setSignedPayload"
      - post:
          url: "/secure/action"
          json:
            email: "{{ email }}"
            nonce: "{{ nonce }}"
            signature: "{{ signature }}"
          afterResponse: "checkLatency"
\`\`\`

The four-argument signature (\`requestParams, context, ee, next\`) is the hook contract. Always call \`next()\` when you are done, or the virtual user hangs. The \`ee\` event emitter lets you push custom counters and histograms into the report.

## Assertions and SLA Thresholds

A load test that only prints numbers is a dashboard, not a gate. To fail a build on a regression, use the built-in \`ensure\` plugin. It reads final aggregate metrics and exits non-zero when a threshold is breached.

\`\`\`yaml
config:
  target: "https://api.example.com"
  phases:
    - duration: 120
      arrivalRate: 20
  plugins:
    ensure: {}
    expect: {}
  ensure:
    thresholds:
      - http.response_time.p95: 500
      - http.response_time.p99: 1000
    conditions:
      - expression: "http.codes.500 == 0"
        strict: true
      - expression: "http.request_rate > 15"

scenarios:
  - flow:
      - get:
          url: "/products"
          expect:
            - statusCode: 200
            - contentType: json
\`\`\`

There are two levels of checking. Per-request \`expect\` assertions (from the \`expect\` plugin) validate individual responses inline: status code, content type, response body shape. Aggregate \`ensure\` thresholds evaluate the whole run: p95 latency, p99 latency, error counts, request rate. When \`ensure\` fails, \`artillery run\` returns a non-zero exit code, which is exactly what CI needs.

## Metrics Output and Reporting

By default Artillery streams a live summary to the console every ten seconds and prints an aggregate report at the end: request rate, response-time percentiles (min, median, p95, p99, max), status-code counts, and error counts. For machine consumption, write JSON.

\`\`\`bash
# Write full run data to JSON
npx artillery run --output report.json load-test.yml

# Turn the JSON into a static HTML report (older workflow)
npx artillery report report.json
\`\`\`

To feed live dashboards, use the publish-metrics plugin, which pushes to Datadog, Prometheus, CloudWatch, or any StatsD sink.

\`\`\`yaml
config:
  target: "https://api.example.com"
  plugins:
    publish-metrics:
      - type: datadog
        apiKey: "{{ $env.DATADOG_API_KEY }}"
        prefix: "artillery."
        tags:
          - "service:checkout"
          - "env:staging"
  phases:
    - duration: 120
      arrivalRate: 20
\`\`\`

The \`{{ $env.VAR }}\` template pulls from environment variables, so secrets never live in the YAML. This is the pattern for every credential in an Artillery script.

## Running Artillery in CI

Artillery is designed to run in CI. Because it is an npm dev dependency and exits non-zero on threshold failures, wiring it into a pipeline is a few lines. Here is a GitHub Actions job that runs a smoke-level load test against staging on every push.

\`\`\`yaml
name: Load Test
on: [push]

jobs:
  artillery:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - name: Run load test
        run: npx artillery run --output report.json tests/load/smoke.yml
        env:
          TARGET_TOKEN: \${{ secrets.STAGING_TOKEN }}
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: artillery-report
          path: report.json
\`\`\`

Two habits keep CI honest. First, use a smaller phase profile in CI than in a full soak test; you want a fast signal on regressions, not a two-hour run on every commit. Second, always upload the report artifact with \`if: always()\` so you can inspect a failing run. The non-zero exit from a breached \`ensure\` threshold turns the job red automatically.

## Full-Page Load Testing with the Playwright Engine

Traditional load tools hammer API endpoints but miss the real user experience: the browser rendering the page, running JavaScript, and fetching dozens of assets. Artillery's Playwright engine runs a real headless browser per virtual user so you measure page-level metrics like time to first byte and largest contentful paint under load.

\`\`\`bash
npm install --save-dev @artillery/engine-playwright playwright
\`\`\`

\`\`\`yaml
config:
  target: "https://shop.example.com"
  engines:
    playwright: {}
  phases:
    - duration: 60
      arrivalRate: 2
  processor: "./flows.js"

scenarios:
  - engine: playwright
    testFunction: "checkoutFlow"
\`\`\`

\`\`\`javascript
// flows.js
async function checkoutFlow(page) {
  await page.goto('https://shop.example.com');
  await page.click('text=Shop now');
  await page.waitForSelector('.product-card');
  await page.click('.product-card:first-child button');
  await page.click('text=Checkout');
}

module.exports = { checkoutFlow };
\`\`\`

Keep the arrival rate low with the Playwright engine. Each virtual user is a full browser, which is far heavier than an HTTP request. Two to five browsers per second on a laptop is realistic; for higher browser concurrency, offload to Artillery Cloud. If you already run Python-based load tests, the [Locust load testing guide](/blog/locust-load-testing-python-guide) shows the equivalent scenario model for comparison.

## Scaling Out with Artillery Cloud

A single machine caps out somewhere in the low thousands of virtual users, depending on the flow. To simulate genuinely large traffic you distribute the load across many workers. Artillery Cloud runs your exact same YAML on managed AWS Lambda or Fargate workers and aggregates the metrics into a hosted dashboard.

\`\`\`bash
# Authenticate once with your Artillery Cloud key
export ARTILLERY_CLOUD_API_KEY="your-key"

# Run distributed across 25 Lambda workers in a chosen region
npx artillery run-lambda \\
  --count 25 \\
  --region us-east-1 \\
  --record \\
  load-test.yml

# Or run on Fargate for longer soak tests
npx artillery run-fargate --count 10 --record load-test.yml
\`\`\`

The \`--record\` flag streams results to the Artillery Cloud dashboard so you get percentile charts, per-endpoint breakdowns, and shareable run links. The key point: nothing about your test file changes. You author locally, verify on one machine, then multiply the worker count to reach the scale you need.

## Artillery vs k6 vs JMeter

Choosing a load tool comes down to language, protocol coverage, and how it fits your team. Here is a direct comparison of the three most common choices in 2026.

| Dimension | Artillery | k6 | JMeter |
| --- | --- | --- | --- |
| Test language | YAML + JavaScript | JavaScript (Go core) | XML + GUI (or DSL) |
| Runtime | Node.js | Go binary | Java (JVM) |
| Config style | Declarative YAML | Imperative scripting | GUI-driven XML |
| HTTP support | Yes | Yes | Yes |
| WebSocket / Socket.io | Yes, first-class | WebSocket yes | Via plugins |
| Browser-level load | Yes (Playwright engine) | Yes (k6 browser) | No |
| Distributed load | Artillery Cloud | k6 Cloud / operator | Master/worker setup |
| Best fit | Node.js teams, realtime APIs | Developer-centric scripting | Enterprise, protocol breadth |

Artillery wins when your stack is already JavaScript and you value a readable declarative format plus realtime protocol support. k6 wins when you want a fast single binary and prefer writing tests as code. JMeter remains strong for enterprise environments that need broad protocol support and a mature GUI. For a deeper split on the other two, read our [k6 vs JMeter comparison](/blog/k6-vs-jmeter-2026), and for a Python-native alternative see the [Locust load testing guide](/blog/locust-load-testing-python-guide).

## Frequently Asked Questions

### Is Artillery free and open source?

Yes. The Artillery core, including the CLI, the HTTP, WebSocket, Socket.io, and Playwright engines, the ensure and expect plugins, and JSON output, is open source under a permissive license and free to use. Artillery Cloud, the hosted service for distributed load generation and dashboards, is a paid add-on. You can run substantial local and CI load tests without paying anything.

### What is the difference between arrivalRate and concurrency?

\`arrivalRate\` is how many new virtual users Artillery creates per second, not how many run at once. Concurrency emerges from arrival rate times how long each flow takes. A flow that lasts ten seconds at an arrival rate of ten per second yields roughly one hundred concurrent users. Use \`maxVusers\` to cap simultaneous users if you need a fixed ceiling.

### Can Artillery test GraphQL APIs?

Yes. GraphQL runs over HTTP, so you use the standard HTTP engine and POST a JSON body containing your \`query\` and \`variables\` to the GraphQL endpoint. Capture values from the response with JSONPath just as with REST. There is no special GraphQL engine because none is needed; the HTTP scenario flow already covers it completely.

### How do I load test authenticated endpoints?

Add a login step at the start of the scenario flow, use \`capture\` with a JSONPath expression to pull the token from the response, and reference it as a variable in an \`Authorization\` header on later requests. For pre-issued tokens, put them in environment variables and read them with \`{{ $env.TOKEN }}\` so credentials stay out of the YAML file and out of version control.

### Does Artillery support think time between requests?

Yes. Add a \`think\` step with a number of seconds inside a scenario flow to pause a virtual user, modeling a human reading a page before the next action. Think time makes your load profile realistic: without it, virtual users fire requests back to back, which overstates throughput and understates the concurrency your server actually faces.

### Can I run Artillery without writing a YAML file?

Yes, for quick smoke tests. The \`artillery quick\` command hits a single URL with a configurable number of virtual users and requests directly from the command line, no config file required. It is ideal for a fast sanity check of one endpoint. For anything with multiple steps, data, or assertions, a YAML script is the right tool.

### How does Artillery fit into an AI-agent testing workflow?

Because Artillery tests are plain text (YAML plus small JS modules) they are easy for AI coding agents to generate, review, and maintain from a scenario description. Keep them in the repository next to your service so an agent has full context. The [QA skills directory](/skills) packages performance-testing patterns, including load-test scaffolding, that AI agents can install and apply directly to a project.
`,
};
