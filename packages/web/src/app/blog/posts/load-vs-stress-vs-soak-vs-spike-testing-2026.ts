import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Load vs Stress vs Soak vs Spike Testing (2026 Guide)",
  description: "Load vs stress vs soak vs spike testing explained — when to use each performance test type, what each one finds, plus ready-to-run k6 and JMeter snippets.",
  date: "2026-06-15",
  category: "Performance",
  content: `# Load vs Stress vs Soak vs Spike Testing (2026 Guide)

Load, stress, soak, and spike testing are four performance test types that differ only in how they shape traffic over time. **Load testing** runs your expected peak traffic to confirm the system meets its SLAs under normal conditions. **Stress testing** pushes load past that peak until something breaks, to find the ceiling and how the system fails. **Soak testing** (also called endurance testing) holds a steady moderate load for hours to expose memory leaks and slow resource exhaustion. **Spike testing** slams the system with a sudden, sharp surge to see whether it survives a flash crowd and recovers. Same tool, same script — different load profile.

This guide gives one canonical decision table, explains what each type uniquely finds, and shows the load-profile snippets in both [k6](/skills) and Apache JMeter so you can run each one today. The vocabulary here is widely shared but not perfectly standardized across teams, so the definitions below reflect the most common industry usage.

## The one table to remember

| Test type | Load shape | Duration | Primary question it answers | What it finds |
|---|---|---|---|---|
| **Load** | Ramp to expected peak, hold | 15–60 min | "Do we meet SLAs at normal peak?" | Latency/throughput at target load, regressions |
| **Stress** | Ramp *past* peak until failure | Until breakdown | "Where is the ceiling and how do we fail?" | Breaking point, failure mode, error cascade |
| **Soak (endurance)** | Steady moderate load | 2–24+ hours | "Do we degrade over time?" | Memory leaks, connection/FD exhaustion, log/disk growth |
| **Spike** | Instant jump to very high load, then drop | Minutes | "Can we survive and recover from a surge?" | Autoscaling lag, cold-start storms, queue overflow |

Everything else is detail. If you remember this table, you know which knob to turn for the question you're trying to answer.

## Load testing — the baseline

Load testing simulates the **traffic you actually expect at peak** — Black Friday for a store, lunch hour for a food-delivery app, the minute a class registration opens. You ramp virtual users up to that target, hold them there, and measure whether response times, throughput, and error rates stay inside your service-level objectives.

Its job is regression detection and capacity confirmation, not breaking things. Run it in CI on every significant change so a 20% latency regression is caught before it ships. The output you care about is the latency distribution (p95/p99, never just the average), requests per second, and error rate at the target concurrency.

\`\`\`javascript
// k6 — classic load test: ramp to 200 VUs, hold, ramp down
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 200 }, // ramp up to expected peak
    { duration: '10m', target: 200 }, // hold at peak
    { duration: '2m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // <1% errors
  },
};

export default function () {
  const res = http.get('https://test.example.com/api/products');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
\`\`\`

The \`thresholds\` block is what turns a load test into a pass/fail gate: if p95 exceeds 500ms or errors exceed 1%, k6 exits non-zero and your pipeline fails.

## Stress testing — find the ceiling

Stress testing keeps increasing load **beyond** your expected peak until the system can no longer keep up. You are deliberately trying to break it. The point is not the breakage itself but learning two things: *where* the ceiling is (so you know your real headroom) and *how* the system behaves as it crosses that line.

A graceful system sheds load — it returns 503s, rejects excess requests fast, and keeps serving a reduced volume. A fragile one falls into a death spiral: threads block, queues back up, timeouts cascade, and throughput collapses to near zero. Stress testing reveals which one you have, and whether your degradation is graceful or catastrophic.

\`\`\`javascript
// k6 — stress test: keep climbing past peak until it breaks
export const options = {
  stages: [
    { duration: '2m', target: 200 }, // normal peak
    { duration: '3m', target: 500 }, // beyond peak
    { duration: '3m', target: 1000 }, // well beyond
    { duration: '3m', target: 2000 }, // find the wall
    { duration: '5m', target: 0 }, // recover
  ],
};
\`\`\`

Watch your dashboards as much as the k6 output here. The interesting moment is the inflection point where p99 latency and error rate shoot up while throughput plateaus — that is your real maximum sustainable load.

## Soak testing — the slow killers

Soak testing (endurance testing) holds a **moderate, sustainable** load for a long time — hours, sometimes a full day or more. The load level is unremarkable; the duration is the test. You are hunting for problems that only appear with time and accumulated work.

The classic findings are memory leaks (heap creeps up until the process is killed or the GC thrashes), connection-pool or file-descriptor exhaustion, unbounded caches, log files filling a disk, and slow database bloat. None of these show up in a 20-minute load test — the system looks healthy right until hour six. If a service is meant to run for weeks between deploys, a soak test is the only way to catch the bugs that surface on day three in production.

\`\`\`javascript
// k6 — soak test: steady moderate load for 8 hours
export const options = {
  stages: [
    { duration: '5m', target: 100 }, // ramp to a sustainable level
    { duration: '8h', target: 100 }, // hold it — duration is the test
    { duration: '5m', target: 0 },
  ],
};
\`\`\`

Pair this with memory and connection-count graphs over the full window. A flat memory line is a pass; a slow upward ramp that never plateaus is a leak, even if no request ever failed.

## Spike testing — survive the flash crowd

Spike testing throws a **sudden, sharp surge** at the system — a near-instant jump from baseline to many times normal traffic, held briefly, then dropped. This models a product going viral, a marketing email blast, a TV mention, or a thundering herd when a popular event opens.

What it exposes is different from stress testing. The total load might be survivable in steady state, but the *rate of change* is the problem: autoscaling takes minutes to add capacity while the spike lands in seconds, connection pools saturate instantly, caches are cold, and serverless functions hit a cold-start storm. Spike testing also checks recovery — after the surge passes, does the system return to normal latency, or does it stay degraded because queues are still draining?

\`\`\`javascript
// k6 — spike test: baseline, then a sudden surge, then drop
export const options = {
  stages: [
    { duration: '1m', target: 50 }, // baseline
    { duration: '10s', target: 2000 }, // sudden spike — note the short duration
    { duration: '3m', target: 2000 }, // hold the surge
    { duration: '10s', target: 50 }, // drop back
    { duration: '3m', target: 50 }, // measure recovery
  ],
};
\`\`\`

The two questions: did it survive the surge, and did it *recover* afterward? A system that 500s during the spike but snaps back to normal in seconds is often acceptable; one that stays broken for ten minutes after the spike ends is not.

## The same four profiles in JMeter

JMeter expresses these shapes with thread groups. The classic Thread Group has ramp-up time and loop count, but for precise load shaping most teams use the **Ultimate Thread Group** plugin (from JMeter-Plugins), which lets you draw arbitrary ramp/hold/spike schedules row by row.

\`\`\`xml
<!-- JMeter standard Thread Group: a basic load test -->
<!-- 200 users, ramped over 120s, holding via a long loop or scheduler -->
<ThreadGroup>
  <stringProp name="ThreadGroup.num_threads">200</stringProp>
  <stringProp name="ThreadGroup.ramp_time">120</stringProp>
  <boolProp name="ThreadGroup.scheduler">true</boolProp>
  <stringProp name="ThreadGroup.duration">720</stringProp>
</ThreadGroup>
\`\`\`

To map each type in JMeter:

- **Load:** standard Thread Group — set threads to your peak, a reasonable ramp-up, and a scheduler duration to hold.
- **Stress:** chain several Thread Groups (or use Ultimate Thread Group rows) that each add more threads in steps, climbing past peak.
- **Soak:** standard Thread Group with a long \`duration\` (for example \`28800\` seconds for 8 hours) at a moderate thread count.
- **Spike:** Ultimate Thread Group with a row that has near-zero "Startup Time," jumping straight to a high thread count, a short hold, then back down.

Run JMeter from the command line in CI (\`jmeter -n -t test.jmx -l results.jtl\`) rather than the GUI, which is for building and debugging plans, not for generating load. Whichever tool you choose, see how teams wire these into pipelines in our [comparisons of performance and QA tooling](/compare).

## How they fit together in a release cycle

You do not pick one of these — a mature performance practice uses all four at different cadences:

1. **Load test in CI** on every significant change as a regression gate.
2. **Stress test** before a major launch or after an architecture change, to re-confirm your real ceiling and headroom.
3. **Soak test** before any release that will run for a long time without a deploy, to catch leaks.
4. **Spike test** before predictable surge events (launches, sales, campaigns) and when validating autoscaling configuration.

Read the results correctly — always look at the latency *distribution*, not the mean, and correlate with system metrics. For a deeper treatment of interpreting the numbers, see our broader [performance and QA articles](/blog).

## Common pitfalls

- **Reporting averages.** A 120ms average can hide a p99 of 4 seconds. Always gate on p95/p99.
- **Load-generating from one tiny box.** If the test machine maxes out its CPU or network, you are measuring the load generator, not the system. Distribute load or use a managed runner.
- **No think time.** Real users pause between requests. Zero \`sleep()\` produces an unrealistic, hammer-like pattern that overstates throughput and understates concurrency.
- **Testing against a non-prod-sized environment.** Results from a single small instance do not predict a production cluster. Match topology as closely as budget allows.
- **Skipping the recovery window.** Especially in spike and stress tests, the most damaging bugs appear *after* load drops, while queues drain. Always measure the cool-down.

## Frequently Asked Questions

### What is the difference between load testing and stress testing?

Load testing runs the traffic you actually expect at peak and confirms the system meets its SLAs under those normal conditions — it is a pass/fail capacity and regression check. Stress testing deliberately pushes load *past* that expected peak until the system breaks, to discover the ceiling and observe how it fails. Put simply, load testing asks "are we fine at peak?" while stress testing asks "where and how do we break?"

### What does soak testing find that load testing cannot?

Soak (endurance) testing holds a steady moderate load for many hours, which exposes slow, time-dependent failures that a short load test never reaches. The classic findings are memory leaks, connection-pool and file-descriptor exhaustion, unbounded caches, and disks filling with logs. A system can pass a 20-minute load test perfectly and still fall over at hour six in production — the soak test is what catches that.

### When should I run a spike test?

Run a spike test before any predictable surge event — a product launch, a marketing email blast, a flash sale, or a feature that might go viral — and whenever you change autoscaling configuration. A spike test models a sudden, sharp jump in traffic so you can see whether autoscaling reacts fast enough, whether connection pools and caches survive the instant surge, and crucially whether the system recovers to normal latency after the spike passes.

### Can I use one tool for all four performance test types?

Yes. Load, stress, soak, and spike tests differ only in the load profile — the ramp, hold, and peak shape over time — not in the underlying request logic. Tools like k6 (via the stages option) and JMeter (via thread groups or the Ultimate Thread Group plugin) let you keep one script and change just the load schedule to switch between all four types.

### What metrics matter most in performance testing?

Focus on the response-time distribution rather than the average — specifically p95 and p99, since the mean hides the slow tail that users actually feel. Alongside latency, track throughput (requests per second), the error rate, and system-level metrics like CPU, memory, and connection counts. For soak and stress tests in particular, memory and connection-count trends over time often reveal the real problem before any request fails.

### Is endurance testing the same as soak testing?

Yes — "endurance testing" and "soak testing" are two names for the same thing. Both describe running a steady, sustainable load over a long duration (hours to a full day or more) to surface gradual resource problems such as memory leaks, connection exhaustion, and slow degradation. Different teams and tools use the terms interchangeably, so treat them as synonyms.
`,
};
