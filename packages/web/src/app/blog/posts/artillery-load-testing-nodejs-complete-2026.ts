import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Artillery Load Testing for Node.js Complete Guide 2026',
  description:
    'Complete Artillery load testing guide for Node.js teams. Covers artillery.yml, scenarios, phases, payloads, plugins, expect, JSON reporting, and GitHub Actions.',
  date: '2026-06-08',
  category: 'Guide',
  content: `
# Artillery Load Testing for Node.js Complete Guide 2026

Artillery is the load testing tool for Node.js engineers who want a YAML-driven, plugin-rich, CI-native way to validate that their HTTP, WebSocket, and gRPC services hold up under load. Unlike JMeter (XML + GUI) and k6 (JavaScript file with custom syntax), Artillery uses a familiar YAML configuration plus optional JavaScript hooks, runs entirely from npm, and ships a battery of built-in plugins for assertions, faker data, expect-style validations, and cloud reporting. This guide covers every part of the Artillery API surface as of v2 in 2026 -- configuration anatomy, scenarios, phases, payload injection, the expect plugin, custom JavaScript processors, distributed runs, and the full GitHub Actions setup for CI gating.

If you are searching for \`artillery load testing node.js documentation\`, this guide will get you from zero to production-grade load tests in an afternoon.

## Key Takeaways

- Artillery v2 ships as \`artillery\` on npm. Tests are YAML files defining \`config\` (target, phases, plugins) and \`scenarios\` (user flows)
- Phases describe load shape over time: \`duration\`, \`arrivalRate\`, \`rampTo\`, and \`maxVusers\` are the four knobs
- Scenarios are sequences of \`flow\` steps -- HTTP requests, WebSocket sends, pauses, loops, and capture steps for chaining data between requests
- The \`expect\` plugin replaces ad-hoc assertions with declarative checks (\`statusCode\`, \`contentType\`, \`hasHeader\`, \`hasProperty\`)
- Artillery supports custom JS processors for complex logic and integrates cleanly with GitHub Actions, GitLab CI, and any standard Node toolchain

## Installing Artillery

\`\`\`bash
npm install -g artillery
# or per-project
npm install --save-dev artillery
\`\`\`

Verify:

\`\`\`bash
artillery -V
# Artillery: 2.0.x
\`\`\`

Artillery requires Node 18 or newer. No JVM, no Python, no Docker required for local runs.

## Hello World

Smallest possible artillery.yml:

\`\`\`yaml
config:
  target: https://example.com
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - flow:
      - get:
          url: /
\`\`\`

Run:

\`\`\`bash
artillery run artillery.yml
\`\`\`

This boots 10 virtual users per second for 60 seconds, each making a GET / request. Artillery prints a real-time report and a final summary with response time percentiles, error rates, and throughput.

## Config Anatomy

\`\`\`yaml
config:
  target: https://api.example.com
  http:
    timeout: 30
    pool: 50
  phases: [...]
  payload:
    path: ./users.csv
    fields: [email, password]
  variables:
    apiVersion: v2
  plugins:
    expect: {}
    metrics-by-endpoint: {}
    apdex:
      threshold: 100
  ensure:
    p95: 500
    maxErrorRate: 1
  processor: ./processor.js
\`\`\`

Every field is optional except \`target\`. The most useful ones in practice are \`phases\`, \`plugins.expect\`, and \`ensure\`.

## Phases

Phases shape load over time. Each phase is a discrete time window with one of four behaviors:

| Phase shape | Example | Meaning |
|---|---|---|
| Steady rate | \`arrivalRate: 50\` | 50 new users per second |
| Steady users | \`arrivalCount: 100\` | 100 users total spread evenly |
| Ramp | \`rampTo: 200\` | Ramp from arrivalRate to 200 over duration |
| Pause | \`pause: 30\` | Hold (no new users) for 30 seconds |

\`\`\`yaml
phases:
  - duration: 60
    arrivalRate: 5
    name: warmup
  - duration: 120
    arrivalRate: 5
    rampTo: 50
    name: ramp
  - duration: 300
    arrivalRate: 50
    name: sustained
  - duration: 60
    arrivalRate: 50
    rampTo: 0
    name: cooldown
\`\`\`

The four-phase ramp pattern (warmup, ramp, sustain, cooldown) catches both slow-start bugs and sustained-load issues.

## Scenarios and Flow Steps

Scenarios describe what a single virtual user does:

\`\`\`yaml
scenarios:
  - name: browse and purchase
    weight: 3
    flow:
      - get:
          url: /products
      - think: 2
      - get:
          url: /products/{{ productId }}
      - think: 1
      - post:
          url: /cart
          json:
            productId: "{{ productId }}"
            quantity: 1
      - post:
          url: /checkout
          json:
            paymentMethod: card
\`\`\`

\`weight: 3\` makes this scenario 3x as likely to run as a scenario without weight. Multiple scenarios coexist; Artillery picks one per virtual user.

| Flow step | Purpose |
|---|---|
| \`get\`, \`post\`, \`put\`, \`patch\`, \`delete\` | HTTP request |
| \`think\` | Pause N seconds |
| \`loop\` | Repeat steps |
| \`function\` | Call a JS processor function |
| \`emit\`, \`send\` | WebSocket frames |
| \`log\` | Print a message |

## Capturing and Chaining Data

Use \`capture\` to pull a value from a response and reuse it in later steps:

\`\`\`yaml
scenarios:
  - flow:
      - post:
          url: /login
          json:
            email: ada@example.com
            password: secret
          capture:
            - json: $.token
              as: authToken
      - get:
          url: /me
          headers:
            Authorization: "Bearer {{ authToken }}"
\`\`\`

\`json\`, \`xml\`, \`regexp\`, \`header\`, \`selector\` (cheerio), and \`cookie\` are all valid capture extractors.

## The expect Plugin

Without the expect plugin, Artillery only fails requests that error at the HTTP layer (timeout, DNS, 5xx). To assert on response bodies, install and enable the plugin:

\`\`\`yaml
config:
  plugins:
    expect: {}

scenarios:
  - flow:
      - get:
          url: /api/users/1
          expect:
            - statusCode: 200
            - contentType: json
            - hasHeader: x-request-id
            - hasProperty: name
            - notHasProperty: error
            - equals:
                - "{{ status }}"
                - "active"
\`\`\`

Failures show up in the report's expectation counts and fail the run if you also set \`ensure\`.

| Expectation | Example |
|---|---|
| \`statusCode\` | \`statusCode: 200\` or \`statusCode: [200, 201]\` |
| \`contentType\` | \`contentType: json\` |
| \`hasHeader\` | \`hasHeader: content-type\` |
| \`headerEquals\` | \`headerEquals: [content-type, application/json]\` |
| \`hasProperty\` | \`hasProperty: id\` |
| \`notHasProperty\` | \`notHasProperty: error\` |
| \`equals\` | \`equals: [\\"{{ var }}\\", expected]\` |
| \`matchesRegexp\` | \`matchesRegexp: ["{{ id }}", "^\\\\d+$"]\` |

## Ensure (CI Gates)

\`ensure\` defines pass/fail thresholds for the entire run. Artillery exits non-zero when thresholds are violated, so CI fails the build:

\`\`\`yaml
config:
  ensure:
    p95: 500
    p99: 1000
    maxErrorRate: 1
    thresholds:
      - "http.response_time.p95": 500
      - "http.codes.500": 0
\`\`\`

\`p95: 500\` means the 95th percentile response time must be under 500ms. \`maxErrorRate: 1\` allows up to 1% errors. The \`thresholds\` array gives fine-grained control over any metric.

## Payloads and CSV Data

Inject test data from a CSV file:

\`\`\`yaml
config:
  payload:
    path: ./users.csv
    fields:
      - email
      - password
    cast: false
    order: sequence
    skipHeader: true
\`\`\`

\`users.csv\`:

\`\`\`csv
email,password
ada@example.com,pw1
grace@example.com,pw2
\`\`\`

Reference variables in flow:

\`\`\`yaml
- post:
    url: /login
    json:
      email: "{{ email }}"
      password: "{{ password }}"
\`\`\`

\`order: sequence\` cycles through rows in order. \`order: random\` picks rows randomly with replacement. For 50k+ users, prefer \`random\`.

## JavaScript Processor

For logic that exceeds YAML, wire in a JS module:

\`\`\`javascript
// processor.js
module.exports = {
  generateOrderId,
  logResponse,
  validateOrder,
};

function generateOrderId(context, events, done) {
  context.vars.orderId = 'ord-' + Math.random().toString(36).slice(2, 10);
  return done();
}

function logResponse(requestParams, response, context, events, done) {
  console.log('status', response.statusCode, 'body', response.body?.slice(0, 100));
  return done();
}

function validateOrder(requestParams, response, context, events, done) {
  const body = JSON.parse(response.body);
  if (body.total <= 0) events.emit('counter', 'errors.invalid_total', 1);
  return done();
}
\`\`\`

Use from YAML:

\`\`\`yaml
config:
  processor: ./processor.js

scenarios:
  - flow:
      - function: generateOrderId
      - post:
          url: /orders
          json:
            id: "{{ orderId }}"
          afterResponse: validateOrder
\`\`\`

Hooks: \`beforeRequest\`, \`afterResponse\`, \`function\`, \`beforeScenario\`, \`afterScenario\`.

## Plugins Overview

| Plugin | Purpose |
|---|---|
| expect | Declarative response assertions (covered above) |
| metrics-by-endpoint | Group metrics by URL pattern |
| apdex | Compute Application Performance Index |
| publish-metrics | Push to Datadog, New Relic, CloudWatch, OTel |
| ensure | Pass/fail gates (built in) |
| faker | Generate fake data inline |
| slack | Notify Slack on completion |

Enable each in \`config.plugins\`:

\`\`\`yaml
config:
  plugins:
    expect: {}
    metrics-by-endpoint:
      useOnlyRequestNames: true
    apdex:
      threshold: 100
    publish-metrics:
      - type: datadog
        apiKey: "{{ \\\$processEnvironment.DD_API_KEY }}"
        tags: ["env:staging"]
\`\`\`

## WebSocket Support

\`\`\`yaml
config:
  target: ws://example.com
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - engine: ws
    flow:
      - send: 'hello server'
      - think: 1
      - send: '{"type":"ping"}'
      - think: 1
\`\`\`

For Socket.IO use \`engine: socketio\` and the matching flow syntax.

## Comparison: Artillery vs Other Load Tools

| Feature | Artillery | k6 | JMeter | Locust |
|---|---|---|---|---|
| Language | YAML + JS | JavaScript | XML + Groovy | Python |
| Config style | Declarative | Imperative | GUI/XML | Code |
| Plugins | Many | Modules | Many | Libraries |
| Cloud SaaS | Artillery Cloud | k6 Cloud | BlazeMeter | Locust Cloud |
| WebSocket | Yes | Yes | Plugin | Library |
| Browser load | Playwright engine | Browser API | WebDriver Sampler | Selenium |
| Distributed mode | Cloud or DIY | Cloud | Native | Native |
| Open source | Apache 2.0 | AGPL | Apache 2.0 | MIT |

Artillery's sweet spot: Node.js teams that want declarative configuration with optional code escape hatches, plus a strong plugin ecosystem.

## GitHub Actions Integration

\`\`\`yaml
name: Load Test
on:
  pull_request:
    paths: ['src/**', 'load/**']

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g artillery
      - run: artillery run load/artillery.yml --output report.json
      - run: artillery report report.json --output report.html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: artillery-report
          path: |
            report.json
            report.html
\`\`\`

Artillery exits non-zero when \`ensure\` thresholds are violated, automatically failing the build.

## Custom Metrics

Emit your own counters and histograms:

\`\`\`javascript
function afterResponse(req, res, context, events, done) {
  events.emit('counter', 'user.orders.created', 1);
  events.emit('histogram', 'order.total', JSON.parse(res.body).total);
  return done();
}
\`\`\`

These show up in the JSON report and are pushed to your metrics backend via the publish-metrics plugin.

## Realistic Multi-Scenario Example

\`\`\`yaml
config:
  target: https://api.example.com
  http:
    timeout: 30
  phases:
    - duration: 60
      arrivalRate: 5
      name: warmup
    - duration: 300
      arrivalRate: 5
      rampTo: 30
      name: ramp
    - duration: 600
      arrivalRate: 30
      name: sustained
  payload:
    path: ./users.csv
    fields: [email, password]
    order: random
  plugins:
    expect: {}
    metrics-by-endpoint: {}
  ensure:
    p95: 500
    p99: 1500
    maxErrorRate: 1

scenarios:
  - name: browse only
    weight: 8
    flow:
      - get:
          url: /products
          expect:
            - statusCode: 200
            - contentType: json
      - think: 2
      - get:
          url: /products/123
          expect:
            - statusCode: 200

  - name: login and order
    weight: 2
    flow:
      - post:
          url: /auth/login
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: $.token
              as: token
          expect:
            - statusCode: 200
            - hasProperty: token
      - get:
          url: /cart
          headers:
            Authorization: "Bearer {{ token }}"
      - post:
          url: /orders
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            items: [{ id: 123, qty: 1 }]
          expect:
            - statusCode: 201
            - hasProperty: orderId
\`\`\`

## Reporting Output

Artillery prints stats in real time and a final summary:

\`\`\`text
http.codes.200: ............................................ 14302
http.codes.500: ............................................ 12
http.response_time:
  min: .................................................... 45
  max: .................................................... 1820
  median: ................................................. 110
  p95: .................................................... 412
  p99: .................................................... 980
http.request_rate: ......................................... 30/sec
vusers.created: ............................................ 18000
vusers.failed: ............................................. 12
\`\`\`

The JSON output (\`--output report.json\`) contains every metric for downstream analysis.

## Debugging

\`DEBUG=http,plugin:expect artillery run artillery.yml\` enables verbose logs. The two most-watched flags:

| Flag | Use |
|---|---|
| \`--quiet\` | Suppress real-time output |
| \`--output report.json\` | Write JSON metrics |
| \`--config config.yml\` | Separate config from scenarios |
| \`--insecure\` | Skip TLS verification |
| \`--input scenarios.yml\` | Append more scenarios |
| \`--overrides '{\\"config\\":{\\"target\\":\\"https://x\\"}}'\` | Patch config |

## Distributed Mode (Artillery Cloud)

Artillery Cloud (paid SaaS) runs your tests on managed workers and aggregates reports. Trigger from CLI:

\`\`\`bash
artillery run-fargate artillery.yml --count 10 --region us-east-1
\`\`\`

The DIY equivalent: run multiple \`artillery run\` processes on different hosts and merge JSON reports afterward. For most teams the SaaS path saves operational overhead.

## Frequently Asked Questions

### Is Artillery free?

The CLI is Apache 2.0 open source and free. Artillery Cloud (the SaaS) is paid. You can run unlimited tests locally or in your own CI without any license.

### Can Artillery do browser-based load tests?

Yes, via the Playwright engine. Add \`engine: playwright\` to your scenario and write scenarios using Playwright's API. This is heavier than HTTP load and best used for small VU counts.

### How does Artillery compare to k6?

Artillery is YAML-first with JS hooks; k6 is JavaScript-first. Artillery has a wider plugin ecosystem; k6 has a faster runtime and better single-binary distribution. Both excel at HTTP load testing. Choose based on team preference -- YAML vs JS.

### How do I run Artillery in Docker?

The official image is on Docker Hub: \`artilleryio/artillery:latest\`. Use:

\`\`\`bash
docker run --rm -v \\\$(pwd):/scripts artilleryio/artillery run /scripts/artillery.yml
\`\`\`

Useful in CI without installing Node.

### Can I share state between scenarios?

Each virtual user has its own context. Sharing across scenarios requires an external store (Redis) or processor logic. For simple cases, capture once at login and pass through subsequent requests within the same scenario.

### What is the difference between arrivalRate and arrivalCount?

\`arrivalRate\` is users per second sustained for the phase duration. \`arrivalCount\` is a total number of users spread evenly across the phase. Use \`arrivalRate\` for steady load; \`arrivalCount\` for fixed batch sizes.

### How do I correlate Artillery results with APM data?

Use the publish-metrics plugin to push Artillery's metrics into your APM (Datadog, New Relic, OTel) alongside server-side telemetry. Then trace correlate by request timestamp.

## Conclusion

Artillery hits the sweet spot for Node.js teams: declarative YAML for the common 80%, JS hooks for the complex 20%, plugins for everything else, and clean CI integration via exit codes and JSON reports. Get a four-phase ramp test wired in your repo, set p95 thresholds in \`ensure\`, and run on every PR.

For more load testing references, see our [Locust vs JMeter comparison](/blog/locust-vs-jmeter-2026-which-load-testing), the [JMeter ResponseAssertion reference](/blog/jmeter-5-6-3-response-assertion-jmx-xml-reference), and browse the [load testing skills](/skills) for AI agent skills that scaffold Artillery configs from API contracts. The [load testing tool comparison](/compare) covers all major options side by side.
`,
};
