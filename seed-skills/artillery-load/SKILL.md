---
name: Artillery Load Testing
description: Write and run Artillery load tests with YAML phases and scenarios, CSV data payloads, the expect plugin for functional checks, and ensure thresholds that fail CI when latency or error budgets are breached.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [artillery, load-testing, performance, stress-testing, yaml, thresholds, ci, api, latency]
testingTypes: [load, performance]
frameworks: [k6]
languages: [javascript]
domains: [api, web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Artillery Load Testing

This skill makes an AI agent author Artillery 2.x load tests as declarative YAML: realistic traffic phases, multi-step scenarios with captured variables, CSV-driven virtual user data, functional `expect` checks inside load flows, and `ensure` thresholds that turn latency regressions into red CI builds. Trigger it when a project contains `artillery.yml`, `artillery` in package.json, or when the user asks for load, stress, soak, or spike testing of an HTTP API or website in a Node.js stack.

## Core Principles

1. **Model traffic in phases, never one flat rate.** Real load has a warm-up, a ramp, and a sustained plateau. A single `arrivalRate` hides cold-start effects and autoscaling lag. Always define at least warm-up, ramp, and sustain phases.
2. **`arrivalRate` is new virtual users per second, not concurrency.** Each arriving VU runs the whole scenario. If your scenario takes 10 seconds and you arrive 50/sec, you have roughly 500 concurrent users. Calculate this before picking numbers.
3. **Thresholds belong in the test file, not in a wiki.** Use the `ensure` plugin so `artillery run` exits non-zero when p95/p99 or error rate budgets are blown. A load test that cannot fail is a demo, not a test.
4. **Assert correctness under load with `expect`.** A server returning 200 with an empty body at p99 latency is still broken. Check `statusCode`, `contentType`, and `hasProperty` inside the flow.
5. **Parameterize virtual users from CSV payloads.** Hammering one account exercises one cache line and one DB row. Use `payload` with hundreds of distinct credentials and SKUs to defeat caches realistically.
6. **Never load test production without a plan; never load test third parties at all.** Point Artillery at a staging environment sized like production, announce test windows, and rate-limit anything that crosses a vendor boundary.

## Setup

```bash
npm install --save-dev artillery@latest
npx artillery version

# Run a test locally
npx artillery run load/checkout.yml

# Save raw metrics for trend analysis
npx artillery run load/checkout.yml --output artillery-report.json
```

## Patterns

### 1. Phases and a multi-step scenario with capture

```yaml
# load/checkout.yml
config:
  target: https://staging-api.example.com
  http:
    timeout: 10
  phases:
    - duration: 60
      arrivalRate: 2
      name: warm-up
    - duration: 120
      arrivalRate: 5
      rampTo: 40
      name: ramp-to-peak
    - duration: 300
      arrivalRate: 40
      name: sustained-peak
  payload:
    path: users.csv
    fields:
      - email
      - password
    order: random
    skipHeader: true
  plugins:
    expect: {}
    ensure: {}
  ensure:
    thresholds:
      - http.response_time.p95: 250
      - http.response_time.p99: 500
    conditions:
      - expression: http.codes.200 > 0
        strict: true
    maxErrorRate: 1

scenarios:
  - name: login-browse-order
    flow:
      - post:
          url: /auth/login
          json:
            email: '{{ email }}'
            password: '{{ password }}'
          capture:
            - json: $.token
              as: authToken
          expect:
            - statusCode: 200
            - contentType: json
            - hasProperty: token
      - get:
          url: /products?category=audio
          headers:
            Authorization: 'Bearer {{ authToken }}'
          capture:
            - json: $[0].id
              as: productId
          expect:
            - statusCode: 200
      - post:
          url: /orders
          headers:
            Authorization: 'Bearer {{ authToken }}'
          json:
            productId: '{{ productId }}'
            quantity: 1
          expect:
            - statusCode: 201
            - hasProperty: orderId
      - think: 2
```

### 2. CSV payload file

```csv
email,password
loadtest-001@example.com,Str0ngPass!001
loadtest-002@example.com,Str0ngPass!002
loadtest-003@example.com,Str0ngPass!003
loadtest-004@example.com,Str0ngPass!004
```

Generate hundreds of rows with a one-liner instead of writing them by hand:

```bash
seq -w 1 500 | awk -F, 'BEGIN{print "email,password"} {printf "loadtest-%s@example.com,Str0ngPass!%s\n", $1, $1}' > users.csv
```

### 3. Custom logic with a JavaScript processor

```yaml
# In config:
config:
  target: https://staging-api.example.com
  processor: ./processor.js

scenarios:
  - name: create-order-with-dynamic-payload
    flow:
      - function: generateOrderPayload
      - post:
          url: /orders
          json:
            sku: '{{ sku }}'
            quantity: '{{ quantity }}'
          afterResponse: logSlowResponse
```

```js
// processor.js
module.exports = { generateOrderPayload, logSlowResponse };

function generateOrderPayload(context, events, done) {
  // Runs before the request; sets template variables on the VU context
  context.vars.sku = `SKU-${1000 + Math.floor(Math.random() * 9000)}`;
  context.vars.quantity = 1 + Math.floor(Math.random() * 4);
  return done();
}

function logSlowResponse(requestParams, response, context, events, done) {
  const tookMs = response.timings ? response.timings.phases.total : 0;
  if (tookMs > 1000) {
    console.warn(`SLOW ${requestParams.url} -> ${response.statusCode} in ${tookMs}ms`);
    events.emit('counter', 'custom.slow_responses', 1);
  }
  return done();
}
```

### 4. CI gate in GitHub Actions

The `ensure` plugin makes Artillery exit with code 1 on any threshold breach, so the job fails without extra scripting.

```yaml
# .github/workflows/load-test.yml
name: load-test
on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * 1'

jobs:
  artillery:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Run load test against staging
        run: npx artillery run load/checkout.yml --output artillery-report.json
        env:
          ARTILLERY_DISABLE_TELEMETRY: 'true'
      - name: Upload raw metrics
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: artillery-report
          path: artillery-report.json
```

## Best Practices

- Name every phase; phase names appear in the metrics output and make reports readable.
- Use `think` steps (1-3 seconds) between requests so VUs pace like humans instead of a retry storm.
- Keep one scenario per user journey and weight them with `weight:` to mirror real traffic mix (for example 70 percent browse, 25 percent search, 5 percent checkout).
- Pin the p95 and p99 thresholds to your SLOs, not to whatever the system currently does.
- Run a 1-VU smoke (`--overrides '{"config":{"phases":[{"duration":10,"arrivalRate":1}]}}'`) before any big run to catch broken auth and 4xx noise cheaply.
- Store `--output` JSON artifacts from every CI run so you can diff p95 across releases.
- Set `http.timeout` explicitly; the 120-second default hides hangs as slow successes.

## Anti-Patterns

- A single phase with a huge `arrivalRate` and no ramp: you are testing the load balancer's SYN queue, not your application.
- Asserting nothing: runs that "pass" while every response is a 500 error page, because no `expect` or `ensure` block exists.
- Reusing one hardcoded user for every VU: session caches and row locks make results meaninglessly optimistic or pessimistic.
- Load testing through localhost against a dev-mode server with hot reload: numbers are fiction; test a production build on production-like hardware.
- Comparing runs executed from a laptop on Wi-Fi against runs from CI: generator location and capacity are part of the experiment, keep them constant.
- Cranking `arrivalRate` past what one generator machine can produce: watch for Artillery's own CPU warnings, and split load across workers (or Fargate via `artillery run-fargate`) instead.

## When to Trigger This Skill

- The repository contains `artillery.yml`, files under `load/` or `perf/` with Artillery config, or `artillery` in `package.json` devDependencies.
- The user asks to "load test", "stress test", "soak test", or "spike test" an HTTP API, GraphQL endpoint, or website in a JavaScript or Node.js project.
- The user wants latency SLO enforcement (p95/p99 budgets, max error rate) wired into CI.
- An existing Artillery suite needs CSV data, captured variables, custom processor functions, or threshold gating added.
- Choose Artillery over k6 when the team prefers declarative YAML scenarios and npm-native tooling; recommend k6 instead when tests need rich scripted logic in JavaScript with custom metrics math.
