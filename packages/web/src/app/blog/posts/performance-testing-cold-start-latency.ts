import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Performance Testing Cold Start Latency Without Polluting the Result',
  description: 'Learn performance testing cold start latency with controlled state, separate distributions, trace evidence, and repeatable serverless and container workflows.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# Performance Testing Cold Start Latency Without Polluting the Result

Performance testing cold start latency requires intentionally creating an inactive or newly provisioned execution state, sending a precisely timed first request, and proving from platform or application evidence that the request actually caused initialization. Record cold samples separately from warm samples. If both populations are pooled into one percentile, the test hides how often cold starts occur and how costly each one is.

The repeatable method is an experiment loop: establish the cold-state definition, reset or wait for that state, verify there is no accidental warm-up traffic, send one measured request, correlate it with logs or traces, capture initialization and end-to-end timings, then repeat enough independent trials to describe a distribution. This applies to serverless functions, scale-to-zero containers, newly started pods, just-in-time runtimes, fresh connection pools, and even first-use browser paths, although the reset mechanism differs.

Cold latency is not a single universal metric. A client observes DNS, connection, TLS, routing, queueing, initialization, dependency setup, and application work. The platform may separately expose initialization duration. Both are useful, but they answer different questions. This article gives QA and test-automation engineers a workflow that keeps those layers visible and makes AI-generated test code reviewable.

## Define Exactly What “Cold” Means for This System

Begin with a state transition, not a duration threshold. “Anything slower than one second is cold” is circular reasoning: slow warm requests will be mislabeled, and fast cold requests will disappear. Instead, identify observable evidence that a new execution environment, process, container, worker, or code path initialized.

| Cold-start scope | State before request | Evidence of initialization | Common contaminant |
|---|---|---|---|
| Serverless execution environment | No reusable warm environment handles request | Platform initialization field, new environment identifier, init log | Health check or retry warms it first |
| Scale-to-zero service | Zero ready application instances | Scaling event, new instance or pod identity | Monitoring probe triggers scale-up |
| Newly started container | Process has not served application traffic | Start timestamp plus first request trace | Readiness probe runs expensive code |
| Fresh runtime path | Process exists, code path has not been compiled or loaded | Runtime or application instrumentation | Earlier setup calls the same library |
| New dependency pool | No established database or upstream connections | Connection creation span or pool metric | Background initialization opens connections |
| First browser navigation | Empty browser profile and caches | Browser trace and network events | Shared profile, service worker, DNS cache |

A cold-state definition should include boundaries. For example: “A request is cold when it is the first customer request handled by a newly created application instance after the platform reported zero ready instances. The client timing begins before DNS resolution and ends after the full response body.” Another test may intentionally exclude DNS by reusing the hostname resolution. Neither is universally correct, but the report must say which one it measured.

Also define what remains warm. The database may retain pages in cache even when the function is new. A content-delivery cache may serve the response without invoking the origin. A truly end-to-end cold experiment could reset every dependency, but that often creates an artificial disaster-recovery test. Control only the layers relevant to the hypothesis.

## Split the Latency Budget Into Observable Segments

End-to-end time can be decomposed conceptually:

\`\`\`text
client elapsed
  = name resolution
  + connection and TLS establishment
  + gateway or queue delay
  + execution environment initialization
  + dependency initialization
  + application processing
  + response transfer
\`\`\`

These phases can overlap or be reported differently by platforms, so do not force them to sum exactly unless the instrumentation guarantees that relationship. Use distributed tracing to identify server spans and client tooling to measure network phases. Treat platform initialization metrics as platform-specific evidence rather than assuming every runtime exposes the same fields.

| Metric | Observation point | What it answers | What it cannot prove alone |
|---|---|---|---|
| Client end-to-end elapsed | Test runner | What the caller experienced | Which server phase was cold |
| Time to first byte | Client | Delay before response begins | Full body completion |
| Platform init duration | Hosting platform | Time attributed to environment initialization | DNS, network, or downstream latency |
| Application handler duration | Application trace | Time inside business code | Pre-handler platform work |
| Dependency connection span | Application trace | Cost of opening a remote connection | Total cold penalty |
| New instance identifier | Logs or resource metadata | Whether execution moved to a fresh instance | Exact cause of slow latency |

Choose a trace correlation key that the test sends and the service records. It should uniquely identify the trial without containing secrets. If the platform replaces or strips headers, return a safe request ID in the response or correlate by a narrow time window plus instance identity.

## Design One Trial as a Controlled State Machine

A reliable cold trial has explicit states: preparing, confirmed cold, request sent, evidence captured, cleanup, and ready for the next repetition. Do not bury reset commands inside a high-throughput load script. Infrastructure state changes are slower, privileged, and more failure-prone than HTTP requests.

\`\`\`text
PREPARE -> CONFIRM_COLD -> SEND_ONE -> COLLECT -> CLASSIFY -> RESET
                |                         |
                +---- timeout/fail -------+
\`\`\`

The orchestration layer should refuse to send the measured request if cold state cannot be confirmed. Otherwise it records a warm request with a “cold” label and poisons the distribution.

A shell-level probe can capture client timing with curl while keeping the measured request visible:

\`\`\`bash
trial_id="cold-20260807-017"
curl --silent --show-error --output response.json \\
  --header "x-test-trial: \${trial_id}" \\
  --write-out "status=%{http_code} connect=%{time_connect} starttransfer=%{time_starttransfer} total=%{time_total}\\n" \\
  "https://perf.example.net/api/recommendations"
\`\`\`

In the published Markdown, the command has normal shell syntax.

The response must be validated. A fast 503 from a gateway is not an excellent cold start. Check status, a small stable body assertion, and the correlation identifier. Store the raw timing line with trial metadata instead of copying only the total into a spreadsheet.

## Prevent Observers From Warming the Target

Monitoring can change the system it observes. Uptime probes, readiness checks, synthetic tests, preview bots, API documentation consoles, security scanners, and developer traffic may activate an idle service before the measured request.

Inventory every source that can reach the target route. During a controlled window, route unrelated traffic elsewhere or use an isolated deployment. If readiness checks are necessary for platform operation, distinguish whether they initialize the same expensive code path. A TCP readiness check and an HTTP application check can have different warming effects.

| Warm-up contaminant | How it appears | Control strategy | Evidence after trial |
|---|---|---|---|
| Health probe | Periodic request before trial | Isolated route or documented probe behavior | Access log shows probe timeline |
| CI smoke suite | Cluster of requests after deploy | Separate environment or coordinated schedule | Pipeline and request IDs |
| Automatic client retry | Second request succeeds quickly | Disable retry in measurement client | Exactly one origin request per trial |
| Redirect | First endpoint warms second endpoint | Measure final route and inspect hops | Client trace includes redirect chain |
| CDN cache | Very fast response, origin untouched | Bypass only if origin cold start is scope | Cache status and origin trace |
| Metrics scraper | Application endpoint invoked on scrape | Expose lightweight metrics separately | No business-handler spans from scrape |

What people get wrong is assuming inactivity guarantees cold state after an undocumented number of minutes. Platforms can change retention and allocation behavior, background traffic can intervene, and multiple warm instances can exist. Use positive evidence of new initialization where possible. If only probabilistic idle waiting is available, report that limitation and classify samples from logs afterward.

## Keep Cold and Warm Samples in Separate Distributions

Suppose 2 percent of requests are cold at 1,800 ms and 98 percent are warm at 120 ms. A broad p95 can still look warm. Conversely, a test that forces every request cold greatly overstates normal aggregate latency. Report conditional distributions and occurrence probability separately.

| Statistic | Required population | Interpretation |
|---|---|---|
| Cold p50, p90, p95 | Confirmed cold trials only | Severity and variability when initialization occurs |
| Warm p50, p95, p99 | Confirmed warm requests only | Steady execution behavior |
| Cold-start occurrence rate | Representative natural traffic | Frequency callers encounter initialization |
| Blended user latency | Representative mixture | Overall experience for a defined traffic pattern |
| Initialization contribution | Correlated platform and client data | Portion plausibly attributed to startup |

Do not calculate a p99 from a handful of cold trials and present it as stable. Tail percentile precision requires enough independent observations. Cold experiments can be expensive and slow because each sample needs a reset, so publish sample counts and confidence intervals or uncertainty alongside percentiles. Median, range, and individual points may be more honest during early investigation.

A simple SQL analysis can classify already-correlated observations without mixing them:

\`\`\`sql
SELECT
  cold_confirmed,
  COUNT(*) AS samples,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY total_ms) AS p50_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY total_ms) AS p95_ms
FROM cold_start_trials
WHERE response_ok = TRUE
GROUP BY cold_confirmed;
\`\`\`

The percentile function shown is supported by PostgreSQL. If another database is used, choose its documented equivalent. Preserve failed responses in a separate analysis rather than deleting them from the trial record.

## Build a Trial Manifest That Explains Every Sample

Cold-start variance depends on artifact size, runtime, memory or CPU allocation, region, architecture, dependency state, network path, and platform placement. Capture enough context to compare like with like.

\`\`\`yaml
experiment_id: recommendations-cold-20260807-a
deployment_revision: 8d19b6f
region: test-region-a
client_location: load-zone-a
request_route: /api/recommendations
cold_definition: first customer request on a new instance
reset_strategy: isolated deployment returned to zero ready instances
trials_planned: 40
warm_controls_per_trial: 3
retry_policy: disabled
response_body_validation: schema-and-item-count
\`\`\`

Record the actual instance identity, request ID, timestamps, response status, client phases, trace ID, platform initialization evidence, handler duration, and classification for every trial. A free-text notes field is useful, but it should not replace structured values.

Store measurement code and manifest with the application revision or performance repository. If configuration changes between trials, start a new experiment identifier rather than merging results.

## Use Warm Controls to Detect Environment Drift

After each confirmed cold request, send a small number of warm control requests to the same route if the platform’s routing allows meaningful reuse. The controls answer whether the environment or dependency was generally slow during that trial.

A Node.js harness can issue one request at a time and validate status. Infrastructure reset remains outside this script:

\`\`\`js
const target = process.env.TARGET_URL;
const trial = process.env.TRIAL_ID;

if (!target || !trial) {
  throw new Error("TARGET_URL and TRIAL_ID are required");
}

const started = performance.now();
const response = await fetch(target, {
  headers: { "x-test-trial": trial },
});
const body = await response.text();
const elapsedMs = performance.now() - started;

if (!response.ok || body.length === 0) {
  throw new Error(\`Unexpected response: \${response.status}\`);
}

console.log(JSON.stringify({ trial, elapsedMs, status: response.status }));
\`\`\`

Use a runtime with a documented global \`fetch\` implementation or an approved HTTP library in the actual repository.

If both cold and immediate warm controls are slow, investigate dependency or environment drift. If only the first request is slow and initialization evidence is present, the cold path is implicated. If the first is fast but the second is slow, routing may have sent requests to different instances, or background work may continue after response.

Do not assume affinity. Record instance identity for every control. In a multi-instance service, subsequent requests may land elsewhere and themselves be cold.

## Measure Cold Start Under Concurrency as a Separate Experiment

One-request trials measure isolated cold latency. A burst into zero capacity asks a different question: how the platform scales, queues, and initializes multiple execution environments under concurrent arrivals. Both matter, but mixing them obscures the mechanism.

A k6 script can create a small, explicit burst using virtual users and one iteration each:

\`\`\`js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    cold_burst: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 1,
      maxDuration: '2m',
    },
  },
};

export default function () {
  const response = http.get(__ENV.TARGET_URL, {
    headers: { 'x-test-kind': 'cold-burst' },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
\`\`\`

This creates concurrent virtual-user iterations, but it does not prove all requests caused separate cold starts. The platform may multiplex them onto fewer new instances, queue them behind one initializer, or route them to residual capacity. Classify each response from traces and instance IDs.

For a burst experiment, report at least: requests arriving before any instance was ready, number of new instances, requests handled per instance, queue or gateway delay, initialization durations, error and retry counts, time until desired capacity, and recovery behavior.

## Compare Deployment, Idle, and Scale-Out Cold Paths

“Cold start” can occur through several paths with different caches and control-plane work. Test them separately.

| Trigger path | Starting condition | Question | Typical confounder |
|---|---|---|---|
| First request after deployment | New artifact or configuration | Release-time first-user impact | Deployment health checks pre-initialize code |
| First request after idle | Existing revision, no warm capacity | Inactivity penalty | Residual instance survives |
| Scale-out under load | Some instances warm, more are created | Tail impact during growth | Requests mix across warm and cold instances |
| Process restart | Host or container remains, process restarts | Runtime and application init cost | Filesystem and image caches stay warm |
| New node placement | New compute host pulls and starts artifact | Full provisioning path | Image already cached on some nodes |

Deployment tests catch artifact loading and one-time migrations that idle tests may not. Idle tests represent low-traffic services. Scale-out tests capture real peak behavior because users may hit a mixture of environments. Presenting a single number across these paths is misleading.

Tag each path in the manifest and dashboards. When an optimization improves idle reuse but slows artifact loading, the separate experiments reveal the tradeoff.

## Diagnose the “Random” Two-Second Tail

Consider an API whose p99 sometimes jumps to two seconds after deployment. Engineers assume cold starts, but no request-level classification exists. A forced-cold experiment shows 700 ms initialization, while the unexplained requests spend 1.6 seconds waiting for a database connection.

The diagnosis sequence should be evidence driven:

1. Correlate each slow client sample with a server trace.
2. Identify instance ID and whether an initialization event preceded the handler.
3. Compare platform initialization, handler spans, connection creation, and gateway delay.
4. Check whether retries produced multiple origin requests for one client action.
5. Compare warm controls from the same time window.
6. Reproduce confirmed cold and fresh-connection paths independently.

The cold hypothesis was plausible but incomplete. A new environment may cause the fresh connection, yet optimizing code initialization alone will not fix the dominant span. The test should evolve to report both execution initialization and dependency initialization.

Another failure mode is a load generator that reuses connections while production callers usually do not, or the opposite. Connection reuse changes handshake costs and can route traffic differently. State whether the client is fresh per trial, whether DNS and TLS are included, and whether an HTTP connection can be reused for warm controls.

## Keep the Measurement Client Smaller Than the Effect

The test client can have its own cold start: importing libraries, initializing a JavaScript runtime, starting a browser, resolving DNS, or launching a JVM. If the timer includes client process startup, it may attribute local initialization to the server.

Start the measurement process before the timed request unless client launch is part of the user journey. Warm the client’s code path without contacting the target, when possible. Monitor client CPU and network. Run from a stable location and compare against a fast control endpoint to identify regional network anomalies.

A TypeScript timing helper should use a monotonic clock for elapsed time:

\`\`\`ts
type TimedResult = {
  status: number;
  elapsedMs: number;
  requestId: string | null;
};

export async function timedGet(url: string): Promise<TimedResult> {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual' });
  await response.arrayBuffer();

  return {
    status: response.status,
    elapsedMs: performance.now() - started,
    requestId: response.headers.get('x-request-id'),
  };
}
\`\`\`

Reading the body ensures elapsed time covers response transfer. Manual redirect behavior prevents an unnoticed redirect chain from being folded into the origin measurement. In a real test, handle the expected redirect contract explicitly.

## Integrate Cold Checks Into CI Without Faking Isolation

A pull-request pipeline is good for validating the harness, schema, trace correlation, and a few smoke trials. It is often a poor place for statistically meaningful cold distributions because shared runners, concurrent deployments, and background probes weaken control.

Use layers:

| Pipeline layer | Scope | Expected output | Gate type |
|---|---|---|---|
| Unit | Timing helpers and classifiers | Deterministic tests | Required on every change |
| Harness smoke | One low-risk request | Valid response and correlation | Required where environment exists |
| Cold canary | Few isolated trials | Detect large regression | Scheduled or deployment gate |
| Characterization | Many repeated trials | Distribution and comparison | Controlled performance window |
| Scale-out experiment | Concurrent cold burst | Capacity and queue evidence | Planned resilience exercise |

Artifact naming, matrix isolation, and result aggregation benefit from the practices in a [Playwright parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide). The cold reset itself must remain serialized for a shared target, or parallel jobs can warm the environment for one another.

If teams are selecting a generator for warm throughput after cold characterization, consult the [k6 versus JMeter comparison](/blog/k6-vs-jmeter-2026). Avoid using a high-throughput script as the only cold-start test, because its first few samples will be drowned in a large warm population.

## Set Regression Gates That Respect Noisy Distributions

Cold latency varies more than steady-state handler time. A gate based on one trial will flap. Use an adequate sample, compare like-for-like configurations, and set both an absolute user objective and a regression criterion where appropriate.

For example, a report may state that confirmed idle cold starts must remain below an agreed p95 budget and must not regress materially against a baseline collected with the same region, allocation, artifact type, and reset path. The exact threshold belongs to the product’s service objective, not a generic article.

Before failing a build, verify these validity conditions:

\`\`\`text
[ ] Every included sample has positive cold-start evidence
[ ] No probe or unrelated request preceded the trial
[ ] Deployment revision and configuration stayed constant
[ ] Client and service clocks were synchronized for correlation
[ ] Response status and body contract passed
[ ] Traces and platform metrics cover the complete sample window
[ ] Client resource usage stayed within calibrated headroom
[ ] Sample count supports the reported statistic
\`\`\`

When validity fails, return “inconclusive” with the cause. Treating missing evidence as a performance failure creates alert fatigue. Treating it as a pass rewards broken telemetry.

## Optimize Only After Attribution Is Clear

Cold-start remedies differ by dominant phase. Smaller artifacts and less eager module loading may help code initialization. Lazy dependency setup can improve the first response but move cost into later requests or create concurrency races. Provisioned minimum capacity can reduce occurrence while increasing cost. Connection pooling helps only when environments live long enough to reuse connections. A cache can hide the origin path rather than improve it.

Run one change at a time against the same experiment definition. Examine cold severity, warm latency, error behavior, memory, cost, and occurrence rate. An optimization that lowers median cold latency but doubles warm memory may reduce platform density or trigger different scaling behavior.

AI coding agents can help locate eager imports, create trace spans, and generate comparison reports. Give them structured trial data and ask for evidence-linked hypotheses. Do not ask them to infer cold starts purely from latency labels. The classifier should be based on instance and initialization evidence established by the system owners.

The durable result is not “cold start equals 843 ms.” It is a versioned experiment showing which state was cold, how it was established, what the caller experienced, where the time went, how often the condition occurred, and how confidently the team can reproduce it.

## Frequently Asked Questions

### How many cold-start trials are enough for a useful result?

There is no universal count. It depends on variability, the percentile or comparison you need, and the cost of creating independent cold states. Begin with exploratory trials to estimate spread, then choose a sample size that supports the intended decision. Always publish the count and individual distribution. A handful of samples can expose a large initialization problem, but it cannot justify a stable tail percentile. Preserve warm controls and validity evidence so additional trials can be combined only when configurations truly match.

### Should cold and warm latency be combined in one percentile?

Not as the only report. A blended percentile can describe user experience when the test reproduces the real cold-start frequency, but it hides conditional severity and may omit rare cold events entirely. Report confirmed cold and confirmed warm distributions separately, plus the natural occurrence rate. If you also calculate a blend, state the traffic mixture and interval. This lets product owners understand overall impact while engineers see whether a change affected initialization cost, steady execution, or how often cold starts happen.

### Can an ordinary load test measure serverless cold starts accurately?

It can observe some cold requests, especially during a scale-out burst, but it usually cannot classify them accurately without platform logs, traces, and instance identifiers. Most samples in a sustained run are warm, and the generator may reuse connections or trigger several environments at once. Use a controlled single-trial experiment for isolated cold severity, then a separate concurrency experiment for scale-out behavior. Correlate every relevant request and keep generator health visible.

### What is the most common source of false cold-start results?

The most common problem is classifying by slow latency instead of by state evidence. A warm request delayed by a database pool, network handshake, queue, or overloaded generator is then called cold, while a fast initialization is missed. Another frequent contaminant is an automated probe warming the route before the measured request. Define cold from a new environment or initialization event, inventory all traffic sources, disable automatic retries, and retain request-level traces so the classification can be audited.
`,
};
