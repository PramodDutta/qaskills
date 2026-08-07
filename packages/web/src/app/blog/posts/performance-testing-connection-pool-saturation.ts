import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Performance Testing Connection Pool Saturation Without Misleading Graphs',
  description: 'Detect performance testing connection pool saturation with open-model load, pool metrics, wait-time signals, and diagnoses that separate app limits from generator limits.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# Performance Testing Connection Pool Saturation Without Misleading Graphs

Performance testing connection pool saturation means proving whether a fixed pool of connections (HTTP client pools, database pools, Redis pools, upstream API clients) becomes the dominant wait under load, and whether the system fails gracefully when every connection is busy. The useful outcome is not a single "max RPS" vanity number. It is a measured relationship among offered load, in-flight work, pool wait time, application latency, error behavior, and recovery after load drops.

Connection pools exist to bound resources. When the bound is too small for legitimate traffic, users queue. When the bound is large but downstream is slow, pools fill and the application amplifies latency. When timeouts are wrong, saturated pools produce retry storms that make saturation worse. Performance tests that only plot average latency often miss the queue signal entirely until production incidents force a midnight dashboard review.

This article gives QA and performance engineers a concrete way to design tests, instrumentation, and pass/fail criteria for pool saturation. Tooling examples use k6 for open-model load and discuss JMeter where teams already run it; for a broader tool comparison see [k6 vs JMeter in 2026](/blog/k6-vs-jmeter-2026). Keep heavy pool-saturation experiments off shared environments used by sharded UI pipelines such as those in the [Playwright test sharding parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide).

## Define the pool under test as a first-class system boundary

Name the pool, its owner, and the work unit that borrows from it.

| Pool type | Typical borrower | Saturation symptom | Downstream risk |
|---|---|---|---|
| App DB pool | Request threads/async tasks | Threads wait for a connection | DB CPU or lock contention masked as app slowness |
| HTTP client pool to dependency | Outbound service calls | Timeouts, queue wait metrics | Dependency overload or local queueing |
| Reverse proxy upstream connections | Edge to app | 502/503, queueing at edge | App not receiving full offered load |
| Message consumer concurrency | Workers | Lag growth | Broker retention pressure |
| Browser or test client pools | Load generator itself | Generator under-generation | False confidence in SUT capacity |

Write the hypothesis in one sentence: "At R operations/sec, the checkout service DB pool of size P will show wait time above W ms and p95 API latency above L ms." If you cannot name P and the metric source for waits, you are not yet ready to claim a saturation test.

## Prefer workload models that keep offering work

Closed-loop tests with a fixed small VU count can accidentally protect the pool. If each virtual user holds one in-flight request and you run fewer users than pool size, you may never queue. Saturation studies usually need either:

- Concurrency at or above pool size with realistic hold times, or
- An open model (arrival rate) that continues to start work while earlier calls wait

\`\`\`js
import http from 'k6/http';
import { check } from 'k6';

// Open-model shape: keep starting checkout validations while servers hold DB connections.
export const options = {
  scenarios: {
    offer_load: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { target: 5, duration: '1m' },
        { target: 40, duration: '3m' },
        { target: 80, duration: '3m' },
        { target: 80, duration: '8m' },
        { target: 10, duration: '2m' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const res = http.post(
    __ENV.BASE_URL + '/api/checkout/validate',
    JSON.stringify({ cartId: 'load-test-cart' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'checkout-validate' } },
  );
  check(res, {
    'not 5xx': (r) => r.status < 500,
  });
}
\`\`\`

Pair this with application metrics. k6 alone cannot see DB pool wait histograms unless you export them from the system under test.

## Instrument the signals that prove pool pressure

Latency is a lagging blend of many causes. Saturation evidence needs pool-specific signals.

### Application and runtime signals

- Pool active connections
- Pool idle connections
- Threads or tasks waiting for a connection
- Wait time histogram or summary for borrow operations
- Acquire timeout count
- Downstream call duration for the dependency the pool protects

### Edge and dependency signals

- Dependency saturation (DB CPU, locks, connection count on the server side)
- Queue depth if work is buffered
- Retry counts and timeout counts by cause

### Load generator signals

- Achieved arrival rate vs target
- Client-side connection errors
- Generator CPU and file descriptor usage

| Metric pair | Interpretation when both rise | Interpretation when only latency rises |
|---|---|---|
| Pool wait + API p95 | Strong saturation evidence | Look for other wait sources |
| DB CPU + API p95 | Downstream compute bound | Pool may still be large enough |
| Acquire timeouts + errors | Hard failure mode under saturation | Misconfigured timeout or pool |
| Generator VU max + low achieved rate | Generator bound | Do not blame the SUT pool yet |
| Retry rate + pool wait | Amplification loop likely | Fix retries before raising pool size |

Export metrics to the same timeline as the load stages so you can mark smoke, ramp, hold, and cool-down on every chart.

## Build a staged experiment, not a single spike

A clean saturation experiment has phases with different questions.

1. **Calibration**: low rate, confirm functional success and baseline borrow times near zero wait
2. **Approach**: climb toward the theoretical safe rate (roughly related to pool size and mean hold time)
3. **Cross**: pass the expected saturation knee
4. **Hold**: stay saturated long enough to observe timeouts, queue growth, and stability
5. **Recovery**: reduce load and verify waits return to baseline without process restart

Little's Law intuition helps planning: if each request holds a pool connection for \`H\` seconds on average, and the pool size is \`P\`, then sustainable concurrency of holders is about \`P\`, and sustainable rate is about \`P / H\` when the pool is the only limit. Real systems have additional limits, so treat \`P / H\` as a planning estimate, not a guarantee.

\`\`\`js
// Planning notes embedded beside the script for reviewers:
// poolSize P = 20 (service config)
// measured hold time H ~= 0.05s at low load for DB checkout path
// rough rate ceiling ~= 20 / 0.05 = 400 ops/s if pool is pure limit
// test climbs through 50, 150, 300, 450 to find the knee empirically
\`\`\`

Do not publish the estimate as a result. Publish the measured knee with metrics attached.

## Separate client pool saturation from server pool saturation

What people get wrong: they crank concurrency in the load tool, see connection errors, and conclude the application pool is small. Sometimes the generator's own HTTP client pool, ephemeral port range, or remote OS limits failed first.

### Diagnosis checklist for generator-side limits

- Achieved load plateaus while SUT CPU and pool wait remain low
- Client errors mention connection reset, timeout dialing, or cannot assign requested address
- Multiple generator instances increase total throughput linearly
- Single generator CPU is hot or open files are exhausted

### Diagnosis checklist for server pool limits

- Pool active equals max size for sustained periods
- Wait time or queue length tracks latency
- Dependency metrics may still look healthy if the app is simply under-pooled
- Adding app instances each with their own pool changes total capacity (until the dependency becomes the limit)

\`\`\`bash
# Example host-level checks on a Linux generator during a suspect run.
# Adapt to your OS and monitoring stack; names vary by distribution.
ulimit -n
ss -s
# Watch ephemeral port usage and TIME_WAIT growth during the peak hold.
\`\`\`

Rerun with two generators or a larger client machine before you open a ticket to double the DB pool.

## Design pass/fail criteria that match user impact

Pool saturation is sometimes acceptable for brief peaks if queues stay short and recover. Criteria should reflect product risk.

| Risk posture | Example gate | When to use |
|---|---|---|
| Strict user-facing API | p95 < SLO and pool wait p95 < budget at target rate | Checkout, auth, payments |
| Best-effort internal job | No acquire timeouts; lag drains after peak | Batch enrichment |
| Resilience drill | Timeouts return 503 quickly; no crash; recovery after cool-down | Chaos-informed capacity tests |
| Dependency protection | Retry budget not exceeded; no stampede | Shared DB or third-party API |

\`\`\`js
export const options = {
  scenarios: {
    knee_hunt: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 400,
      stages: [
        { target: 10, duration: '1m' },
        { target: 100, duration: '4m' },
        { target: 200, duration: '4m' },
        { target: 300, duration: '4m' },
        { target: 300, duration: '6m' },
        { target: 20, duration: '3m' },
      ],
    },
  },
  thresholds: {
    // Adjust numbers to your SLO; these are illustrative only.
    'http_req_duration{endpoint:checkout-validate}': ['p(95)<800'],
    'http_req_failed{endpoint:checkout-validate}': ['rate<0.02'],
  },
};
\`\`\`

If you can export pool wait as a custom metric from a side channel, do it. Otherwise, attach monitoring screenshots or Prometheus queries to the test report and evaluate them as part of the quality gate in CI analysis steps.

## Reproduce the realistic failure mode: timeout plus retry stampede

A common production story:

1. Downstream slows
2. App threads hold pool connections longer
3. Pool wait climbs
4. Callers time out
5. Clients retry
6. Offered load multiplies
7. Pool never drains

### How to reproduce safely in performance testing

- Inject downstream delay in a test double or fault proxy for a subset of calls
- Use arrival-rate load so retries (if client-side in SUT) compete with new traffic
- Watch pool active, wait, timeout, and retry metrics together
- Verify circuit breakers or bulkheads if they exist

\`\`\`ts
// Pseudocode for a fault-injecting dependency stub used only in perf environments.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';

const delayMs = Number(process.env.INJECT_DELAY_MS || '0');
const errorRate = Number(process.env.INJECT_ERROR_RATE || '0');

createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }
  if (Math.random() < errorRate) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'injected-unavailable' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}).listen(8091);
\`\`\`

Run three comparisons: baseline, delayed dependency, delayed dependency with app retries disabled. The delta tells you whether retries are the amplifier.

## Test configuration changes as experiments, not folklore

When someone says "just increase the pool," require a controlled A/B:

| Experiment cell | Pool size | Timeout | Load shape | Expected if pool was the limit |
|---|---|---|---|---|
| A | P | T | Peak hold | Baseline knee |
| B | 2P | T | Same | Higher knee or lower wait at same rate |
| C | P | T/2 | Same | Faster errors, less queue latency, maybe more error rate |
| D | 2P | T | Same + dependency delay | Shows whether dependency is true limit |

If doubling the pool does not move the knee, the pool was not the primary bottleneck. Stop increasing it; you may only hide dependency overload longer and then fail harder.

## Capture application-side traces for borrow waits

When metrics are coarse, distributed traces help. Annotate spans where connections are borrowed and returned. In review, sort slow traces by time spent waiting for a connection versus time spent executing queries.

\`\`\`sql
-- Example diagnostic query shape for apps that log wait metrics to a table.
-- Replace names with your observability schema; do not assume these tables exist.
SELECT
  date_trunc('minute', ts) AS minute,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY pool_wait_ms) AS p95_wait,
  max(pool_active) AS max_active,
  sum(acquire_timeouts) AS timeouts
FROM app_pool_samples
WHERE service = 'checkout'
  AND ts >= NOW() - INTERVAL '2 hours'
GROUP BY 1
ORDER BY 1;
\`\`\`

If you cannot get wait metrics, you are performance testing blind for this failure class. Instrument first; load second.

## Coordinate timeouts across layers

Saturation disasters often come from timeout stacks that do not align:

- Client times out at 2s
- App waits for DB pool up to 30s
- DB query runs up to 60s
- Load balancer times out at 10s

Under pool pressure, work continues after the client is gone, still holding connections.

### Test assertions for timeout alignment

1. Under injected saturation, server work should cancel or be bounded when clients disconnect if the stack supports cancellation
2. Acquire timeouts should be shorter than user-facing request timeouts when fail-fast is desired
3. Error responses should be cheap to generate so failing requests release resources quickly

\`\`\`js
import http from 'k6/http';

export const options = {
  scenarios: {
    fail_fast_check: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 150,
      maxVUs: 300,
    },
  },
};

export default function () {
  // Intentionally short client timeout to study server behavior under abandoned calls.
  const res = http.get(__ENV.BASE_URL + '/api/report/heavy', {
    timeout: '2s',
    tags: { endpoint: 'heavy-report' },
  });
  // Record status classes for later analysis rather than asserting all success.
  if (res.status === 0) {
    // k6 uses status 0 for client-side timeouts/errors in many cases.
  }
}
\`\`\`

Review server metrics during this test: do pool actives drain after the client timeout wave, or stay pegged?

## JMeter notes for teams already invested there

JMeter thread groups are naturally closed-loop concurrency models. You can still study pools by:

- Setting threads at and above expected connection holders
- Using timers carefully so think time does not under-exercise the pool
- Climbing threads in steps while plotting pool wait
- Avoiding listeners that slow the generator during peak

If you need open-model arrivals, k6 arrival-rate executors or other open-model tools may express the hypothesis more directly. Choose based on the control variable, not team habit alone.

## CI and environment strategy

Pool saturation tests are noisy neighbors. Practical layout:

1. Dedicated perf environment with production-like pool sizes
2. Nightly knee-hunt job with artifacted Grafana links or CSV exports
3. PR-level smoke that only checks instrumentation endpoints are alive
4. Manual or scheduled resilience run with dependency delay injection

\`\`\`yaml
name: pool-saturation-nightly
on:
  schedule:
    - cron: '0 3 * * *'

jobs:
  knee-hunt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 pool scenario
        run: k6 run ./perf/checkout-pool-knee.js -e BASE_URL="\$PERF_BASE_URL"
      - name: Export note template
        run: |
          echo "Attach pool wait dashboard and achieved rate screenshot" > report-reminder.txt
\`\`\`

Never point saturation peaks at production without explicit game-day controls.

## Report structure that prevents wrong "fixes"

A complete saturation report includes:

1. Pool identity and configuration (size, timeout, queue settings)
2. Work unit and mean hold time at baseline
3. Load model and why it can saturate the pool
4. Charts: offered rate, achieved rate, latency, error rate, pool active, pool wait
5. Knee description in plain language
6. Experiments that doubled pool size or injected delay
7. Recommended change ranked: reduce hold time, fix queries, align timeouts, then resize pool
8. Follow-up test plan after the change

Teams that only resize pools accumulate larger outages. Hold-time reduction (faster queries, less work under a transaction, caching) multiplies capacity without multiplying dependency load as aggressively.

## What people get wrong

**Wrong: equating "connections in use" with healthy utilization.** A pool at 90% active with zero wait may be fine. A pool at 60% active with a long waiter queue may indicate unfairness, stuck holders, or measurement lag. Always pair active with wait.

**Wrong: testing only with cached happy paths.** If production hold time includes authorization, audit writes, or multi-statement transactions, your test must too.

**Wrong: ignoring cool-down.** Some leaks appear only as load falls: connections not returned, finalizers delayed, or pool metrics never returning to idle.

**Wrong: using functional parallel CI environments for destructive peaks.** You will create flaky UI failures and dirty data fights. Isolate.

Ready-made QA skills from qaskills.sh (via the qaskills CLI) can help scaffold load scripts and checklists, but pool sizes, hold times, and SLOs must come from your service telemetry.

## Action plan for the next service you own

1. Inventory pools and export wait metrics if missing
2. Measure baseline hold time for the critical request
3. Estimate a starting knee with P/H and schedule an empirical climb
4. Implement open-model or high-concurrency tests with recovery stage
5. Run dependency delay experiment
6. Publish a report that resists folklore fixes
7. Automate the baseline climb in nightly CI with artifacts

Saturation testing is capacity testing plus honesty about queues. If your graphs cannot show the queue, they cannot show the truth.

## Transaction boundaries that accidentally extend hold time

Many saturations are not "pool too small" but "connection held across a remote call." Classic anti-pattern: open a database transaction, call a payment HTTP API, then write the result. Every second of payment latency becomes a second of pool occupancy for every concurrent checkout.

Performance tests should include a scenario that slows the payment dependency (stub delay of 500ms to 2s) while concurrency climbs. Under the unsafe transaction shape, acquire wait rises even when the database CPU is quiet. That chart sells a refactor more effectively than abstract architecture advice.

Safer shapes keep database transactions short: write pending state, release the connection, perform remote I/O, then complete with a second short transaction. Re-run the same load shape after the change and compare acquire wait p95. Publish both charts in the incident follow-up so the lesson sticks.

## Stacked queues with external poolers

Application pools and external poolers (for example process-local pools in front of a shared database proxy) create stacked queues. You can saturate the app pool waiting on the pooler, the pooler waiting on the database, or both. A knee chart that only plots application active connections will miss pooler queue time and push teams toward the wrong knob.

Export pooler client wait and server connection usage beside application metrics. Align timestamps with the load generator stages. When application pending rises while database sessions stay below max, inspect pooler limits and queue mode before increasing application max size again. When both layers pending rise and database CPU is hot, fix queries or scale the data tier first.

## Tenant fairness under a shared pool

Multi-tenant systems often share one pool. A noisy tenant with expensive filters can inflate hold time and make quiet tenants wait. Design a combined experiment: one scenario generates heavy analytical reads for tenant N, another generates simple reads for tenant Q at moderate arrival rates. If tenant Q p95 climbs in lockstep with tenant N load while Q's own queries remain simple, you have a fairness incident waiting for production.

Mitigations to validate after the experiment include statement timeouts, per-tenant concurrency limits at the edge, separate read pools or replicas for heavy analytics, and admission control. The performance suite should keep the unfair combined scenario as a regression so a future feature does not reintroduce unbounded hold time.

## Synthetic hold canaries between full ramps

Full knee charts are expensive. Between them, run a low-rate canary that borrows a connection, executes a trivial query, releases, and records acquire wait. When canary wait rises without an intentional load test, something else is consuming the pool: a deploy with a leak, a stuck batch job, or a lock storm. Alert on canary wait before user-facing latency pages fire. That early signal is often the difference between a quiet fix and a customer-visible outage.

Wire canary results next to deploy markers. If wait jumps only after a specific release, bisect with the same canary on the previous artifact. This is still performance testing connection pool saturation work; it simply runs continuously instead of only on the night before launch.

## Frequently Asked Questions

### How do I know the pool is saturated rather than the CPU?

Look for elevated borrow wait while CPU remains moderate, active connections pinned near max, and latency that tracks wait time. If CPU is pegged and pool wait is near zero, you are compute-bound or stuck in non-pool work. Confirm with profiles and query timelines, not with a single latency chart.

### Should I always increase pool size when wait time appears?

No. First ask why holders keep connections so long. Slow queries, over-wide transactions, chatty multi-query handlers, and missing timeouts are common root causes. Increase size when hold time is already justified and dependency capacity can absorb more concurrent holders.

### Can I detect pool saturation with only black-box HTTP metrics?

You can suspect it when latency rises sharply beyond a concurrency or rate threshold and errors become timeouts. You cannot confirm it without some server-side signal of pool wait, active count, or traces that show borrow delays. Invest in instrumentation before running large test matrices.

### Why did doubling application instances not double capacity?

Each instance has a pool, so you may have increased aggregate client connections to a shared database or dependency that is now saturated. Re-run with dependency metrics visible. Capacity math must include the shared resource, not only the per-instance pool setting.
`,
};
