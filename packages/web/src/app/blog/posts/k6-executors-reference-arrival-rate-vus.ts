import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Executors Reference: Arrival-Rate vs VU Models and When Each Fits',
  description:
    'Compare k6 executors by open vs closed models. Pick arrival-rate or VU scheduling, size preAllocatedVUs, and catch dropped iterations before they hide latency.',
  date: '2026-08-28',
  category: 'Performance',
  content: `
# k6 Executors Reference: Arrival-Rate vs VU Models and When Each Fits

**k6 executors** are the scenario schedulers that decide *how* work starts: how many virtual users (VUs) exist, when each iteration begins, and whether that start depends on the previous iteration finishing. VU-based executors are a closed model: a fixed (or staged) pool of VUs loops as fast as the system allows, so throughput falls when latency rises. Arrival-rate executors are an open model: k6 tries to start iterations at a configured rate regardless of response time, spinning VUs up to \`maxVUs\` to keep pace. Pick the wrong model and you either understate saturation or silently drop work while charts still look calm.

Official catalog: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/

## What an Executor Actually Controls

An executor sits inside a named scenario. It does not define HTTP calls, assertions, or tags by itself. It only owns the schedule: concurrency shape, duration or stage timeline, and (for arrival-rate) the iteration start cadence. Everything else in \`options\` (thresholds, \`discardResponseBodies\`, tags, \`gracefulStop\`) applies around that schedule.

The seven built-in names are:

| Executor | Model | What you control | Typical use |
| --- | --- | --- | --- |
| \`shared-iterations\` | Closed | Total iterations shared across VUs | Smoke / fixed sample size |
| \`per-vu-iterations\` | Closed | Exact iterations per VU | Deterministic per-user work |
| \`constant-vus\` | Closed | Fixed VU count for a duration | Steady concurrent users |
| \`ramping-vus\` | Closed | VU stages over time | Soak / spike with user concurrency |
| \`constant-arrival-rate\` | Open | Iterations started per \`timeUnit\` | Steady RPS / ops targets |
| \`ramping-arrival-rate\` | Open | Staged iteration start rate | Traffic ramps independent of latency |
| \`externally-controlled\` | External | VU count via REST API / CLI scale | Live control in long runs |

Common scenario keys you will see beside the executor-specific ones: \`executor\`, \`startTime\`, \`gracefulStop\`, \`exec\` (function name), \`env\`, and \`tags\`. Arrival-rate executors add \`rate\` / \`startRate\`, \`timeUnit\`, \`duration\` or \`stages\`, \`preAllocatedVUs\`, and \`maxVUs\`.

Two scheduling facts matter more than most people expect:

1. **Closed model feedback.** If each iteration gets slower, VUs spend more time waiting, so completed iterations per second drop. The test “helps” the system by applying less load exactly when the system is struggling.
2. **Open model pressure.** Arrival-rate keeps trying to start work on schedule. If iterations take longer, k6 needs more concurrent VUs. When \`maxVUs\` is hit and the rate still cannot be met, iterations are dropped (incomplete arrival rate). That is a signal, not a footnote.

Iteration starts for constant arrival rate are **spaced fractionally**. A \`rate\` of \`10\` with \`timeUnit: '1s'\` means roughly one start every 100ms, not a burst of ten at the top of each second. That fractional spacing is closer to real traffic than a metronome burst, and it changes how you read short windows in the summary.

People often treat “VUs” and “RPS” as interchangeable knobs. They are not. VUs are concurrency. Arrival rate is start intensity. Throughput (completed iterations) is an outcome. Confusing those three is the root of most bad executor choices.

Think of the executor as the only component allowed to create time. Thresholds judge outcomes. Checks judge individual responses. Metrics record what happened. None of those decide *when the next iteration is allowed to begin*. If two engineers disagree about a failing soak, ask which executor ran before debating percentile charts. The schedule explains whether the system was protected by a closed feedback loop or pressed by an open arrival clock.

Scenario wrappers also control *which function* runs (\`exec\`), *when the scenario joins the timeline* (\`startTime\`), and *how long in-flight work may finish* (\`gracefulStop\`). Those knobs are easy to ignore when you copy a snippet, yet they decide whether a multi-scenario file is a careful composition or an accidental pile-up of init CPU, overlapping peaks, and truncated tails. Treat them as part of the executor story, not as optional decoration.

## Closed Model: VU Executors in Practice

Closed-model executors answer: “Given N concurrent users (or M total attempts), what does the system do?” They are the right tool when product language is concurrent sessions, active checkouts, or “run this job 500 times across 20 workers,” not “hold 250 HTTP starts per second no matter what.”

### constant-vus

Fixed VU count for a fixed duration. Each VU runs \`default\` (or \`exec\`) as many times as it can, usually with \`sleep\` modeling think time.

\`\`\`javascript
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  discardResponseBodies: true,
  scenarios: {
    steady_browsers: {
      executor: 'constant-vus',
      vus: 25,
      duration: '5m',
      gracefulStop: '30s',
      tags: { workload: 'closed_steady' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const res = http.get('https://test.k6.io/');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
\`\`\`

Throughput here is roughly \`vus / mean_iteration_time\`. If p95 latency doubles under contention, completed RPS halves even though \`vus\` never moved. That is correct closed-model behavior, and it is exactly why you should not use \`constant-vus\` to prove an SLA written as “250 RPS.”

When you do want a closed steady run, make think time explicit and stable. A \`sleep(1)\` after a single GET is easy to reason about. Random sleeps, optional branches, and multi-page journeys still work, but then publish the expected iteration-time band beside the VU count so readers can reverse the throughput math. Without that band, a chart of “25 VUs” is not comparable across releases because the client script may have grown heavier even if the server did not.

### ramping-vus

Same closed semantics with stages. Use it for soak shapes, weekend traffic curves expressed as concurrent users, or controlled spikes where the product risk is “too many sessions,” not “too many arrivals per second.”

\`\`\`javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  scenarios: {
    user_wave: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '10m', target: 50 },
        { duration: '1m', target: 120 },
        { duration: '3m', target: 120 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
};

export default function () {
  http.get('https://test.k6.io/contacts.php');
  sleep(0.5);
}
\`\`\`

### shared-iterations and per-vu-iterations

These fix *work count* rather than *time under load*. \`shared-iterations\` divides a total iteration budget across VUs (finish when the budget is spent). \`per-vu-iterations\` makes every VU run exactly \`iterations\` times (total work = \`vus * iterations\`).

\`\`\`javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    fixed_sample: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 200,
      maxDuration: '10m',
    },
    exact_per_user: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 20,
      startTime: '10s',
      maxDuration: '10m',
    },
  },
};

export default function () {
  const res = http.get('https://test.k6.io/');
  check(res, { ok: (r) => r.status === 200 });
}
\`\`\`

Use shared iterations for “hit this endpoint 1,000 times and stop.” Use per-VU iterations when each synthetic user must perform the same number of steps (for example, each VU creates exactly 20 orders). Do not use either as a substitute for a sustained RPS soak; duration becomes a side effect of latency.

**What people get wrong:** they convert a production chart of 200 RPS into \`vus: 200\` under \`constant-vus\`. That only matches if each iteration takes about one second with no overlap math. Real iteration time is request time plus think time plus client work. Closed configs that “look like prod RPS” on day one drift the moment latency changes, which is usually the moment you care about the test.

Closed models still shine in several concrete situations. Login and cart flows with multi-second think time map cleanly onto VUs that behave like people. Connection-pool and session-store limits are often concurrency problems first. Internal batch jobs that must process a fixed queue benefit from shared or per-VU iteration budgets more than from an artificial RPS target. When your risk register talks about “too many active checkouts,” write \`ramping-vus\` stages that mirror that language, then report achieved throughput as an observed side effect rather than as the control knob.

One more closed-model detail: \`maxDuration\` on iteration executors is a safety rope, not the primary stop condition. If latency explodes, shared iterations may crawl toward the budget and hit \`maxDuration\` before finishing. That is useful in CI (fail or stop instead of running forever), but it also means your “fixed sample” became a truncated sample. Capture iteration counts in the summary and decide whether a truncated sample is still valid evidence for the change under review.

## Open Model: Arrival-Rate Executors

Open-model executors answer: “Can the system absorb this *arrival* intensity?” Marketing pages, API gateways, and capacity plans usually speak this language. k6 implements it with \`constant-arrival-rate\` and \`ramping-arrival-rate\`.

Required mental model:

- You configure **starts**, not completions.
- k6 needs enough free VUs to run overlapping iterations when latency grows.
- \`preAllocatedVUs\` reserves VU instances before the scenario starts (faster scale-up, paid as memory/CPU on the runner).
- \`maxVUs\` caps how far k6 may grow. If the cap binds, the arrival rate is not fully achieved.

### constant-arrival-rate

\`\`\`javascript
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const checkoutFail = new Rate('checkout_fail');
const checkoutMs = new Trend('checkout_ms', true);

export const options = {
  discardResponseBodies: true,
  scenarios: {
    checkout_rps: {
      executor: 'constant-arrival-rate',
      rate: 40,
      timeUnit: '1s',
      duration: '8m',
      preAllocatedVUs: 40,
      maxVUs: 120,
      tags: { workload: 'open_checkout' },
    },
  },
  thresholds: {
    checkout_fail: ['rate<0.02'],
    checkout_ms: ['p(95)<900'],
    dropped_iterations: ['count==0'],
  },
};

export default function () {
  const started = Date.now();
  const res = http.post(
    'https://test.k6.io/',
    JSON.stringify({ item: 'sku-1' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  checkoutMs.add(Date.now() - started);
  checkoutFail.add(res.status !== 200);
}
\`\`\`

Notes that reviewers should enforce:

- Do **not** put trailing \`sleep()\` to “pace” arrival-rate iterations. The executor already paces starts via \`rate\` and \`timeUnit\`. Extra sleep inflates VU demand and fights the schedule.
- Size \`preAllocatedVUs\` from expected concurrency: roughly \`rate * mean_iteration_seconds\` (plus headroom). If mean latency is 300ms at 40 starts/s, expect ~12 concurrent iterations in the happy path, not 40. Headroom exists for spikes and GC.
- Treat \`dropped_iterations\` as a first-class threshold when the test claims a rate.

### ramping-arrival-rate

Same open semantics with stages on the *start rate*. \`startRate\` sets the initial rate; each stage \`target\` is iterations per \`timeUnit\`.

\`\`\`javascript
import http from 'k6/http';

export const options = {
  discardResponseBodies: true,
  scenarios: {
    api_ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { target: 10, duration: '1m' },
        { target: 50, duration: '3m' },
        { target: 50, duration: '5m' },
        { target: 100, duration: '2m' },
        { target: 20, duration: '2m' },
      ],
    },
  },
};

export default function () {
  http.get('https://test.k6.io/contacts.php');
}
\`\`\`

Fractional start spacing still applies at each instantaneous rate. During a ramp from 10/s to 50/s, k6 increases start intensity over the stage duration rather than jumping in one step.

Arrival-rate VU allocation is dynamic. k6 keeps a pool between \`preAllocatedVUs\` and \`maxVUs\` and assigns free VUs to newly started iterations. When iterations finish quickly, the same VU can serve many starts and the pool stays small. When iterations slow down, the pool grows. That growth is the open model doing its job: preserving start intensity while concurrency absorbs latency. Your job is to give the pool enough room, and to notice when the room runs out.

Choose \`timeUnit\` to match how humans state the target. \`rate: 30, timeUnit: '1s'\` and \`rate: 1800, timeUnit: '1m'\` describe the same average intensity, but stage targets and mental math stay clearer when the unit matches dashboards. Keep the unit constant for the whole scenario; ramping arrival rate does not let you change \`timeUnit\` per stage.

Open-model tests are also where custom metrics earn their keep. Built-in HTTP duration describes completed calls. A \`Rate\` for business failures and a \`Trend\` for end-to-end iteration time describe whether the *work you meant to start* stayed healthy. Named imports from \`k6/metrics\` keep those signals explicit in review:

\`import { Rate, Trend } from 'k6/metrics'\`

### Failure story: “latency looked fine, capacity looked fine”

**Symptom.** A team ran a “250 RPS” soak with \`constant-arrival-rate\`, \`rate: 250\`, \`timeUnit: '1s'\`, \`preAllocatedVUs: 50\`, \`maxVUs: 50\`. Grafana showed healthy p95 on completed requests. Leadership greenlit a launch.

**Wrong theory.** They blamed the edge cache and “lucky” synthetic URLs, then widened the URL set. Charts still looked fine. They assumed the SLA was met because http_req_duration percentiles were stable.

**Actual cause.** Iteration time under the broader URL set climbed past 200ms. Required concurrency exceeded 50 VUs. k6 hit \`maxVUs\` and **dropped iterations**. Completed-request latency stayed calm because the executor stopped starting the excess work. The rate was not held; the test quietly shed load.

**Fix.** Raised \`maxVUs\` with a realistic ceiling, set \`preAllocatedVUs\` nearer to expected concurrency, and added \`dropped_iterations: ['count==0']\` plus a rate check on a custom counter. They also paired pass/fail with [k6 threshold abort settings](/blog/k6-thresholds-abortonfail-delayaborteval-reference) so under-allocation fails the job instead of producing a pretty, incomplete soak.

## Mapping Goals to Executor Choice

Translate the question stakeholders ask into a model, then into an executor. If the sentence contains “concurrent users,” start closed. If it contains “requests per second,” “events per minute,” or “arrivals,” start open. If it contains “exactly N attempts,” start iteration executors.

| Goal phrasing | Prefer | Avoid as primary | Why |
| --- | --- | --- | --- |
| Hold 300 RPS for 15 minutes | \`constant-arrival-rate\` | \`constant-vus\` alone | Closed throughput drifts with latency |
| Weekend concurrent shoppers 80 -> 400 | \`ramping-vus\` | Arrival-rate without session model | Product risk is sessions, not pure starts |
| Spike to 2x arrivals in 2 minutes | \`ramping-arrival-rate\` | Huge \`shared-iterations\` burst | Need controlled open ramp |
| Regression sample of 5,000 calls | \`shared-iterations\` | Long open soak | Fixed sample, cheaper CI |
| Each VU completes 10 bookings | \`per-vu-iterations\` | Arrival-rate | Exact per-user work |
| Operator scales load live | \`externally-controlled\` | Blind ramping in prod-like labs | Human-in-the-loop |

Decision shortcuts that survive debate:

1. **SLA unit.** If the SLA is RPS/ops, use arrival-rate and assert drops. If the SLA is “N concurrent,” use VU executors and report achieved throughput as an observation.
2. **Think time.** Heavy think time belongs in closed models (or in arrival-rate only when the iteration is a full user journey and the *journey start rate* is the open signal). Mixing “RPS of page views” with multi-second sleeps inside arrival-rate iterations burns VUs for little signal.
3. **CI budget.** Prefer \`shared-iterations\` or short \`constant-vus\` for PR checks; reserve multi-stage arrival-rate for nightly or pre-release jobs.
4. **Saturation intent.** To find the breaking point of an API in arrival terms, ramp arrival rate and watch drops, failures, and latency together. To find session pool exhaustion, ramp VUs.

A compact chooser in prose: start from the metric you will defend in an incident review. Defend RPS -> open. Defend concurrent sessions -> closed. Defend “we executed the checklist N times” -> iteration executors.

Worked examples help when stakeholders mix vocabulary. “We need to prove the checkout API holds Black Friday traffic” is almost always an open-model claim: arrivals climb independently of how slow checkout becomes. “We need to prove the storefront stays usable with 5,000 people browsing” is a closed-model claim: people wait, click again, and concurrency is the product risk. “We need a cheap PR gate that exercises the payment path twenty times” is an iteration-budget claim. Writing those sentences into the PR description before choosing \`executor\` prevents the classic late rewrite from \`constant-vus\` to \`constant-arrival-rate\` the night before launch.

Also separate *generator limits* from *system limits*. If the load generator CPU saturates, both models lie, but they lie differently. Closed tests look like the system slowed down because VUs could not iterate. Open tests drop iterations or fail to reach rate while the system still had headroom. Pin runner sizing in the same doc as the executor choice so a failed rate is not misread as an application regression.

## Scenario Config Patterns That Survive Review

Reviewers should be able to read a scenario block and answer four questions without asking the author: which model, what intensity, what stop condition, what failure signal. Patterns that make that easy:

### Name scenarios after intent, not after the executor

\`checkout_open_40rps\` beats \`scenario1\`. Put model and intensity in the name so multi-scenario runs stay readable in the end-of-test summary.

### Always pair arrival-rate with allocation math written in a comment

\`\`\`javascript
export const options = {
  scenarios: {
    // mean iteration ~250ms at target -> ~25 concurrent; headroom x3 for spikes
    reads: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 40,
      maxVUs: 150,
    },
  },
};
\`\`\`

Comments that narrate “we use arrival rate because it is better” waste space. Comments that record the concurrency assumption save incidents.

### Separate smoke, load, and stress via scenarios or env switches

\`\`\`javascript
const profile = __ENV.PROFILE || 'smoke';

const profiles = {
  smoke: {
    executor: 'shared-iterations',
    vus: 2,
    iterations: 20,
    maxDuration: '2m',
  },
  load: {
    executor: 'constant-arrival-rate',
    rate: 30,
    timeUnit: '1s',
    duration: '10m',
    preAllocatedVUs: 30,
    maxVUs: 90,
  },
  stress: {
    executor: 'ramping-arrival-rate',
    startRate: 30,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 300,
    stages: [
      { target: 30, duration: '2m' },
      { target: 120, duration: '5m' },
      { target: 120, duration: '5m' },
      { target: 0, duration: '2m' },
    ],
  },
};

export const options = {
  scenarios: {
    main: profiles[profile],
  },
};
\`\`\`

Run with profile selection in CI:

\`\`\`bash
k6 run -e PROFILE=load script.js
\`\`\`

### Thresholds belong next to the claim

If the claim is open-model capacity, thresholds must include drops and the business failure rate, not only raw HTTP duration. Wire abort behavior intentionally; delayed evaluation can avoid failing on startup noise, while hard aborts stop burning cluster time when the rate is already dead. Details live in the thresholds reference linked above.

Threshold expressions should name the risk in reviewer language. \`http_req_duration\` alone rarely equals “checkout is safe.” Prefer a business \`Rate\` for payment failures, a tagged duration for the hotspot route, and \`dropped_iterations\` when the scenario promised a rate. If a threshold cannot be explained in one sentence tied to the executor’s claim, it is decoration.

### Keep gracefulStop honest

\`gracefulStop\` lets in-flight iterations finish after the scheduler stops starting new ones. For arrival-rate soaks, a too-short graceful stop truncates the slowest (often most interesting) iterations. A too-long one hides the fact that the scenario should have ended. Match it to p99 iteration time, not to a cargo-cult 30s.

For \`ramping-vus\`, also respect \`gracefulRampDown\`: VUs scheduled to stop get time to finish their current iteration. Cutting that too aggressively during a down stage creates artificial errors that look like server faults but are client aborts. Document both graceful windows next to stage tables so on-call engineers reading a failed nightly run know whether the tail was intentional.

Teams that want a packaged checklist for review comments sometimes install ready-made QA skills from qaskills.sh with the qaskills CLI, then adapt the executor review items to their service taxonomy. The useful part is the checklist discipline, not the tooling brand: every scenario should state model, intensity, allocation, and abort policy in one place.

## Diagnosing Dropped Iterations and Under-Allocation

Dropped iterations mean the open-model schedule wanted to start work and could not obtain a free VU before the slot passed. Under-allocation is the usual cause: \`maxVUs\` too low for latency at the target rate, or \`preAllocatedVUs\` so low that scale-up lag creates transient drops at the beginning of stages.

### Read the summary like an allocator

| Signal | Healthy open run | Under-allocated run |
| --- | --- | --- |
| \`dropped_iterations\` | 0 (or explained ramp edge) | Rising with latency |
| VU count vs \`maxVUs\` | Below cap with margin | Pegged at \`maxVUs\` |
| Achieved iteration rate | Matches \`rate\` / stage target | Below target while VUs maxed |
| http_req_duration | May rise, still completing | Looks “fine” because excess never started |
| Runner CPU / memory | Stable headroom | Thrash from VU churn if prealloc too low |

### Reproduce with a minimal script

When drops appear only in the big suite, bisect with a tiny arrival-rate script against the same path. Raise \`maxVUs\` once. If drops disappear and latency climbs, you were shedding load before. If drops remain, look for init errors, exhausted ports, or \`exec\` functions that never return.

A useful bisect order: (1) same URL with a one-line \`http.get\` default function, (2) restore auth/header setup only, (3) restore full journey steps without extra sleeps, (4) restore think time only if the scenario is intentionally modeling journeys at a journey-start rate. Most “mystery drops” die between steps 1 and 3 because hidden client work or accidental pacing inflated iteration duration past the allocation math.

### Estimate concurrency before the run

Rough planning formula:

\`needed_vus ≈ rate_per_second * mean_iteration_seconds * safety_factor\`

Example: 80 starts/s, 400ms mean iteration -> 32 concurrent. Safety factor 2 -> 3 => \`preAllocatedVUs: 50\`, \`maxVUs: 100\`. Revisit after the first run using observed iteration duration, not the guess.

During ramping arrival rate, size for the **peak stage**, not the average. A script that is fine at 20/s and collapses at 100/s usually had \`maxVUs\` tuned on an early stage. Put the peak math in the scenario comment so the next editor does not “optimize” allocation downward after looking only at the warm-up period.

### Watch for self-inflicted VU inflation

Large response bodies, heavy JS per iteration, and accidental \`sleep\` in arrival-rate code increase iteration time and therefore VU demand. \`discardResponseBodies: true\` when you do not assert on bodies is a free concurrency win.

Other common inflators: building huge JSON payloads on every iteration, parsing large SharedArray rows in the hot path instead of selecting by index, and synchronous bookkeeping that belongs in \`setup\`. Move one-time work out of the default function, then remeasure mean iteration time before you raise \`maxVUs\` again. Raising the cap without removing client waste just moves the bottleneck to the load generator.

### Distinguish drops from failures

HTTP failures and dropped iterations are different alarms. Failures mean the system answered poorly (or not at all) for work that started. Drops mean work never started on schedule. A run can show zero HTTP failures and thousands of drops; that is an incomplete test, not a passing API. Conversely, a run can meet the arrival rate and still fail thresholds on error rate. Healthy open-model evidence needs both: the rate was held, and the held rate was healthy.

### CI artifact habit

Upload the end-of-test summary JSON and any cloud links from GitHub Actions with \`actions/upload-artifact@v4\` (alongside \`actions/checkout@v4\` and \`actions/setup-node@v4\` if you wrap k6 in node tooling). Reviewers need the drop count next to the latency chart, not a green check alone.

## Combining Scenarios Without Contaminating Metrics

Multiple scenarios are how you mix models safely: one closed “browser-like” journey and one open API hammer in the same run, or a baseline plus a spike with \`startTime\` offsets. Contamination happens when tags, thresholds, and metric names blur which workload caused a signal.

### Isolate with scenario tags and custom metrics

\`\`\`javascript
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';
import { sleep } from 'k6';

const apiFail = new Rate('api_fail');
const apiMs = new Trend('api_ms', true);
const webFail = new Rate('web_fail');

export const options = {
  scenarios: {
    web_closed: {
      executor: 'constant-vus',
      vus: 15,
      duration: '12m',
      exec: 'webJourney',
      tags: { traffic: 'web' },
    },
    api_open: {
      executor: 'constant-arrival-rate',
      rate: 60,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 40,
      maxVUs: 120,
      startTime: '1m',
      exec: 'apiHit',
      tags: { traffic: 'api' },
    },
  },
  thresholds: {
    'http_req_duration{traffic:api}': ['p(95)<500'],
    'http_req_duration{traffic:web}': ['p(95)<1200'],
    api_fail: ['rate<0.01'],
    web_fail: ['rate<0.02'],
    dropped_iterations: ['count==0'],
  },
};

export function webJourney() {
  const res = http.get('https://test.k6.io/', { tags: { traffic: 'web' } });
  webFail.add(res.status !== 200);
  sleep(1);
}

export function apiHit() {
  const res = http.get('https://test.k6.io/contacts.php', {
    tags: { traffic: 'api' },
  });
  apiMs.add(res.timings.duration);
  apiFail.add(res.status !== 200);
}
\`\`\`

### Offset timelines on purpose

\`startTime\` prevents every scenario from contending for runner CPU during init. It also models “users already browsing when the API spike hits.” Document the offset in the scenario name or a one-line comment.

### Do not share mutable VU-local assumptions across exec functions

Each \`exec\` entry point should own its setup data path. Cross-scenario SharedArray reads are fine; cross-scenario hidden globals that count toward a single “total RPS” goal usually create false confidence.

### Distributed runs and segments

When one machine cannot generate the open-model rate, split work with execution segments rather than inventing a second incompatible executor story. Segment math and pitfall notes are covered in [k6 execution segments for distributed load](/blog/k6-execution-segments-distributed). Keep the executor choice identical across workers; change only the segment and load-generator capacity.

### Externally controlled as a third lane

\`externally-controlled\` is for labs where an operator (or automation) scales VUs through the k6 REST API during a long process. It is not a shortcut around arrival-rate math. If you need a fixed RPS, use arrival-rate. If you need a human on the bridge, use externally controlled with clear abort criteria.

In practice, teams use externally controlled during exploratory game days: start with a modest VU floor, watch live dashboards, then scale while a facilitator narrates hypotheses. Capture the scale timeline in notes so the resulting charts remain interpretable later. Without that timeline, an externally controlled run is hard to reproduce and easy to mythologize. Prefer scripted \`ramping-vus\` or \`ramping-arrival-rate\` once the interesting shape is known; reserve live control for discovery, not for the regression suite that gates releases.

### Metric hygiene checklist before merge

Before merging a multi-scenario file, walk this list: every scenario has intent-bearing tags; every threshold that claims a workload filters on those tags or uses a dedicated custom metric; \`dropped_iterations\` is asserted whenever any scenario uses arrival-rate; scenario \`startTime\` values are intentional and documented; \`exec\` names match exported functions; and the README or PR states which model each scenario represents. That ten-minute checklist prevents the most expensive class of performance false confidence: beautiful charts that answer a different question than the one leadership thinks you ran.

## Frequently Asked Questions

### When should I prefer arrival-rate over constant-vus for an API SLA?

Prefer arrival-rate when the SLA or capacity claim is expressed as starts or completions per time unit (RPS, ops/min). Constant-vus holds concurrency, so achieved RPS falls as latency rises and can understate risk. Use constant-vus when product language is concurrent sessions or when think-time journeys define the risk. If you still use VUs for an RPS conversation, publish the conversion assumptions and revalidate them every run, because they rot as soon as latency shifts.

### Why does k6 report dropped iterations when latency looks acceptable?

Dropped iterations mean the scheduler could not obtain a free VU in time to keep the configured start rate, usually because \`maxVUs\` is capping concurrency while iterations run longer than planned. Latency on *completed* requests can look fine because the excess work never started. Check VU pegging, raise allocation with a measured mean iteration time, remove accidental sleeps from arrival-rate code, and threshold \`dropped_iterations\` so incomplete rates cannot pass.

### How do I size preAllocatedVUs versus maxVUs without wasting runners?

Estimate concurrency as rate times mean iteration seconds, set \`preAllocatedVUs\` near that estimate so scale-up is not cold, and set \`maxVUs\` with headroom for latency inflation (often 2x to 3x). Too little preallocation causes early drops while VUs spin up; huge preallocation wastes RAM on the generator. After a pilot run, replace the estimate with observed iteration duration and keep \`maxVUs\` as a safety cap you expect not to touch in the happy path.

### Can I mix ramping-vus and constant-arrival-rate in one test run?

Yes. Use separate scenarios with distinct \`exec\` functions, tags, and thresholds, and offset \`startTime\` if you need a baseline before a spike. The closed scenario models concurrent users; the open scenario models API arrival pressure. Keep custom metrics per workload so a web journey’s slow pages do not dilute API p95. Assert \`dropped_iterations\` for the open scenario’s claim, and avoid global sleeps that couple the two schedules through runner CPU starvation.
`,
};
