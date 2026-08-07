import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Locust Custom Load Shapes Guide: Match Production Traffic',
  description: 'Follow this Locust custom load shapes guide to encode stages, spikes, and waves, validate achieved users, and debug distributed load behavior.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# Locust Custom Load Shapes Guide: Match Production Traffic

A Locust custom load shape is a Python class derived from \`LoadTestShape\`. Its \`tick()\` method periodically returns a tuple containing the desired user count and spawn rate, or returns \`None\` to stop the test. That small interface can express stair steps, business-hour waves, sudden spikes, soak plateaus, or a profile replayed from approved data.

The challenge is not writing the conditional statements. It is choosing whether a target user count represents production behavior, understanding that spawn rate controls how fast Locust moves toward that target, and proving the workers actually achieved the intended shape. This Locust custom load shapes guide develops a production-focused workflow: define the traffic contract, implement a deterministic shape, test boundary times without launching traffic, observe the distributed run, and distinguish application slowdown from generator failure.

Custom shapes control Locust user population, not request throughput directly. Each user still executes tasks, waits according to its user class, follows weighted paths, and experiences application latency. A shape that maintains 1,000 users can produce different request rates as response time or task mix changes. That distinction is the foundation for every example below.

## Translate the Traffic Graph Into Population Targets

Start from production evidence, not a visually pleasing curve. Export active-session counts if the system behaves like a bounded user population. If the real requirement is independent transaction arrivals, recognize that Locust’s standard custom shape changes user count, while task iteration rate remains coupled to response time and wait behavior. You may still model the system usefully, but document the approximation.

| Source signal | What it actually measures | Useful shape interpretation | Important caveat |
|---|---|---|---|
| Concurrent sessions | Users active at a point in time | Target user count | Session definitions may include idle users |
| Login starts per minute | New session arrivals | Growth slope or staged population | Not equivalent to concurrent users |
| Requests per second | Protocol traffic | Validate achieved output | Shape does not directly guarantee it |
| Queue depth | Work waiting | Stress and recovery boundaries | Depth is an outcome, not an input rate |
| Support-agent roster | Fixed active workforce | Closed population plateau | Task and think-time distributions still matter |

Write a compact traffic contract before Python code. For example: start at 50 users, reach 500 users over five minutes, hold for 20 minutes, spike to 900 users within one minute, hold for five minutes, then stop. Include the meaning of a user, the test-data demand per user, and which interval is used for pass or fail.

What people get wrong is treating a screenshot of requests per second as a user-count specification. If each Locust user performs a variable-length checkout, there is no stable one-to-one conversion. Calibrate the scenario at several response-time conditions and report both active users and achieved requests or business transactions.

## Implement the Smallest Correct LoadTestShape

Locust discovers a concrete \`LoadTestShape\` in the locustfile and uses it to determine population changes. A minimal two-stage shape can be explicit:

\`\`\`python
from locust import HttpUser, LoadTestShape, between, task


class Shopper(HttpUser):
    wait_time = between(1, 3)

    @task
    def browse(self):
        self.client.get("/api/catalog", name="GET /api/catalog")


class TwoStageShape(LoadTestShape):
    def tick(self):
        run_time = self.get_run_time()

        if run_time < 120:
            return (100, 10)
        if run_time < 600:
            return (500, 20)
        return None
\`\`\`

During the first interval, Locust aims for 100 total users and changes the population at a spawn rate of 10 users per second. During the second, it aims for 500 at 20 users per second. Returning \`None\` ends the run.

The second number is not the final request rate and it is not an additional user count. It controls how quickly Locust spawns or stops users to move from the current population toward the requested target. A very low spawn rate can consume much of a short stage merely transitioning. A very high rate can create a connection and authentication burst that production never experiences.

| Return from \`tick()\` | Meaning | Typical result |
|---|---|---|
| \`(100, 10)\` | Target 100 users, move at 10 users per second | Population reaches target over time |
| \`(500, 50)\` | Change target to 500, move at 50 per second | Faster ramp from current population |
| \`(50, 25)\` after a higher target | Reduce toward 50, stopping users at the specified rate | Controlled ramp-down |
| \`None\` | Stop the load test | Runner exits the active test |

Use \`get_run_time()\` rather than creating an unrelated wall-clock timer. The shape’s runtime aligns its decisions with the test runner lifecycle. Keep the calculation side-effect free so repeated calls at nearby times return consistent targets.

## Turn a Stage Table Into Maintainable Python

Long chains of \`if\` statements become hard to review. Represent stages as data, then use a small loop to find the current cumulative boundary. This makes arithmetic visible and lets QA reviewers compare code with the approved contract.

\`\`\`python
from locust import LoadTestShape


class StagesShape(LoadTestShape):
    stages = [
        {"duration": 120, "users": 100, "spawn_rate": 10},
        {"duration": 300, "users": 500, "spawn_rate": 20},
        {"duration": 900, "users": 500, "spawn_rate": 20},
        {"duration": 960, "users": 900, "spawn_rate": 50},
        {"duration": 1260, "users": 900, "spawn_rate": 50},
    ]

    def tick(self):
        run_time = self.get_run_time()

        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])

        return None
\`\`\`

In this representation, \`duration\` is a cumulative end time, not a per-stage duration. Name that convention in the test documentation because both interpretations are common. Alternatively, store a separate number of seconds per stage and precompute cumulative boundaries in ordinary Python.

Do not hide units. Suffix configuration fields with \`_seconds\`, \`_users\`, or \`_users_per_second\` when ambiguity is likely. Python accepts any number, so semantic clarity comes from names, review, and tests.

| Stage | End time | User target | Spawn rate | Analysis purpose |
|---|---:|---:|---:|---|
| Warm-up | 120 s | 100 | 10/s | Initialize paths and caches |
| Ramp | 300 s | 500 | 20/s | Observe scaling transition |
| Baseline | 900 s | 500 | 20/s | Measure normal plateau |
| Spike ramp | 960 s | 900 | 50/s | Apply rapid population increase |
| Peak | 1260 s | 900 | 50/s | Measure peak and queue behavior |

The spawn rate on a steady plateau is mostly dormant once the target is reached, but it still matters if user count needs correction. Keep it valid and intentional instead of inserting an arbitrary large value.

## Unit-Test Boundary Times Without Starting Locust

Shape code is scheduling logic, and scheduling logic has off-by-one risks. Test the decision function at the instant before, at, and after each boundary. Extract a pure helper so tests do not need the runner clock.

\`\`\`python
STAGES = [
    {"end": 60, "users": 20, "spawn_rate": 5},
    {"end": 180, "users": 100, "spawn_rate": 10},
]


def target_at(elapsed_seconds):
    for stage in STAGES:
        if elapsed_seconds < stage["end"]:
            return (stage["users"], stage["spawn_rate"])
    return None


def test_first_boundary():
    assert target_at(59.999) == (20, 5)
    assert target_at(60) == (100, 10)


def test_shape_stops_at_final_boundary():
    assert target_at(179.999) == (100, 10)
    assert target_at(180) is None
\`\`\`

Then delegate from the shape:

\`\`\`python
class ReviewedShape(LoadTestShape):
    def tick(self):
        return target_at(self.get_run_time())
\`\`\`

Unit tests should also validate monotonic cumulative times, positive targets, positive spawn rates, and the expected total duration. If ramp-down is allowed, user targets need not be monotonic, but stage end times always should be.

An AI coding agent is useful for generating these boundary cases from a stage table. Require it to keep expected values literal in tests so the test does not reimplement the same faulty calculation as production code.

## Create Stair Steps That Reveal the Capacity Knee

A stair-step profile raises users, holds long enough to observe the system, then raises them again. It is effective for locating the point where latency, queue depth, or errors begin to grow nonlinearly.

\`\`\`python
from locust import LoadTestShape


class CapacityStairs(LoadTestShape):
    step_seconds = 300
    users_per_step = 100
    total_steps = 8

    def tick(self):
        run_time = self.get_run_time()
        step = int(run_time // self.step_seconds)

        if step >= self.total_steps:
            return None

        target_users = (step + 1) * self.users_per_step
        return (target_users, 25)
\`\`\`

Five-minute plateaus are examples, not a universal duration. Choose a period that exposes autoscaling, garbage collection, queue accumulation, cache turnover, and dependency behavior. If the system takes ten minutes to add capacity, two-minute steps mainly measure overlapping transitions.

Capacity stairs need objective stop conditions outside the final scheduled return. An operator or automation should stop when a protected environment reaches a safety limit, monitoring becomes unavailable, or generator health invalidates measurements. The final high step is not a challenge to damage the target.

Analyze the first stage where a service objective fails, the preceding healthy stage, and recovery after load ends. The exact maximum completed user count is less informative than the relationship among population, throughput, latency, errors, and queues.

## Model Spikes Without Confusing Ramp Time and Dwell Time

A spike has at least four phases: pre-spike baseline, ascent, dwell, and recovery. A custom shape can make these boundaries explicit. The population target changes at the ascent boundary, while spawn rate determines how long the actual transition takes.

Suppose the shape asks for an increase from 200 to 1,000 users at 40 users per second. The transition requires about 20 seconds if workers can spawn at that rate. If the spike dwell is only 15 seconds, the population never reaches the intended peak before the next target. This is a shape-design error, not an application result.

Use a feasibility calculation during review:

\`\`\`python
def transition_seconds(current_users, target_users, spawn_rate):
    return abs(target_users - current_users) / spawn_rate


assert transition_seconds(200, 1000, 40) == 20
\`\`\`

Spawn time is not always perfectly predicted by arithmetic. User startup code may authenticate, acquire data, or perform work that consumes generator resources. Compare the theoretical transition with Locust’s actual user-count graph.

| Spike mistake | Visible symptom | Diagnosis | Correction |
|---|---|---|---|
| Spawn rate too low | Target never reached | Compare transition math and actual users | Increase rate or extend ascent/dwell |
| Startup task too heavy | Users appear slowly despite requested rate | Profile generator and startup requests | Simplify startup or add workers |
| Test data collisions | Errors rise only during ascent | Group failures by data identifier | Partition unique records |
| Immediate huge target | Connection storm dominates | Inspect connect and TLS timing | Use production-derived ascent |
| No recovery stage | Queue remains high when process exits | Observe target after traffic reduction | Add controlled ramp-down and observation |

If production truly has an instantaneous reconnect storm, model it deliberately and state that connection establishment is part of the objective. Otherwise, a spike should reproduce the measured rise rather than maximize drama.

## Approximate Daily Waves With Reviewable Mathematics

Some systems rise and fall smoothly across a business day. A mathematical wave can reduce dozens of stages, but it must remain understandable. A sine curve produces a smooth target between a minimum and maximum:

\`\`\`python
import math
from locust import LoadTestShape


class BusinessWave(LoadTestShape):
    duration_seconds = 3600
    minimum_users = 100
    maximum_users = 700

    def tick(self):
        run_time = self.get_run_time()
        if run_time >= self.duration_seconds:
            return None

        midpoint = (self.minimum_users + self.maximum_users) / 2
        amplitude = (self.maximum_users - self.minimum_users) / 2
        phase = (2 * math.pi * run_time / self.duration_seconds) - math.pi / 2
        target = round(midpoint + amplitude * math.sin(phase))

        return (max(self.minimum_users, target), 20)
\`\`\`

This compressed one-hour wave begins near the minimum, reaches the maximum halfway through, and returns. It is appropriate only if that behavior matches the approved contract. Real daily traffic may have an asymmetric morning ramp, a lunch dip, or abrupt campaign peaks. Piecewise stages can be more truthful and easier to audit.

Review several sampled points and plot the target before running. A formula can be syntactically valid while shifted by half a cycle or using the wrong amplitude. Store the expected minimum time, maximum time, and endpoints as unit tests.

## Load a Profile From Data Without Letting the File Control Everything

Replaying a sanitized production population series can capture irregular traffic. Validate the file before the run: sorted timestamps, expected interval, nonnegative user targets, safe maximum, and enough duration. Keep spawn rates under separate operational control so one bad data point cannot request a dangerous transition.

\`\`\`json
[
  {"second": 0, "users": 50},
  {"second": 60, "users": 85},
  {"second": 120, "users": 140},
  {"second": 180, "users": 90}
]
\`\`\`

The shape can select the latest point whose timestamp is not greater than runtime. Decide whether interpolation is appropriate. A step function preserves sampled counts, while linear interpolation smooths them and may erase real bursts.

Version the data beside the locustfile and record its hash in run metadata. Remove production identifiers and secrets. The load profile rarely needs request payloads or user IDs, only aggregate counts.

What matters is replay purpose. A trace from a known incident helps reproduce that incident. It should not become the default release gate unless it represents the product’s current risk and scale.

## Make Task Timing Consistent With the Shape’s Meaning

The custom shape supplies the number of users. The \`User\` or \`HttpUser\` classes determine what those users do. Wait-time behavior is therefore part of the performance model, not a cosmetic delay.

Locust provides documented wait-time helpers including ranges between pauses and constant pacing behavior. Pick one based on production observation. A human-style user may pause between tasks. A worker-style user may aim to begin iterations on a cadence. No wait can be appropriate for a saturation probe, but label it accordingly.

Weighted tasks also affect request mix. A 4-to-1 weight between browse and checkout controls task selection opportunities, not necessarily completed request percentages, especially when one task takes longer or contains more requests. Validate the actual request-name mix in results.

| Shape layer | Controls | Does not guarantee |
|---|---|---|
| User target | Active Locust user population | Requests per second |
| Spawn rate | Speed of population change | Application transaction rate |
| Wait time | Delay or pacing between tasks | A fixed global arrival schedule |
| Task weights | Relative selection tendency | Exact completed traffic ratio |
| Response time | Observed system and network delay | Independent new-work arrival |

If the required test is fundamentally about an independent arrival rate, evaluate whether the scenario and tool configuration can model it faithfully. The [k6 and JMeter comparison](/blog/k6-vs-jmeter-2026) offers useful context on workload expression across generators, but tool changes still require a written traffic contract.

## Distribute Shapes Without Multiplying the Intended Target

In distributed Locust, the controller coordinates workers and the workers generate traffic. The custom shape’s target represents the total user population managed by the distributed run, not an independent target manually copied to every worker. Locust allocates user activity across connected workers.

Verify all expected workers are connected before measurement. A late or missing worker can make the remaining generators resource-bound, even if Locust still strives for the requested total. Record worker count, per-worker CPU and memory, aggregate active users, and request rate.

User classes may not distribute exactly as a simplistic arithmetic split if weighting and dispatch constraints apply. Validate the achieved class counts when multiple user types matter. Data must also be partitioned across workers. A CSV opened independently on each host can hand out duplicate accounts unless the design assigns unique shards or uses a coordinated leasing service.

CI job parallelism is a different concept from distributed load workers. The artifact and isolation patterns in a [Playwright CI sharding guide](/blog/playwright-test-sharding-parallel-ci-guide) can improve load-test automation, but do not start several independent Locust masters unless the intention is to sum several unrelated shapes.

## Diagnose a Shape That Looks Correct but Produces the Wrong Graph

Consider a test whose code requests a clean staircase from 200 to 800 users. The Locust graph reaches 600, oscillates, then falls while the shape still requests 800. Application latency appears better during the fall. The service team suspects autoscaling instability.

Use a layered diagnosis:

1. Log or otherwise expose the shape’s current requested target at stage changes.
2. Compare requested target with Locust’s actual user count.
3. Check worker membership for disconnects or late joins.
4. Inspect worker CPU, memory, greenlet health, network, and operating-system limits.
5. Inspect user startup exceptions, feeder exhaustion, and tasks that call \`stop\` or fail before useful requests.
6. Compare client request starts with service-side received traffic.

If one worker disappeared, the remaining fleet may not create users fast enough. As active users fall, the service naturally looks faster. That is an invalid test, not successful scaling.

A second failure mode is boundary flapping caused by non-deterministic shape logic. If \`tick()\` reads a changing external value without validation, it may alternate targets every call. Cache an approved profile before the run, or apply explicit smoothing and safety rules. The load test should not depend on a flaky spreadsheet or live endpoint unless testing that feedback loop is the stated goal.

## Define Validity Gates Alongside Performance Thresholds

Performance thresholds answer whether the application met objectives. Validity gates answer whether the experiment applied the intended shape. Require both.

\`\`\`yaml
validity:
  expected_workers: 6
  max_generator_cpu_percent: 80
  user_target_tolerance_percent: 5
  allowed_missing_metrics_seconds: 0
service_objectives:
  checkout_error_percent: 1
  checkout_p95_milliseconds: 900
measurement:
  start_second: 300
  end_second: 1200
\`\`\`

The sample values are illustrative and must be chosen for the environment. Keep units in field names. If a validity gate fails, report the service verdict as inconclusive rather than passing because traffic was low or failing because generator delay inflated response time.

Archive the locustfile revision, shape data, command, effective environment, worker inventory, logs, stats, generator telemetry, service dashboards, test-data revision, and stage timestamps. With those artifacts, an AI agent can help correlate a failure without inventing missing context.

## Review Custom Shapes as Experimental Code

Shape reviews should ask what hypothesis each transition tests. Reject stages that exist only because someone copied a popular sample. Check the math between targets and spawn rates, total user demand, data capacity, worker capacity, and how the last stage stops.

A compact pre-run review can be automated:

\`\`\`text
[ ] Every stage has a cumulative end time and named purpose
[ ] Boundary tests cover before, at, and after transitions
[ ] Spawn rate can reach each target within the intended interval
[ ] User startup and wait behavior match the population meaning
[ ] Distributed workers have unique test data
[ ] Requested and actual user counts will be observable
[ ] Generator and service validity gates are defined
[ ] Ramp-down, stop, and recovery behavior are explicit
\`\`\`

Custom shapes are valuable because they make workload intent executable. Keep that intent visible. A hundred-line abstraction that can draw any curve is less useful than a short, reviewed stage table that answers today’s capacity question and can be compared with production evidence.

## Frequently Asked Questions

### What does the spawn rate returned by a Locust custom shape control?

It controls how quickly Locust moves the running population toward the returned user target, expressed as users spawned or stopped per second. It does not set requests per second. Request throughput emerges from active users, task contents, wait behavior, response time, branching, and failures. Calculate whether the spawn rate can complete each transition before the next boundary, then verify the actual user graph because expensive startup work or constrained workers can make the observed transition slower.

### How does a custom load shape stop a Locust run?

Return \`None\` from the shape’s \`tick()\` method after the final interval. Test the exact final boundary so the run does not stop one stage early or continue indefinitely. Also decide whether immediate termination preserves enough recovery evidence. If queues and in-flight work need observation, design a controlled population reduction before the final stop and keep external service monitoring active after Locust finishes. Cleanup of synthetic data should be a separate, observable step.

### Can a Locust shape guarantee a fixed requests-per-second rate?

Not by user targets alone. A custom shape controls population and the rate of population change. Each user’s request cadence still depends on scenario code, waits, and application response time. You can calibrate a population that produces an approximate rate under known conditions, but overload may change that relationship. If fixed independent arrivals are central to the test, document the modeling gap, validate achieved request starts continuously, and consider a workload approach designed around arrival rate.

### How should custom shapes be tested before a full load run?

Extract the time-to-target decision into a pure Python function and unit-test the instant before, at, and after every boundary. Validate ordered end times, positive spawn rates, safe user limits, expected duration, and ramp-down behavior. Then run a low-scale rehearsal with the same stage proportions, observe requested versus actual users, and verify data allocation. Finally, calibrate each worker’s resource headroom before attempting the peak distributed profile.
`,
};
