import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Scenarios Ramping Arrival Rate: Shape Load Like Real Traffic',
  description: 'Configure k6 scenarios ramping arrival rate with stages, preAllocatedVUs, and thresholds so open-model load tracks real traffic without silent under-generation.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# k6 Scenarios Ramping Arrival Rate: Shape Load Like Real Traffic

k6 scenarios ramping arrival rate is the open-model executor that starts iterations at a changing rate over time, instead of pinning a fixed number of concurrent virtual users. You define stages with target arrival rates, give k6 a pool of pre-allocated VUs (and optional max VUs) to serve those starts, and measure whether the system keeps up as demand rises, holds, and falls. Use it when production pressure is best expressed as "N operations started per second," not "exactly M users always in flight."

That distinction is the whole point of open vs closed workload models. A closed model (constant or ramping VUs) only starts a new iteration when a VU finishes the previous one. If the system slows down, iteration starts slow down with it, which can hide the very saturation you meant to expose. An arrival-rate model keeps trying to start work on schedule. When the system cannot finish fast enough, you see queueing, VU exhaustion, dropped iteration starts, rising latency, and failed checks while the intended start rate remains the control signal.

This guide walks through scenario configuration, stage design, VU sizing, observability for under-generation, threshold strategy, and CI wiring. If you are still choosing tools, compare trade-offs in [k6 vs JMeter in 2026](/blog/k6-vs-jmeter-2026). If your functional suite needs parallel CI capacity while performance jobs run separately, see the [Playwright test sharding parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide).

## Answer the control question before writing stages

Before any executor syntax, decide what you are controlling.

| Control goal | Better executor family | Why |
|---|---|---|
| Hold exact concurrency | VU-based (constant-vus, ramping-vus) | Concurrency is the independent variable |
| Hold or shape start rate | Arrival-rate (constant-arrival-rate, ramping-arrival-rate) | Starts are the independent variable |
| Fixed total work shared by VUs | shared-iterations | Completeness of a batch matters more than rate |
| Each VU runs N times | per-vu-iterations | Even work per VU matters |

Choose ramping arrival rate when traffic has a known shape: morning ramp, flash sale spike, cool-down, multi-peak day. Choose constant arrival rate when you need a steady open-model soak. Choose ramping VUs when you are capacity-planning for concurrency limits (connection pools, worker threads) rather than offered load.

## Configure the ramping-arrival-rate executor correctly

In k6 scenarios, each scenario names an executor. For ramping arrival rate, the documented pattern uses:

- \`executor: 'ramping-arrival-rate'\`
- \`startRate\`: initial iteration start rate
- \`timeUnit\`: the period the rate applies to (for example, \`'1s'\`)
- \`preAllocatedVUs\`: VUs reserved up front to run iterations
- \`maxVUs\` (optional): upper bound k6 may allocate if more VUs are needed
- \`stages\`: list of \`{ target, duration }\` steps for the arrival rate over time
- \`exec\` (optional): function name when multiple scenario functions exist

Official docs: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/

\`\`\`js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    checkout_offers: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 10, duration: '1m' },
        { target: 50, duration: '3m' },
        { target: 100, duration: '2m' },
        { target: 100, duration: '5m' },
        { target: 20, duration: '2m' },
      ],
      tags: { surface: 'checkout' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get('https://test.k6.io');
  check(res, { 'status is 200': (r) => r.status === 200 });
  // Think time is still valid, but remember: arrival rate controls starts,
  // while sleep holds the VU and reduces free VUs for new starts.
  sleep(0.1);
}
\`\`\`

Read stages as "change the arrival-rate target over this duration," not "add this many VUs." The target is rate, not concurrency.

## Translate product traffic into stages without cargo-cult spikes

Bad stage charts look dramatic and measure little. Good stage charts encode a hypothesis.

### Inputs you need

- Peak successful operations per second from production metrics (not just requests at the edge if many are static assets)
- Peak-to-mean ratio for the scenario you care about
- Time to ramp in production (minutes vs seconds)
- Whether cool-down matters for resource release bugs
- Which endpoints belong in the same arrival process

### A practical stage recipe

1. **Smoke plateau**: low rate for one to two minutes to fail fast on auth or routing bugs
2. **Ramp**: linear or stepped climb to expected peak
3. **Peak hold**: enough duration for caches, GC, and pool behavior to show up
4. **Optional stress step**: above peak if the goal is breakpoint finding
5. **Cool-down**: reduce rate to catch failures that appear only while draining

\`\`\`js
export const options = {
  scenarios: {
    catalog_read_shape: {
      executor: 'ramping-arrival-rate',
      startTime: '0s',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: 120,
      stages: [
        { duration: '2m', target: 5 },   // smoke
        { duration: '5m', target: 40 },  // ramp to weekday peak
        { duration: '10m', target: 40 }, // hold
        { duration: '3m', target: 80 },  // stress step
        { duration: '5m', target: 80 },  // stress hold
        { duration: '3m', target: 10 },  // cool-down
      ],
    },
  },
};
\`\`\`

Document the production metric each target maps to. "100" with no unit story becomes folklore in three months.

## Size preAllocatedVUs and maxVUs so the rate is achievable

Arrival rate is a wish. VUs are the workers that fulfill starts. If each iteration lasts \`L\` seconds on average (including sleeps), roughly \`neededVUs ≈ arrivalRate * L\`. Under-provisioned VUs produce **dropped** or delayed iteration starts even when the system under test is fine. That is a load-generator bottleneck, not an application finding.

| Signal | Healthy open-model run | VU-starved run | Application saturation |
|---|---|---|---|
| Achieved start rate vs target | Tracks stages | Falls below target early | May track while latency explodes |
| VU utilization | Headroom at peak | Pegged near maxVUs | High but not necessarily maxed |
| p95 latency | Within budget or rises with load | Can look fine | Rises, often with errors |
| Failed requests | Low | Low | Climbing |
| Iteration duration | Stable or mild growth | Inflated by queueing in the generator | Inflated by server work |

### Sizing workflow

1. Measure mean iteration duration at low rate (smoke stage)
2. Compute \`preAllocatedVUs = ceil(peakRate * meanDuration * safetyFactor)\`
3. Start with safetyFactor between 1.2 and 2.0 depending on variance
4. Set \`maxVUs\` higher if duration may grow under load, but cap it to protect the executor host
5. Rehearse once and compare achieved rate charts to stage targets

\`\`\`js
// Example sizing notes (comments for humans, not executed math):
// peakRate = 100 iters/s
// meanDuration at smoke = 0.25 s
// baseline VUs = 100 * 0.25 = 25
// safetyFactor 2.0 => preAllocatedVUs 50, maxVUs 100
export const options = {
  scenarios: {
    api_writes: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { target: 10, duration: '1m' },
        { target: 100, duration: '4m' },
        { target: 100, duration: '8m' },
      ],
    },
  },
};
\`\`\`

If you routinely hit maxVUs during peaks, either shorten iterations (less sleep, less work per iteration), raise maxVUs on a larger generator, or lower the arrival target. Do not publish latency SLOs from a VU-starved run.

## Keep scenario functions short and intentional

Each started iteration should represent one meaningful unit of offered load: one browse, one search, one checkout attempt. Packing a five-minute user journey into a single iteration makes arrival rate hard to interpret because duration variance destroys VU math.

Prefer:

- Separate scenarios for read vs write paths with different rates
- Lightweight default function for the hot path
- Explicit tags per scenario or request for threshold filtering
- Shared setup for auth tokens via \`setup()\` when tokens are expensive

\`\`\`js
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'https://test.k6.io';

export function setup() {
  // Obtain a test token from a non-rate-limited harness endpoint when needed.
  return { token: __ENV.API_TOKEN || '' };
}

export const options = {
  scenarios: {
    reads: {
      executor: 'ramping-arrival-rate',
      exec: 'readPath',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 40,
      maxVUs: 80,
      stages: [
        { target: 20, duration: '1m' },
        { target: 60, duration: '5m' },
        { target: 60, duration: '5m' },
      ],
    },
    writes: {
      executor: 'ramping-arrival-rate',
      exec: 'writePath',
      startTime: '30s',
      startRate: 2,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 60,
      stages: [
        { target: 2, duration: '1m' },
        { target: 15, duration: '5m' },
        { target: 15, duration: '5m' },
      ],
    },
  },
};

export function readPath() {
  const res = http.get(\`\${BASE}/\`);
  check(res, { 'read 200': (r) => r.status === 200 });
}

export function writePath(data) {
  const res = http.post(\`\${BASE}/\`, null, {
    headers: data.token ? { Authorization: \`Bearer \${data.token}\` } : {},
    tags: { endpoint: 'write' },
  });
  check(res, { 'write not 5xx': (r) => r.status < 500 });
}
\`\`\`

Multiple scenarios can run concurrently. Stagger \`startTime\` when you need warm caches before writes begin.

## Observe under-generation as a first-class failure mode

The realistic failure mode for ramping arrival rate is **silent under-generation**: the summary still prints charts, latency looks great, and nobody notices the peak never reached 100 iters/s.

### How to diagnose

1. Compare k6's achieved iteration rate to the configured stage targets
2. Watch active VUs against \`preAllocatedVUs\` and \`maxVUs\`
3. Inspect iteration duration trend; growing duration consumes more VUs for the same rate
4. Check generator host CPU, network, and open files
5. Confirm you are not bottlenecked on a shared login endpoint inside every iteration
6. Verify thresholds did not abort the test mid-peak unless that was intended

What people get wrong: they raise arrival targets to "look more aggressive" without re-sizing VUs, then celebrate green latency. That report is a load-generator capacity test, not an application test.

Mitigations:

- Fail the run in analysis if achieved rate stays below a percentage of target for N seconds (custom metric or post-processing)
- Keep sleeps minimal in arrival-rate scenarios unless think time is part of the model and VU pool accounts for it
- Move one-time setup out of the default function
- Run generators close to the system under test to reduce artificial duration

\`\`\`js
import { Rate } from 'k6/metrics';
import http from 'k6/http';

// Conceptual custom signal: record whether a request completed quickly enough
// that the VU can return to the free pool. Pair with external rate verification.
const slowIterations = new Rate('slow_iterations');

export const options = {
  scenarios: {
    shaped: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 40,
      maxVUs: 100,
      stages: [
        { target: 5, duration: '30s' },
        { target: 50, duration: '3m' },
        { target: 50, duration: '3m' },
      ],
    },
  },
  thresholds: {
    slow_iterations: ['rate<0.2'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const start = Date.now();
  const res = http.get('https://test.k6.io');
  const elapsedMs = Date.now() - start;
  slowIterations.add(elapsedMs > 300);
  if (res.status !== 200) {
    // Keep iteration short on failure so VUs return quickly during incidents.
    return;
  }
}
\`\`\`

Also export results (\`k6 run --out json=...\` or your team's metrics backend) and chart offered vs achieved rate during result review.

## Set thresholds that match open-model goals

Thresholds should protect user outcomes at the rates you actually achieved.

| Goal | Useful threshold focus | Weak substitute |
|---|---|---|
| Correctness under load | \`http_req_failed\` and checks | Duration only |
| Latency SLO at peak | Duration percentiles on tagged peak scenario | Average duration |
| Generator health | Custom rate or post-run achieved-rate gate | Ignoring VU pegging |
| Endpoint budgets | Tagged \`http_req_duration{endpoint:...}\` | One global p95 only |

Abort behavior matters. Aborting on a tight threshold can prevent cool-down stages from running. Sometimes that is desired (fail fast in CI). Sometimes you want the full shape for diagnostics. Set abort rules intentionally per environment.

\`\`\`js
export const options = {
  scenarios: {
    peak_shape: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 80,
      stages: [
        { target: 30, duration: '2m' },
        { target: 30, duration: '5m' },
      ],
    },
  },
  thresholds: {
    'http_req_duration{scenario:peak_shape}': ['p(95)<400'],
    'http_req_failed{scenario:peak_shape}': ['rate<0.005'],
    checks: ['rate>0.99'],
  },
};
\`\`\`

Scenario tags are applied by k6 to metrics for that scenario, which helps when multiple scenarios run in one script.

## Model realistic mix without destroying interpretability

Traffic is rarely one endpoint. Options:

1. **Weighted work inside one iteration** using random selection (simple, but iteration duration variance rises)
2. **Multiple scenarios** with independent arrival curves (clearer, recommended for important paths)
3. **Separate scripts** for isolation (best for deep breakpoint tests)

\`\`\`js
import http from 'k6/http';

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-arrival-rate',
      exec: 'browse',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      maxVUs: 90,
      stages: [
        { target: 10, duration: '1m' },
        { target: 70, duration: '4m' },
        { target: 70, duration: '6m' },
      ],
    },
    search: {
      executor: 'ramping-arrival-rate',
      exec: 'search',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 60,
      stages: [
        { target: 5, duration: '1m' },
        { target: 25, duration: '4m' },
        { target: 25, duration: '6m' },
      ],
    },
  },
};

export function browse() {
  http.get('https://test.k6.io/', { tags: { endpoint: 'home' } });
}

export function search() {
  http.get('https://test.k6.io/?q=k6', { tags: { endpoint: 'search' } });
}
\`\`\`

When stakeholders ask for "production mix," bring rates per scenario, not a single magic VU count.

## CI design: keep shape tests informative and bounded

Full-day traffic shapes do not belong on every pull request. Split profiles:

| Profile | When | Stage philosophy | Fail criteria |
|---|---|---|---|
| PR smoke shape | Each PR | 1-3 minutes, low peak | Errors, obvious latency blowups |
| Nightly shape | Main branch nights | Production-like peak and hold | SLO thresholds |
| Breakpoint | Weekly or pre-release | Climb past peak until failure | Documented breakpoint report |
| Soak open-model | Scheduled | Long hold at constant or mild ramp | Memory/error growth |

\`\`\`bash
# PR-sized run with env-selected base URL
k6 run -e BASE_URL="\$STAGING_URL" ./load/checkout-shape.js

# Nightly with deeper stages (separate script or env flag)
k6 run -e PROFILE=nightly ./load/checkout-shape.js
\`\`\`

\`\`\`js
const profile = __ENV.PROFILE || 'pr';

const stagesByProfile = {
  pr: [
    { target: 5, duration: '30s' },
    { target: 20, duration: '1m' },
    { target: 20, duration: '1m' },
  ],
  nightly: [
    { target: 10, duration: '2m' },
    { target: 80, duration: '5m' },
    { target: 80, duration: '15m' },
    { target: 10, duration: '3m' },
  ],
};

export const options = {
  scenarios: {
    shaped: {
      executor: 'ramping-arrival-rate',
      startRate: stagesByProfile[profile][0].target,
      timeUnit: '1s',
      preAllocatedVUs: profile === 'nightly' ? 100 : 30,
      maxVUs: profile === 'nightly' ? 250 : 60,
      stages: stagesByProfile[profile],
    },
  },
};
\`\`\`

Store HTML or JSON summaries as CI artifacts. Require a human-readable note when peak achieved rate is below target.

## Coordinate with functional parallel CI without cross-talk

Performance jobs and sharded UI tests often share staging. Arrival-rate peaks can starve a Playwright shard of CPU or backend capacity and create false UI failures. Practical controls:

- Run heavy ramping arrival scenarios in an isolated environment
- Schedule them in a separate pipeline stage after functional tests
- Lower peaks when environments are shared
- Tag load-test traffic so it can be filtered from product analytics

Teams that already invest in sharding for UI speed should not casually co-schedule open-model peaks on the same deployment slot. Isolation is cheaper than flaky archaeology.

## Compare ramping arrival rate with nearby executors

| Executor | Independent variable | Best diagnostic question |
|---|---|---|
| ramping-arrival-rate | Changing start rate | Can we track a traffic shape? |
| constant-arrival-rate | Steady start rate | Can we hold rate R for duration T? |
| ramping-vus | Changing concurrency | What happens as concurrency climbs? |
| constant-vus | Steady concurrency | How does the system behave at C concurrent users? |

If product managers speak in concurrent shoppers, you may still implement tests in arrival rate if the business metric is checkouts started per minute. Translate carefully and show both achieved rate and observed concurrency in the report.

## Common script mistakes that corrupt results

1. **Huge think times** inside arrival-rate iterations without VU math updates
2. **Login per iteration** against a slow identity provider
3. **Unbounded dynamic tags** (user ids) destroying metric cardinality
4. **One scenario doing everything** so failures cannot be attributed
5. **No cool-down** when investigating connection drain bugs
6. **Copying VU ramp stages into arrival-rate targets** without unit conversion
7. **Thresholds on averages only**, missing tail latency at peak hold

\`\`\`js
// Avoid high-cardinality tags like per-user ids on every request.
// Prefer low-cardinality route templates.
http.get(\`\${BASE}/orders/123\`, {
  tags: { endpoint: 'orders-by-id' },
});
\`\`\`

## Reporting template that executives and engineers both accept

Structure the result write-up as:

1. Hypothesis (what shape models what event)
2. Configured stages table
3. Achieved vs target rate chart commentary
4. Latency and error charts at peak hold
5. VU utilization and any generator limits hit
6. Bottleneck evidence (app metrics, DB, pool waits)
7. Decision (pass, pass with risk, fail)
8. Follow-up experiments

Without achieved-rate commentary, open-model reports are incomplete.

## When not to use ramping arrival rate

- You only need a quick concurrency ladder for pool sizing (ramping VUs may be clearer)
- Iterations are extremely long multi-step journeys better modeled as VU scenarios with pacing
- The generator cannot provision enough VUs for the desired rate (fix the model or the infra first)
- You are debugging a single request bug (use functional tests)

Arrival-rate executors shine when offered load is the story. They are not a universal default for every performance script.

## Putting a first production-like script into practice

1. Pick one user-critical operation with a known production ops/sec metric
2. Write a one-request iteration with stable tags
3. Build smoke -> ramp -> hold -> cool-down stages at a fraction of production
4. Size VUs from measured duration
5. Run once, verify achieved rate
6. Add thresholds for errors and p95
7. Scale toward production peak in nightly profile
8. Split secondary operations into additional scenarios only after the first is trustworthy

If your team accelerates harness setup with skills from qaskills.sh via the qaskills CLI, still keep stage numbers and VU math owned by the performance engineer who watches production metrics. Skills scaffold; they do not know your Friday traffic.

## Frequently Asked Questions

### How is ramping arrival rate different from ramping VUs in k6?

Ramping VUs changes concurrent workers. Ramping arrival rate changes how many iterations k6 tries to start per time unit. Under slowdown, VU ramps reduce offered work automatically because workers stay busy longer, while arrival-rate scenarios keep trying to start work and will demand more VUs or show under-generation. Use arrival rate to model offered traffic shapes; use VU ramps to explore concurrency directly.

### Why did my test show great latency while product still melted in a sale?

Often the generator never reached the intended peak rate because VUs were exhausted, think time was too high, or a setup call serialized work. Validate achieved iteration rate against stage targets before trusting latency. Also confirm the script exercises the same bottleneck path as production traffic, not a cached static page.

### Should every CI pipeline run full ramping arrival-rate peaks?

No. Keep pull-request jobs short with low peaks that catch wiring and obvious regressions. Run production-like shapes on a schedule or pre-release pipeline with isolated environments and artifacted summaries. Full shapes are expensive and will be disabled if they block every merge without clear signal.

### What timeUnit should I pick for startRate and stages?

Pick a unit that matches how you discuss traffic, commonly per second. The rate and timeUnit work together: a startRate of 60 with timeUnit \`1m\` is one start per second on average, which is easy to misread. Prefer \`timeUnit: '1s'\` and rates in iterations per second unless your org standardizes on another unit and documents it everywhere.
`,
};
