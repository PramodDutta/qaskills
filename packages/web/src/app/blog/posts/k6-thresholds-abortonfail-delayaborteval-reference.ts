import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Thresholds abortOnFail and delayAbortEval: Fail-Fast Load Tests',
  description:
    'What abortOnFail and delayAbortEval do in k6 thresholds, the exact object syntax, why a test still exits 99 after aborting, and the warm-up delay that stops false aborts.',
  date: '2026-08-23',
  category: 'Performance',
  content: `
# k6 Thresholds abortOnFail and delayAbortEval: Fail-Fast Load Tests

\`abortOnFail: true\` tells k6 to stop the entire test run the moment a threshold is breached, instead of running to completion and reporting the failure at the end. \`delayAbortEval\` is the companion setting: a duration string such as \`'30s'\` that tells k6 to ignore threshold breaches until that much time has elapsed, so a cold cache or a slow ramp-up does not kill the run in the first few seconds.

Both live inside the **object form** of a threshold, not the string form. This is the part that trips people up:

\`\`\`js
export const options = {
  thresholds: {
    // String form: no abort behavior available.
    http_req_failed: ['rate<0.01'],

    // Object form: this is where abortOnFail and delayAbortEval live.
    http_req_duration: [
      { threshold: 'p(95)<500', abortOnFail: true, delayAbortEval: '30s' },
    ],
  },
};
\`\`\`

A run aborted this way still exits with code 99, the same code k6 uses for any threshold failure, so your CI step fails exactly as it would have without the abort. What you save is the remaining test duration and the load you would have kept pushing at an already-broken system.

## The two settings side by side

| Setting | Type | Default | What it does |
|---|---|---|---|
| \`threshold\` | string | required | The expression, for example \`p(95)<500\` |
| \`abortOnFail\` | boolean | \`false\` | Stop the whole run when this threshold is breached |
| \`delayAbortEval\` | duration string | none | Ignore breaches until this much time has passed |

\`delayAbortEval\` has no effect unless \`abortOnFail\` is also true. Setting it alone is a silent no-op, which is a common source of "my delay isn't working" confusion: the delay was working, but nothing was aborting in the first place.

## Why the delay exists

Threshold expressions are evaluated against metrics aggregated from the start of the run. Early in a test, that aggregate is dominated by whatever happened in the first few seconds, and the first few seconds are frequently unrepresentative:

- Connection pools are empty, so early requests pay full TLS handshake cost
- JIT-compiled or cold-started services are at their slowest
- Autoscalers have not reacted to the new load
- Caches are empty

A p95 threshold of 500ms can easily be breached at second three by a handful of 2000ms cold requests, even though the system settles to 200ms by second twenty. Without \`delayAbortEval\`, that run aborts immediately and reports a failure that says nothing about steady-state behavior.

\`\`\`js
export const options = {
  scenarios: {
    ramping: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: [
      // Ramp is 30s, so do not judge latency until the plateau begins.
      { threshold: 'p(95)<500', abortOnFail: true, delayAbortEval: '35s' },
    ],
  },
};
\`\`\`

The rule of thumb: set \`delayAbortEval\` to at least the length of your ramp-up stage, plus a few seconds. If your ramp is 30 seconds, evaluating at 35 seconds means the first judgment happens once every virtual user is actually running.

## What abort actually does to your data

An aborted run is a **partial** run, and that has consequences worth planning for.

| Aspect | Behavior on abort |
|---|---|
| Exit code | 99, same as a normal threshold failure |
| End-of-test summary | Still printed, covering the shortened window |
| \`handleSummary\` | Still invoked |
| Iterations in flight | Interrupted, not completed |
| Remaining stages | Skipped entirely |
| Reported duration | Shorter than the configured test duration |

Because the summary covers a shorter window, throughput numbers from an aborted run are not comparable to a completed run of the same scenario. If you store results in a dashboard, tag aborted runs and exclude them from trend lines. A run that aborted at second 40 of a three-minute test will show a request count roughly a quarter of normal, and if that lands in a trend chart it reads as a traffic collapse rather than what it was.

\`\`\`js
export function handleSummary(data) {
  // Aborted runs finish early, so record the real elapsed window
  // rather than the configured duration.
  const elapsedMs = data.state.testRunDurationMs;
  return {
    'summary.json': JSON.stringify(
      { elapsedMs, metrics: data.metrics },
      null,
      2,
    ),
  };
}
\`\`\`

## Choosing which thresholds get abortOnFail

Not every threshold deserves to stop a run. The distinction that works in practice is between **fatal** and **informational** thresholds.

| Threshold | Abort? | Reasoning |
|---|---|---|
| \`http_req_failed: rate<0.05\` | Yes | High error rate means the rest of the run measures nothing useful |
| \`http_req_duration: p(95)<500\` | Sometimes | Abort only if you are protecting a shared environment |
| \`checks: rate>0.99\` | Yes | Failing checks mean the scenario is not exercising the flow |
| \`iteration_duration: p(95)<3000\` | No | Slow iterations are a finding, not a reason to stop |
| Custom business metric | Usually no | You want the full distribution |

A practical setup uses one aborting threshold on correctness and leaves the latency thresholds non-aborting:

\`\`\`js
export const options = {
  thresholds: {
    // Fatal: if one request in twenty is failing, stop and investigate.
    http_req_failed: [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '20s' },
    ],
    // Fatal: the scenario itself is broken.
    checks: [
      { threshold: 'rate>0.99', abortOnFail: true, delayAbortEval: '20s' },
    ],
    // Informational: report, but let the run finish so we see the shape.
    http_req_duration: ['p(95)<500', 'p(99)<1200'],
  },
};
\`\`\`

This pairs well with per-endpoint limits, which are covered in the [k6 thresholds per endpoint guide](/blog/k6-thresholds-per-endpoint-guide); the same object form applies to tagged sub-metrics.

## Aborting on tagged sub-metrics

Threshold keys can target a tag, and abort works there too. The syntax uses curly braces around the tag selector:

\`\`\`js
import http from 'k6/http';

export const options = {
  thresholds: {
    // Only the checkout endpoint aborts the run; other endpoints are advisory.
    'http_req_duration{name:checkout}': [
      { threshold: 'p(95)<800', abortOnFail: true, delayAbortEval: '30s' },
    ],
    'http_req_duration{name:search}': ['p(95)<400'],
  },
};

export default function () {
  http.get('https://example.com/checkout', { tags: { name: 'checkout' } });
  http.get('https://example.com/search', { tags: { name: 'search' } });
}
\`\`\`

Note the explicit \`name\` tag on each request. Without it, k6 tags by URL, and any URL containing an identifier produces a separate sub-metric, so your threshold key never matches anything. A threshold that matches no samples does not fail; it is simply never evaluated, which means a typo in a tag selector produces a permanently green threshold. That is the quietest failure mode in this whole feature.

## A realistic failure: the abort that never fires

Symptom: a team sets \`abortOnFail: true\` on a p95 threshold, deliberately breaks the service, and watches the test run to completion anyway.

Diagnosis path:

1. Check the end-of-test summary. The threshold shows as failed, so the expression is correct and the exit code is 99.
2. Check whether \`delayAbortEval\` is longer than the test. A two-minute test with \`delayAbortEval: '5m'\` can never abort, because evaluation never begins.
3. Check whether the breach happened after the last evaluation.

In this case it was the second: a copy-pasted \`delayAbortEval: '5m'\` from a soak-test config, applied to a two-minute smoke test. The threshold failed at the end as normal, so nothing looked broken, but the fail-fast behavior was dead.

The guard is a sanity check in the script itself:

\`\`\`js
const TEST_DURATION_S = 120;
const ABORT_DELAY_S = 30;

if (ABORT_DELAY_S >= TEST_DURATION_S) {
  throw new Error(
    'delayAbortEval is longer than the test duration, so abortOnFail can never trigger',
  );
}

export const options = {
  duration: TEST_DURATION_S + 's',
  thresholds: {
    http_req_failed: [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: ABORT_DELAY_S + 's' },
    ],
  },
};
\`\`\`

Throwing at module scope fails the run immediately with a clear message, which is far better than a silently disabled safety feature.

## Abort behavior in CI

Because the exit code is unchanged, no CI configuration is needed to make aborts fail a build. What does change is timing, and that is worth exploiting.

\`\`\`yaml
name: Load test
on: [workflow_dispatch]

jobs:
  k6:
    runs-on: ubuntu-latest
    # Generous ceiling: a healthy run finishes well inside this, and an
    # unhealthy one aborts early rather than consuming the whole budget.
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - name: Run k6
        run: k6 run --summary-export=summary.json load/checkout.js
      - name: Upload summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-summary
          path: summary.json
\`\`\`

\`if: always()\` on the upload step matters here: without it, an aborted run fails the previous step and you lose the summary that explains why. That is the artifact you actually want when the run stopped after 40 seconds.

## Interaction with scenarios and executors

With multiple scenarios in one script, an abort stops **all** of them, not just the scenario whose threshold breached. Thresholds are global to the run, so a breach in a background scenario terminates your primary load profile too.

\`\`\`js
export const options = {
  scenarios: {
    browse: {
      executor: 'constant-vus',
      vus: 40,
      duration: '5m',
      exec: 'browse',
    },
    checkout: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      exec: 'checkout',
    },
  },
  thresholds: {
    // Scope the abort to checkout so a slow browse path does not kill the run.
    'http_req_failed{scenario:checkout}': [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' },
    ],
  },
};
\`\`\`

k6 tags every sample with the scenario name automatically, so \`{scenario:checkout}\` works without adding tags to individual requests. That makes scenario scoping the cheapest way to keep an abort narrow.

There is one executor interaction worth knowing. With \`constant-arrival-rate\` and \`ramping-arrival-rate\`, k6 tries to hold a request rate regardless of how slow responses get, allocating more VUs from the pre-allocated pool as latency rises. A degrading service therefore produces a rising VU count, and if the pool runs out you get dropped iterations rather than slow ones. Pair an aborting error-rate threshold with these executors: without it, a badly degraded run spends its remaining minutes reporting dropped iterations instead of the latency story you wanted.

## Verifying the abort actually works

Do not wait for a real incident to discover the abort is misconfigured. Prove it in a throwaway run with a threshold that cannot pass.

\`\`\`js
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  duration: '2m',
  vus: 5,
  thresholds: {
    // Deliberately impossible: this must abort within a few seconds of the delay.
    http_req_duration: [
      { threshold: 'p(95)<1', abortOnFail: true, delayAbortEval: '10s' },
    ],
  },
};

export default function () {
  http.get('https://test.k6.io');
  sleep(1);
}
\`\`\`

Run it and check two things: the wall-clock duration is roughly 10 to 15 seconds rather than 2 minutes, and the exit code is 99. If it runs the full two minutes, your abort is not wired up, and you have learned that in a controlled test rather than during a real regression.

\`\`\`bash
k6 run abort-probe.js; echo "exit=$?"
\`\`\`

Keep this probe in the repository next to the real scripts. It takes fifteen seconds to run and it is the only way to be sure a safety feature is live.

## Thresholds, checks, and where abort fits

It helps to be precise about the three mechanisms, because they are easy to conflate:

| Mechanism | Scope | Fails the build? | Can stop the run? |
|---|---|---|---|
| \`check()\` | Per iteration | No, on its own | No |
| Threshold on \`checks\` | Whole run | Yes, exit 99 | Yes, with \`abortOnFail\` |
| Threshold on a metric | Whole run | Yes, exit 99 | Yes, with \`abortOnFail\` |

A bare \`check()\` never fails anything. It records a pass or fail into the \`checks\` metric and the iteration continues. Turning check failures into a build failure requires a threshold on the \`checks\` metric, and turning that into an early stop requires \`abortOnFail\` on that threshold. Each layer is opt-in, which is why a script can be full of checks and still report success. The full relationship between the two is covered in the [k6 thresholds and checks guide](/blog/k6-thresholds-checks-complete-guide).

\`\`\`js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  thresholds: {
    // Without this, the check below can fail every time and the run still passes.
    checks: [{ threshold: 'rate>0.99', abortOnFail: true, delayAbortEval: '20s' }],
  },
};

export default function () {
  const res = http.get('https://example.com/api/orders');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
  });
}
\`\`\`

## What people get wrong

The most common mistake is reaching for \`abortOnFail\` as a general-purpose strictness setting. It is not about strictness; it is about **whether continuing the test is useful**. A run that breaches a latency threshold is still producing valuable data about how latency degrades under sustained load. A run where 40 percent of requests are returning 502 is producing nothing except load against a broken service. The first should finish, the second should abort.

The second mistake is setting \`delayAbortEval\` to a round number without reference to the ramp. Thirty seconds is a common default, but if your ramp-up stage is two minutes, the threshold is being judged at second 30 against a system running at a quarter of target load. Match the delay to the scenario, not to habit.

For teams standardizing this across many scripts, ready-made QA skills install from qaskills.sh with the qaskills CLI, including performance skills that scaffold threshold blocks with the abort settings already wired to the ramp profile.

## Aborting on a custom metric

Business-level signals often make better abort triggers than transport-level ones, because they express what the test is really protecting.

\`\`\`js
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const orderFailures = new Rate('order_failures');
const orderLatency = new Trend('order_latency', true);

export const options = {
  thresholds: {
    // A custom Rate reads exactly like a built-in one in a threshold.
    order_failures: [
      { threshold: 'rate<0.02', abortOnFail: true, delayAbortEval: '45s' },
    ],
    order_latency: ['p(95)<900'],
  },
};

export default function () {
  const res = http.post(
    'https://example.com/api/orders',
    JSON.stringify({ sku: 'ABC-1', qty: 1 }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  // An HTTP 200 carrying an application-level error is still a failed order.
  let ok = res.status === 201;
  if (ok) {
    try {
      ok = JSON.parse(res.body).status === 'confirmed';
    } catch {
      ok = false;
    }
  }
  orderFailures.add(!ok);
  orderLatency.add(res.timings.duration);
}
\`\`\`

Note the named imports from \`k6/metrics\`. \`Rate\` and \`Trend\` are named exports; a default import throws at module load, and it is a mistake that looks harmless in review.

The reason this beats an \`http_req_failed\` threshold is that many broken systems keep returning 200. An order endpoint that responds quickly with \`{"status":"rejected"}\` for every request looks perfectly healthy at the transport layer, and only a custom metric notices.

## Operational guidance

A few practices that hold up across teams running this in anger:

1. **Put the abort on the narrowest scope that captures the failure.** Scenario-scoped or endpoint-scoped beats global, because a global abort makes every unrelated regression look like a checkout outage.
2. **Log the reason.** k6 prints which threshold aborted the run, but CI logs get truncated. Emit the threshold name and observed value from \`handleSummary\` into an artifact so the reason survives.
3. **Never abort on the first run of a new script.** You do not yet know the baseline, and an abort will hide the very distribution you are trying to measure. Add the abort once you have two or three clean runs to set the limit from.
4. **Re-check the delay whenever the ramp changes.** A stage edit that stretches the ramp from 30 seconds to two minutes silently turns a well-tuned 35-second delay into an evaluator that judges a quarter-loaded system.
5. **Treat aborted runs as a separate class in reporting.** They are shorter, so their throughput and count metrics are not comparable to completed runs.

| Situation | Recommended setting |
|---|---|
| Smoke test in CI on every PR | \`abortOnFail\` on error rate, delay 10s to 20s |
| Nightly load test, dedicated environment | Abort on error rate only, latency advisory |
| Soak test over several hours | Abort on error rate, delay several minutes |
| First run of a brand new script | No aborts at all |
| Test against a shared staging environment | Abort aggressively on both error rate and latency |

## Frequently Asked Questions

### Does abortOnFail change the exit code?

No. An aborted run exits with code 99, the same code k6 returns for any threshold failure at the end of a normal run. Your CI step fails identically either way, which is deliberate: the abort is an optimization on time and load, not a different category of result. If you need to distinguish an aborted run from a completed failure in reporting, compare the actual run duration against the configured duration in \`handleSummary\`, or tag the run at ingestion time. Do not try to infer it from the exit code.

### Can I use delayAbortEval without abortOnFail?

You can set it, but it does nothing. \`delayAbortEval\` only gates the abort evaluation, so with \`abortOnFail\` absent or false there is no abort to delay and the setting is inert. This is worth knowing because it fails silently rather than raising a configuration error. If you expected a delay to change behavior and it did not, check that \`abortOnFail: true\` is present in the same object, and that you are using the object form of the threshold rather than the plain string form.

### Why did my tagged threshold never abort?

Almost always because the tag selector matches no samples. A threshold key like \`http_req_duration{name:checkout}\` requires requests actually tagged with \`name: 'checkout'\`. If the requests are untagged, k6 falls back to tagging by URL, the sub-metric your key names is never populated, and a threshold with no data is never evaluated and never fails. Add explicit \`tags\` to the request options, then confirm the sub-metric appears in the end-of-test summary before trusting the threshold.

### Should every load test use abortOnFail?

No. Use it on correctness signals such as error rate and check rate, where continuing the run measures nothing useful, and on any test pointed at a shared or production-adjacent environment where sustained load against a failing service causes real harm. Leave it off for latency thresholds in dedicated performance environments, because the degradation curve after the breach is usually the most informative part of the run. A reasonable default is one aborting threshold on \`http_req_failed\` and everything else advisory.
`,
};
