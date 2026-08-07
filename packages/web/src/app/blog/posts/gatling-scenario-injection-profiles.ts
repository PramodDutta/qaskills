import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Gatling Scenario Injection Profiles: Model Real Traffic Without Guesswork',
  description: 'Master Gatling scenario injection profiles to choose open or closed workloads, compose realistic stages, validate arrival rates, and explain failures.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# Gatling Scenario Injection Profiles: Model Real Traffic Without Guesswork

Gatling scenario injection profiles describe how virtual users enter a simulation over time. The central decision is whether users arrive independently of system response time, an open workload, or whether the test maintains a defined number of concurrent users, a closed workload. Choose that model from production behavior first, then compose documented injection steps such as immediate users, ramps, constant arrival rates, or concurrent-user plateaus.

The payoff is more than a smooth traffic chart. A correctly chosen profile preserves the causal meaning of the test. If checkout requests arrive from a queue or public audience regardless of current latency, an open model exposes overload instead of quietly reducing new work. If a fixed workforce repeatedly uses an internal application, a closed model captures the way longer responses reduce completed iterations. This guide turns Gatling scenario injection profiles into measurable test contracts for QA engineers and AI coding agents.

The examples use Gatling’s Java DSL because its types make profile intent explicit. Gatling also provides other supported SDKs, and the same modeling concepts apply even when syntax differs. Check the official Gatling documentation for the exact DSL corresponding to the project’s installed version rather than translating examples mechanically.

## Start With the Production Arrival Process

An injection profile is not a decorative ramp. It encodes who can begin work, when they begin, and whether system slowdown changes future arrivals. Gather evidence from production request starts, session starts, queue consumers, scheduled jobs, or active-user counts before choosing steps.

| Production behavior | Appropriate model | Primary control variable | Example |
|---|---|---|---|
| Public requests continue arriving during slowdown | Open | Users or iterations started per time | Ticket sale, webhook ingress |
| A fixed set of people works continuously | Closed | Concurrent active users | Call-center application |
| Batch items wait in a queue | Usually open at the service boundary | Item arrival or dequeue rate | Document processing |
| A fixed connection pool loops over tasks | Closed | Concurrent workers or sessions | Internal job runners |
| One-time launch creates a burst | Open burst plus later stages | Users started at specific times | Product announcement |

Do not infer an open or closed model solely from whether the application uses login sessions. A user can have a session and still arrive independently. Likewise, a backend API without human users can be constrained by a fixed worker pool and behave like a closed system.

Define the unit of a virtual user as part of the model. One injected user might execute one purchase and exit, or remain for an hour and repeat searches. At the same injection rate, those scenarios create radically different concurrency. The scenario code and the injection profile form one workload definition.

## Understand How Open and Closed Models React to Latency

In an open profile, Gatling schedules new users according to time. If responses slow, existing users remain active longer while new users continue to arrive. Concurrency therefore rises. That is exactly the mechanism that exposes a service falling behind a fixed external arrival rate.

In a closed profile, Gatling maintains or changes a concurrency target. When a user finishes, another can be introduced to preserve the target. Slower responses lower iteration throughput at the same concurrency. The workload applies backpressure naturally because the population is bounded.

| Observation during slowdown | Open injection | Closed injection |
|---|---|---|
| New-user starts | Continue according to schedule | Governed by target concurrency |
| Active users | Usually rise as sessions take longer | Remain near the target |
| Completed throughput | May plateau while backlog grows | Usually falls with longer response times |
| Overload signal | Rising concurrency, latency, queues, errors | Falling work completion at fixed concurrency |
| Common reporting error | Ignoring concurrency growth | Treating concurrency as request rate |

What people get wrong most often is selecting closed concurrency because the requirement says “5,000 users,” even though production telemetry actually means 5,000 session starts per minute. The number has no useful meaning without a time basis and a lifecycle. Ask whether it is an arrival rate, an active population, a daily count, or a peak snapshot.

Another mistake is adding a throughput assertion to compensate for the wrong profile. Assertions evaluate the resulting test, but they do not change the workload’s causal behavior. Correct the model before interpreting pass or fail.

## Use Open Injection Steps for Independent Arrivals

An open scenario can introduce users immediately, over a duration, or at a rate. A minimal Java simulation might start a small group at once:

\`\`\`java
import io.gatling.javaapi.core.Simulation;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;
import io.gatling.javaapi.core.ScenarioBuilder;
import io.gatling.javaapi.http.HttpProtocolBuilder;

public class SearchBurstSimulation extends Simulation {
  HttpProtocolBuilder httpProtocol = http.baseUrl("https://test.example.net");

  ScenarioBuilder search = scenario("Search burst")
      .exec(http("search").get("/api/search?q=headphones"));

  {
    setUp(
        search.injectOpen(atOnceUsers(25))
    ).protocols(httpProtocol);
  }
}
\`\`\`

\`atOnceUsers\` is useful for a deliberate burst, a smoke check, or establishing resources simultaneously. It is not a substitute for a production ramp. A large instantaneous start can test connection storms or cache misses, but if real traffic grows over minutes, an immediate burst answers a different question.

For a gradual population increase, use a user ramp:

\`\`\`java
setUp(
    search.injectOpen(
        rampUsers(600).during(120)
    )
).protocols(httpProtocol);
\`\`\`

This schedules 600 user starts over 120 seconds. The request rate is not necessarily five requests per second because each user may execute several requests, pauses, branches, or loops. Report user starts and request starts separately.

For an arrival-rate requirement, constant and ramping rates express intent more directly:

\`\`\`java
setUp(
    search.injectOpen(
        rampUsersPerSec(2).to(20).during(180),
        constantUsersPerSec(20).during(600)
    )
).protocols(httpProtocol);
\`\`\`

This profile increases user starts from 2 per second to 20 per second, then holds 20 user starts per second. If each user runs one scenario iteration, the arrival rate is easy to interpret. If users loop, carefully define whether the arrival target applies to sessions or business transactions.

Gatling supports randomized arrival timing for appropriate rate steps through DSL options documented for those steps. Randomization can avoid an unrealistically regular cadence. Use it only when it matches the arrival process, and keep a deterministic test seed or repeatability plan where supported by the surrounding data and code.

## Use Closed Injection Steps for a Bounded Population

Closed profiles define concurrent users. A simple plateau keeps a stable active population for a duration:

\`\`\`java
setUp(
    search.injectClosed(
        constantConcurrentUsers(200).during(900)
    )
).protocols(httpProtocol);
\`\`\`

This does not promise a fixed request rate. Throughput depends on scenario duration, pauses, response time, branching, retries, and failures. That dependency is often the desired behavior for a fixed user population.

Ramp concurrency when a sudden population is unrealistic or when the service requires warm-up:

\`\`\`java
setUp(
    search.injectClosed(
        rampConcurrentUsers(20).to(300).during(300),
        constantConcurrentUsers(300).during(900)
    )
).protocols(httpProtocol);
\`\`\`

The ramp controls active users rather than arrivals per second. As early users finish, Gatling can start replacements while driving toward the target. Do not compare the ramp’s numbers directly with an open \`rampUsersPerSec\` profile, because they express different dimensions.

| Requirement phrase | Better clarification | Likely Gatling construct |
|---|---|---|
| “Ramp to 300 users” | 300 active users or 300 starts per second? | Closed concurrency or open rate ramp |
| “Hold traffic for 15 minutes” | Hold arrivals, concurrency, or request throughput? | Model-specific constant step |
| “Send 10,000 users” | Over what duration, and does each leave? | Open user count with duration |
| “Test peak load” | Natural peak, sudden burst, or capacity search? | Staged ramp, burst, or stress profile |
| “Match production” | Which production metric and interval? | Profile derived from measured starts or population |

Closed tests need realistic pauses. Without think time, each virtual user behaves like a machine repeatedly clicking as soon as a response arrives. This may be useful for saturation, but it should not be labeled as realistic human concurrency.

## Compose Warm-Up, Measurement, and Peak Stages Deliberately

A profile can contain consecutive injection steps. Give each stage a purpose that maps to analysis. A common open workload progresses through warm-up, a normal plateau, a peak ramp, and a peak plateau:

\`\`\`java
setUp(
    search.injectOpen(
        constantUsersPerSec(2).during(120),
        rampUsersPerSec(2).to(15).during(180),
        constantUsersPerSec(15).during(600),
        rampUsersPerSec(15).to(30).during(120),
        constantUsersPerSec(30).during(300)
    )
).protocols(httpProtocol);
\`\`\`

The first stage can initialize connections and code paths, but it is not automatically excluded from Gatling’s report. Record timestamps or use clearly named simulations and external observability markers so analysts know which interval supports which conclusion.

A stress profile should increase load slowly enough to observe the system’s transitions. Doubling rate every few seconds may skip over the first unstable region and combine several failure mechanisms. Capacity search benefits from plateaus long enough for queues, autoscaling, connection pools, and garbage collection to reach a recognizable state.

| Stage | Intended question | Minimum evidence | Invalidating condition |
|---|---|---|---|
| Script verification | Does the scenario perform correct business actions? | Individual checks and request traces | Correlation or data failures |
| Warm-up | Are caches and runtimes approaching normal state? | Cache, instance, and latency trends | Unexpected business errors |
| Baseline plateau | Is the known-safe rate reproducible? | Stable arrivals, latency, errors | Generator constraint |
| Peak plateau | Does the service meet the peak objective? | Full-window percentiles and dependency data | Arrival shortfall |
| Recovery | Does backlog drain and latency return? | Queue depth, active users, resource decline | Continued injected load |

Recovery deserves explicit observation. When injection ends, active open-model users may still be completing. Do not terminate the process so quickly that recovery evidence disappears. Also do not count post-injection completion traffic as a new arrival stage.

## Keep Multiple Scenarios From Creating an Accidental Workload

Real systems have search, browse, purchase, account, and background flows. Gatling can set up several populations, each with its own injection. Their traffic overlaps according to their timelines. That flexibility makes it easy to create totals that exceed the stated target.

\`\`\`java
ScenarioBuilder browse = scenario("Browse")
    .exec(http("catalog").get("/api/catalog"));

ScenarioBuilder buy = scenario("Buy")
    .exec(http("checkout").post("/api/checkout"));

{
  setUp(
      browse.injectOpen(constantUsersPerSec(80).during(600)),
      buy.injectOpen(constantUsersPerSec(20).during(600))
  ).protocols(httpProtocol);
}
\`\`\`

Here the scenario-start mix is 80 percent browse and 20 percent buy, with 100 new users per second overall. It does not guarantee that request traffic has the same ratio. The buy scenario may make more requests, take longer, or fail earlier. Derive the expected request mix from scenario paths and verify the observed mix by request name.

If one population must begin after another completes, use Gatling’s supported sequential population composition, such as \`andThen\`, as documented for the chosen SDK. If it only needs to start after a time offset, an injection delay can be clearer. Do not simulate dependency by inserting long user pauses unless those sleeping users are truly part of the population you want measured.

Avoid mixing open and closed models in a single requirement without explaining why. It can be valid to model public shoppers with an open profile and support agents with a closed profile, but their metrics must be separable. The aggregate is not itself an open or closed workload.

## Translate Production Histograms Into a Test Contract

Peak averages conceal short bursts. Export session-start counts in an interval fine enough to preserve operational shape, such as one minute or smaller when the system reacts quickly. Clean bot traffic and internal probes only if the test scope excludes them. Then calculate representative normal, peak, and exceptional windows.

A useful workload contract states:

\`\`\`yaml
business_flow: product-search
model: open
arrival_unit: new scenario users per second
normal_rate: 18
peak_rate: 42
normal_plateau_seconds: 900
peak_plateau_seconds: 300
scenario_ends_after: one search session
data_partition: synthetic-query-set-v5
measurement_excludes: warm-up
\`\`\`

Keep the contract independent of DSL syntax. Reviewers can validate the business meaning before debating code. The simulation then becomes an executable translation of that contract.

If production has a jagged profile, resist copying every point unless the goal is trace replay. A simpler piecewise profile is easier to explain and compare. Preserve the features that could change system behavior: sharp bursts, long plateaus, periodic jobs, and recovery gaps.

For broader generator selection, the [k6 versus JMeter guide](/blog/k6-vs-jmeter-2026) can help evaluate ecosystem and execution tradeoffs. Injection modeling remains essential regardless of tool, so do not treat a migration as a substitute for defining arrivals.

## Validate the Achieved Profile, Not Just the Source Code

After execution, prove that the intended users entered the system. Review Gatling’s active-user and request metrics alongside host resources. In open tests, compare scheduled user starts with achieved starts over the correct intervals. In closed tests, confirm active users reached and maintained the target.

Generator saturation can prevent an open profile from keeping schedule. The service may look healthy simply because the injector failed to apply the planned rate. Monitor generator CPU, memory, garbage collection, network, and file descriptors. Distribute load generation when one machine no longer has safe headroom, and validate that distributed clocks and data remain coherent.

Automated execution should archive the simulation revision, effective configuration, Gatling logs and reports, generator metrics, and service observability references. The artifact-isolation ideas in this [parallel CI sharding guide](/blog/playwright-test-sharding-parallel-ci-guide) transfer well to naming independent load jobs, even though a Gatling injection population is not a test-file shard.

Use assertions for explicit service objectives and for workload validity where the DSL exposes suitable metrics. However, keep raw observations. A single pass or fail cannot explain whether the arrival profile was achieved, whether one request name dominated errors, or when degradation began.

## Diagnose Arrival Collapse Before Blaming the Service

Imagine an open test scheduled at 500 users per second. At minute eight, reported latency improves unexpectedly while throughput falls. Service CPU also declines. A superficial reading says an optimization took effect. More likely, the generator stopped delivering the intended workload.

Investigate in this order:

1. Check user-start and request-start rates by second, not only totals.
2. Check active users. If starts fall while active users also fall, injection may be constrained outside the service.
3. Inspect generator CPU, heap, garbage collection, network, and socket errors.
4. Separate scenario failures that exit users early from HTTP response failures.
5. Compare load-generator request starts with service-side request receipts.
6. Repeat at a lower rate or with additional generators while keeping scenario behavior constant.

A feeder exhaustion can create a similar pattern. When unique input data runs out, users may fail before sending requests. The service then appears faster under a lighter accidental load. Verify feeder capacity for the total number of users across the entire run, including retries or repeated stages where relevant.

Another realistic failure occurs when a closed profile masks overload. At 1,000 concurrent users, response time triples and throughput drops to one third, but active users stay steady. Someone reports that “the system handled 1,000 users.” That statement ignores completed work. Closed tests must pair concurrency with business throughput, response time, errors, and queue evidence.

## Separate Service Objectives From Experiment Validity

A good performance result has two gates. The service gate asks whether latency, error rate, and business throughput meet objectives. The validity gate asks whether the intended workload was applied and the measurement system remained healthy. If validity fails, the service result is inconclusive rather than passed.

| Gate | Example check | Failure meaning | Response |
|---|---|---|---|
| Workload validity | Arrival rate stayed within agreed tolerance | Test did not apply the contract | Fix injector or profile, rerun |
| Generator health | Resource headroom remained | Client timing may be distorted | Add capacity or reduce overhead |
| Data validity | Unique records remained available | Scenario mix changed | Replenish or partition data |
| Service objective | Peak p95 met target | User experience missed goal | Diagnose service and dependencies |
| Recovery objective | Queue drained within target | Overload persists after peak | Investigate backpressure and scaling |

This two-gate scheme prevents a common anti-pattern: declaring success because latency stayed low when the injection rate was never achieved. It also prevents declaring a service regression when generator pauses inflated client-observed time.

## Make AI-Generated Profiles Reviewable

AI coding agents can translate a written workload contract into Gatling DSL quickly, but profile code requires human review at semantic boundaries. Ask the agent to show its arithmetic, identify whether each population is open or closed, list the expected total arrivals, and state what one virtual user does. Reject code that introduces an undocumented DSL method or silently changes the user lifecycle.

A focused review checklist is more effective than “make a load test”:

\`\`\`text
[ ] Production metric maps to arrival rate or concurrency
[ ] One virtual user has a documented start and end
[ ] Sum across populations matches the workload contract
[ ] Warm-up and measurement intervals are named
[ ] Scenario data covers every planned user
[ ] Generator capacity was calibrated for peak activity
[ ] Assertions do not replace workload-validity checks
[ ] Recovery remains observable after injection stops
\`\`\`

Have the agent generate a small arithmetic test for helper functions that calculate rates or stage durations. Keep the final Gatling constructs close to official documentation. Clever abstractions can hide whether values represent users, users per second, seconds, or concurrent users.

The best injection profile is legible enough that an operator can predict its shape from code review. When the graph differs, that discrepancy becomes a useful signal instead of a mystery.

## Frequently Asked Questions

### When should a Gatling test use an open injection profile?

Use an open profile when new work arrives independently of how long existing work takes. Public web sessions, messages entering a service, and inbound integrations often behave this way. Express the requirement as user starts over time, then validate achieved starts and active-user growth during slowdowns. An open profile is particularly valuable for exposing queue accumulation, but it also demands enough generator capacity to maintain the schedule as concurrency rises.

### Is constant concurrency the same as constant throughput in Gatling?

No. Constant concurrency maintains a bounded number of active virtual users. The rate of completed transactions still changes with response time, pauses, branching, failures, and the number of requests in a scenario. If responses take twice as long, a closed population will generally complete less work per unit time. Report concurrency and achieved business throughput together. If production imposes an independent arrival rate, use an open model rather than trying to infer rate from a concurrency target.

### How long should each injection plateau run?

Run a plateau long enough for the system behaviors relevant to the question to emerge. That may include autoscaling delays, queue growth, cache stabilization, garbage-collection cycles, connection-pool contention, and dependency rate limits. A two-minute plateau can be sufficient for a script check but inadequate for capacity evidence. State the observation period before execution, watch for stable or intentionally changing signals, and preserve a recovery interval. Longer is not automatically better if test data or environment conditions drift.

### Can one Gatling simulation combine open and closed populations?

It can be valid when the production system truly contains both behaviors, such as independent customer arrivals plus a fixed group of internal operators. Define and inject the populations separately, name their requests distinctly, and explain how their timelines overlap. Avoid presenting the aggregate as one workload model. Calculate each population’s contribution and verify it independently, because a healthy closed population can hide a failing open injector, or one scenario can consume shared test data intended for the other.
`,
};
