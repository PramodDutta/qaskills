import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Performance Testing Memory Baseline Drift: Detect Slow Leaks Reliably',
  description: 'Detect performance testing memory baseline drift with steady workloads, GC-aware metrics, robust trend gates, leak diagnosis, and reproducible CI scripts.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# Performance Testing Memory Baseline Drift: Detect Slow Leaks Reliably

Performance testing memory baseline drift means detecting when a service retains progressively more memory under the same sustained workload, after separating expected warm-up, cache growth, garbage-collection cycles, runtime variation, and traffic differences. The reliable signal is not a single peak. It is a repeatable upward change in a stable memory measure, normalized by work and evaluated over comparable post-warm-up windows.

Build the test around a controlled workload, a fixed application build and runtime configuration, and time-aligned process or container metrics. Capture resident memory, managed heap, external or native allocations, garbage-collection behavior, request throughput, concurrency, errors, and restarts. Compare robust window summaries and end-of-run retention across repeated trials. When the gate fails, diagnose the owning memory region before changing a threshold.

## Define drift in operational terms

Memory usage naturally moves. A just-started service loads modules, opens connection pools, compiles hot code, fills caches, and allocates buffers. A tracing agent may batch telemetry. The runtime may delay returning freed pages to the operating system. None of these observations alone proves a leak.

Define a baseline as a distribution from comparable successful runs, not the lowest number ever seen. Define drift as a sustained change that exceeds both an absolute allowance and a relative allowance, or as a positive slope that persists after warm-up under steady throughput. Which signal matters depends on the failure risk. A container is killed based on resident or cgroup memory, while a JavaScript heap limit relates more directly to managed heap.

| Signal | What it includes | Useful for | Main ambiguity |
|---|---|---|---|
| RSS or resident set | Mapped resident pages for the process | Container pressure and kill risk | Allocator may retain freed pages |
| Managed heap used | Live and not-yet-collected runtime objects | JavaScript or JVM retention | Sawtooth changes around GC |
| External/native memory | Buffers and native library allocations | Leaks outside managed heap | Runtime-specific accounting |
| Container working set | Memory charged to the container | Deployment capacity | Sidecars and page cache may contribute |
| Allocation rate | Bytes allocated per unit time | Churn and GC cost | High allocation can be healthy if reclaimed |
| Post-GC floor | Retained heap after major collection | Likely live-object growth | Forced GC can distort behavior |

Write a release statement such as: "Under workload profile W for duration D, with throughput inside band T and no restarts, the last three steady-state windows must remain within the established RSS and heap retention allowances." Project-specific numbers belong in configuration and should be labeled as measured or illustrative.

## Freeze the workload before comparing memory

A memory comparison is invalid if the candidate processed more work, different payloads, or a different concurrency pattern. Keep data cardinality, request mix, payload sizes, cache state, dependency latency, virtual users, arrival rate, duration, runtime flags, container limit, and observability agents consistent.

Closed-model load, where each virtual user waits before starting the next iteration, can reduce throughput when the service slows. That may make a memory-heavy regression look stable because less work occurred. An arrival-rate workload can keep offered work steadier, but it may create backlog if the system cannot keep up. Whichever model you choose, record completed operations and dropped or failed work.

| Workload control | Baseline | Candidate acceptance |
|---|---|---|
| Request mix | Same weighted endpoints | Exact configured weights |
| Dataset | Immutable snapshot ID | Same snapshot ID and cardinality |
| Offered rate | Fixed profile | Same profile, no unexplained dropped work |
| Successful operations | Recorded distribution | Within declared comparison band |
| Dependency stubs | Same latency and response script | Same script checksum |
| Warm-up | Excluded fixed phase | Phase marker observed |
| Runtime configuration | Captured manifest | No unreviewed differences |

Do not normalize away a severe slowdown. Memory per successful operation can look better if throughput collapses, while users receive fewer responses. Gate throughput and latency independently, then use normalized memory as supporting evidence.

## Generate a steady, inspectable workload with k6

k6 can drive the application and report request metrics. System-under-test memory normally comes from the platform's process, container, or metrics endpoint, not from the k6 process. Keep a run ID and phase label so load results and memory samples can be joined.

The following k6 script uses documented scenario and threshold configuration. The endpoint mix and numeric thresholds are illustrative. Environment variables make the target and run identity explicit.

\`\`\`js
import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const failedChecks = new Rate('failed_checks');
const baseUrl = __ENV.BASE_URL;
const runId = __ENV.RUN_ID;

if (!baseUrl || !runId) {
  throw new Error('BASE_URL and RUN_ID are required');
}

export const options = {
  scenarios: {
    steady_memory: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '15m',
      preAllocatedVUs: 20,
      maxVUs: 80,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    failed_checks: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const headers = { 'X-Test-Run-Id': runId };
  const response = http.get(\`\${baseUrl}/api/catalog?category=tools\`, { headers });
  const ok = check(response, {
    'catalog returns 200': (res) => res.status === 200,
    'catalog response is JSON': (res) =>
      String(res.headers['Content-Type'] || '').includes('application/json'),
  });
  failedChecks.add(!ok);
}
\`\`\`

Run variables in shell using braces so names remain unambiguous:

\`\`\`bash
RUN_ID="memory_$(date -u +%Y%m%dT%H%M%SZ)"
BASE_URL="https://test.example.invalid"
export RUN_ID BASE_URL
k6 run memory-steady.js
\`\`\`

The reserved \`.invalid\` address is a placeholder and will not resolve, so replace it with the controlled test target. Store the k6 summary and environment manifest with the memory samples. The [k6 vs JMeter guide](/blog/k6-vs-jmeter-2026) can help choose the driver, but the drift method applies to either tool as long as workload and telemetry are comparable.

## Collect memory independently from the load generator

Sampling through the business endpoint at high volume can perturb the workload. Prefer existing metrics exported by the runtime, container platform, or observability stack. If a test-only diagnostics endpoint is used, protect it, keep it out of public deployments, and sample at a modest fixed interval.

For a Node service, \`process.memoryUsage()\` reports fields including \`rss\`, \`heapTotal\`, \`heapUsed\`, \`external\`, and \`arrayBuffers\`. Expose them through the application's approved metrics system. The following standalone collector expects a JSON diagnostics endpoint and writes newline-delimited JSON to standard output. Redirection by the test runner can save it without mixing logs.

\`\`\`js
import { setTimeout as delay } from 'node:timers/promises';

const metricsUrl = process.env.MEMORY_METRICS_URL;
const runId = process.env.RUN_ID;
const durationMs = Number(process.env.COLLECT_DURATION_MS || 900000);
const intervalMs = Number(process.env.COLLECT_INTERVAL_MS || 5000);

if (!metricsUrl || !runId) throw new Error('MEMORY_METRICS_URL and RUN_ID are required');
if (!Number.isFinite(durationMs) || !Number.isFinite(intervalMs) || intervalMs <= 0) {
  throw new Error('collector durations must be positive numbers');
}

const started = performance.now();
while (performance.now() - started < durationMs) {
  const response = await fetch(metricsUrl, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error(\`metrics request failed: \${response.status}\`);
  const sample = await response.json();
  process.stdout.write(JSON.stringify({
    runId,
    observedAt: new Date().toISOString(),
    elapsedMs: Math.round(performance.now() - started),
    ...sample,
  }) + '\\n');
  await delay(intervalMs);
}
\`\`\`

The collector emits one JSON object per line. Validate the endpoint schema before spreading data in a production collector, and include instance ID, process start time, deployment revision, and restart count. Without instance identity, a rolling restart can look like miraculous memory recovery.

For multi-process services, aggregate carefully. A sum shows total capacity consumption, while per-instance maximum and distribution reveal one leaking shard. Do not average away a single unbounded worker.

## Mark warm-up and analyze steady-state windows

Discarding an arbitrary first minute can be too little or too much. Prefer explicit phase markers and observable stabilization. Warm the service with a declared workload, then begin the measurement phase without restarting it. Record when compilation, connection pools, and expected caches settle. Keep the same rule for baseline and candidate.

Divide steady state into equal windows, such as one minute for an illustrative 15-minute test. For each window compute median and a high percentile of samples, completed operations, error rate, and latency. Medians reduce sensitivity to single scrape spikes. A high percentile retains capacity risk. The last-window median compared with the first steady window provides an intuitive retention delta.

\`\`\`ts
export type MemorySample = {
  elapsedMs: number;
  rssBytes: number;
  heapUsedBytes: number;
};

export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median requires at least one value');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function windowMedians(
  samples: MemorySample[],
  field: 'rssBytes' | 'heapUsedBytes',
  startMs: number,
  windowMs: number,
): number[] {
  const buckets = new Map<number, number[]>();
  for (const sample of samples) {
    if (sample.elapsedMs < startMs) continue;
    const bucket = Math.floor((sample.elapsedMs - startMs) / windowMs);
    const values = buckets.get(bucket) ?? [];
    values.push(sample[field]);
    buckets.set(bucket, values);
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, values]) => median(values));
}
\`\`\`

Require a minimum sample count per window. Missing samples often coincide with CPU starvation, metrics failures, or restarts, all of which should invalidate or fail the run rather than create a deceptively low median.

## Estimate slope without trusting one endpoint

An end-minus-start delta can be distorted if either window aligns with a garbage-collection trough or cache burst. A fitted slope uses all steady-state window summaries. Ordinary least squares is easy to understand but sensitive to outliers. A median of pairwise slopes, sometimes called a Theil-Sen style estimate, is more robust for small noisy series.

\`\`\`ts
import { median } from './memory-windows';

export function medianPairwiseSlope(values: number[], windowMinutes: number): number {
  if (values.length < 2) throw new Error('at least two windows are required');
  if (windowMinutes <= 0) throw new Error('windowMinutes must be positive');
  const slopes: number[] = [];
  for (let left = 0; left < values.length - 1; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const minutes = (right - left) * windowMinutes;
      slopes.push((values[right] - values[left]) / minutes);
    }
  }
  return median(slopes);
}

export function bytesToMiB(bytes: number): number {
  return bytes / (1024 * 1024);
}
\`\`\`

Slope is a screening metric, not proof that growth will remain linear. A bounded cache may rise steadily during a short test and plateau later. Conversely, a leak triggered once per rare operation may appear as steps. Plot the series, cache cardinality, operations, and GC events together when the gate fails.

## Establish the baseline from repeated clean runs

One "golden" run is fragile. Run the same known-good build several times from the same clean initial conditions and preserve each valid result. Use the median result as the center and a robust spread such as median absolute deviation. The run count and allowances are project decisions based on noise, cost, and risk.

Never silently update the baseline from every main-branch run. A slow leak can teach the baseline to accept itself. Baseline promotion should require a known build, valid environment manifest, successful functional and performance gates, and review of the memory chart.

| Baseline artifact | Why preserve it |
|---|---|
| Application image digest | Proves exact executable identity |
| Runtime and flags | Heap and GC behavior depend on them |
| Workload script checksum | Detects changed request mix |
| Dataset snapshot | Controls object and cache cardinality |
| Instance shape and limit | Changes allocator and GC pressure |
| Raw samples | Allows reanalysis with improved statistics |
| Window summaries and plots | Speeds human review |
| Completed work and latency | Proves comparable load |

The baseline should be segmented when architecture demands it. A worker processing image uploads has a different memory profile from an API pod serving cached reads. Combining them into one allowance erases actionable ownership.

## Implement a two-part drift gate

A practical gate combines relative and absolute allowances. Relative-only gates punish small services, where a modest allocation can look like a large percentage. Absolute-only gates ignore that the same increase has different impact near a small versus large memory limit. Require both to be exceeded before failing, or use separate warning and failure levels according to risk.

This TypeScript function compares a candidate summary with a baseline center. Values are configuration inputs, not hard-coded industry standards.

\`\`\`ts
type DriftGateInput = {
  baselineBytes: number;
  candidateBytes: number;
  absoluteAllowanceBytes: number;
  relativeAllowance: number;
};

export function exceedsDriftAllowance(input: DriftGateInput): boolean {
  if (input.baselineBytes <= 0) throw new Error('baselineBytes must be positive');
  const delta = input.candidateBytes - input.baselineBytes;
  const relative = delta / input.baselineBytes;
  return delta > input.absoluteAllowanceBytes && relative > input.relativeAllowance;
}

const MiB = 1024 * 1024;
const failed = exceedsDriftAllowance({
  baselineBytes: 400 * MiB,
  candidateBytes: 460 * MiB,
  absoluteAllowanceBytes: 40 * MiB,
  relativeAllowance: 0.1,
});

if (!failed) throw new Error('illustrative example should exceed both allowances');
\`\`\`

Add validity gates before memory comparison: no application restart, sufficient samples, acceptable errors, completed work within range, correct build and dataset, and no metrics discontinuity. A candidate that crashes and restarts can finish with less memory than baseline. It should fail validity, not pass memory.

## Distinguish leak, cache, fragmentation, and backlog

When drift is detected, first identify which memory components rise and whether they fall after pressure stops. Managed heap growth with an increasing post-GC floor suggests retained objects. Flat managed heap with rising RSS can point to native memory, allocator fragmentation, thread stacks, memory mappings, or page cache. Rising external memory in Node can implicate buffers or native modules.

Correlate with domain cardinality. If cache entries rise toward a configured maximum and then stop, the growth may be expected but still incompatible with the container limit. If queue depth rises with memory, the service may be retaining in-flight work because throughput is below offered rate. That is a capacity or backpressure failure, even if every object would eventually be released.

| Pattern | Candidate explanation | Next experiment |
|---|---|---|
| Heap floor rises after each GC | Live object retention | Heap snapshots at separated steady windows |
| Heap oscillates, RSS rises | Native allocation or fragmentation | Track external memory and allocator metrics |
| Memory follows cache entries then plateaus | Bounded cache warm-up | Run through expected cardinality ceiling |
| Memory follows queue depth | Backlog, slow dependency | Hold arrival rate below service capacity |
| One instance rises, peers stable | Shard-specific data or route | Compare request and tenant distribution |
| Sharp reset with process start time change | Restart or OOM | Inspect termination reason and invalidate run |

Avoid forcing garbage collection in the primary representative test unless production does so. Forced GC changes pause behavior and can hide pressure. A separate diagnostic run may invoke a runtime's supported explicit-GC mechanism to compare post-GC floors, but label it as diagnostic and preserve the normal run.

## Use heap snapshots as evidence, not as the load itself

Heap snapshots can pause a process, require extra memory, and alter timing. Capture them in an isolated reproduction or one disposable instance, not blindly across a shared load environment. Take comparable snapshots after warm-up and near the end, then compare retained object counts and paths to roots.

For Node, the built-in inspector and diagnostic facilities can capture heap information, but the operational method depends on runtime flags and deployment policy. Follow the official Node diagnostics guidance at https://nodejs.org/en/learn/diagnostics/memory/using-heap-snapshot. Never expose an unauthenticated snapshot trigger. Snapshots may contain secrets and user data, so store and delete them under the same controls as sensitive production artifacts.

Use allocation profiling when snapshots show too much noise. Retained-size dominators identify objects keeping large subgraphs alive. Common culprits include event listeners never removed, unbounded maps keyed by request or tenant, timers capturing request state, response buffers retained in logs, and promises held by a stalled queue.

## Reproduce a listener leak with a focused test

Suppose the service registers one listener per request but forgets to remove it on timeout. A long soak shows linear heap growth. Build a focused test that runs the lifecycle repeatedly and asserts listener count returns to baseline. This is faster and more diagnostic than relying on the whole performance gate.

\`\`\`ts
import { EventEmitter } from 'node:events';
import { expect, it } from 'vitest';

async function waitForMessage(bus: EventEmitter, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    const onMessage = () => finish();
    const timer = setTimeout(() => finish(), timeoutMs);
    const finish = () => {
      clearTimeout(timer);
      bus.off('message', onMessage);
      resolve();
    };
    bus.once('message', onMessage);
  });
}

it('releases listeners after timeout', async () => {
  const bus = new EventEmitter();
  for (let index = 0; index < 100; index += 1) {
    await waitForMessage(bus, 1);
    expect(bus.listenerCount('message')).toBe(0);
  }
});
\`\`\`

The iteration count is illustrative. This test proves one ownership rule but does not replace the soak, because production leakage may involve native resources, concurrency, error paths, or integrations absent from the unit test.

## Diagnose a realistic baseline drift failure

Imagine RSS grows by roughly the same amount in every steady window, while heap used returns to its earlier floor after garbage collection. Request rate and latency remain stable. The candidate introduced response compression changes, so the first suspicion is retained JavaScript buffers. Yet external and array-buffer metrics remain flat.

Compare native allocator and process metrics, then run a controlled version with the compression change disabled. RSS stabilizes. Heap snapshots show no growing dominator. This suggests native allocation or fragmentation associated with the compression path rather than live managed objects. The fix might require stream lifecycle correction, library investigation, or allocator tuning, but increasing the heap limit would not address the observed region.

In another run, both heap floor and an in-memory map's entry count rise exactly with unique customer IDs. The dataset introduced more tenants than the baseline even though request rate was identical. This run is not comparable, but it also exposes an unbounded cache keyspace. Repeat on the baseline dataset for release evidence, then add a separate cardinality test and bound or expire the cache.

The diagnosis sequence is: validate the run, localize the memory region, correlate with workload and domain cardinality, create one controlled differential experiment, then capture deeper artifacts. Guessing from RSS alone wastes time.

## What people get wrong about memory baselines

People often compare peak RSS from one baseline run with peak RSS from one candidate. Peaks are dominated by sampling alignment, garbage collection, startup, and one-time bursts. A distribution of post-warm-up windows across repeated runs is much more stable.

Another mistake is lowering workload variability by mocking everything. A fully mocked dependency can remove the slow responses and concurrency that retain buffers or requests in production. Use controlled dependencies, but preserve realistic latency, payload size, error scripts, and connection behavior.

The third mistake is "fixing" a failure by widening the baseline automatically. A baseline is evidence from a known acceptable build. Promotion needs review, especially after runtime, agent, instance-size, or load-script changes. Otherwise infrastructure noise and real regressions become indistinguishable.

## Relate memory drift to latency and capacity

Memory is not an isolated health dimension. Higher allocation rate can increase garbage-collection frequency and create tail pauses before a hard limit is reached. A growing queue can raise both memory and response time. Swapping or container pressure can amplify high-percentile latency.

Graph windowed memory beside throughput, error rate, GC pause time, CPU, queue depth, and p99 latency. The [p99 tail latency analysis guide](/blog/performance-testing-p99-tail-latency-analysis) helps interpret the slowest request population while this workflow identifies retention and capacity pressure. Do not claim causality from correlation alone, but use aligned changes to choose the next experiment.

If memory rises only during the highest-latency window, check whether in-flight requests and buffered bodies accumulate. If latency rises after memory approaches a container threshold, inspect GC and host pressure. If both change at a deployment boundary before load begins, compare runtime and observability configuration.

## Turn the method into a CI and scheduled gate

A short CI check can catch large leaks and validate lifecycle counters, but slow drift needs a longer scheduled or pre-release soak. Keep both based on the same versioned workload profile. The short run protects pull requests from obvious regressions. The longer run builds stronger slope and plateau evidence.

Produce a compact result artifact with validity, build identity, workload identity, completed operations, sample coverage, baseline center and spread, candidate window series, RSS and heap deltas, slopes, restart count, and gate decision. Link deeper charts and protected profiles in the CI system. Make failure output say whether the run was invalid or valid-but-regressed.

An AI coding agent can help generate parsers, window summaries, or route-focused reproductions. Give it the real sample schema and a tiny fixture, then verify calculations with hand-checkable examples. Never let generated analysis silently treat missing samples as zero or merge processes without instance identity.

## Frequently Asked Questions

### How long should a memory drift performance test run?

Long enough to pass expected warm-up and observe several comparable steady-state windows, plus any cache plateau or periodic job relevant to the service. There is no universal duration. Use historical curves and the suspected leak rate to choose it. Run a shorter PR gate for obvious retention and a longer scheduled soak for slow trends. Document the warm-up rule, sampling interval, window size, and minimum valid sample count so duration changes do not silently redefine the baseline.

### Is rising RSS proof of a memory leak?

No. RSS can rise because of allocator retention, native buffers, memory mappings, thread stacks, page behavior, expected caches, or live managed objects. Compare heap used, external memory, GC floors, cache cardinality, queue depth, and process restarts. Then run a controlled differential experiment and capture a heap or allocation profile when appropriate. RSS still matters for container capacity, even if the cause is fragmentation rather than unreachable objects that were never freed.

### Should memory be divided by request count?

Memory per successful operation is a useful supporting measure when completed work differs slightly, but it should not replace absolute memory, throughput, latency, and error gates. A slow candidate can process fewer requests and appear efficient by that ratio. First require comparable workload and acceptable service performance. Then use normalization to explain residual differences, especially for jobs whose natural unit is a message, file, or batch rather than an HTTP request.

### When should a team update the memory baseline?

Update it after a known acceptable change intentionally alters the memory profile, such as a runtime upgrade, new bounded cache, observability agent, or instance shape. Generate repeated clean runs with the frozen workload, verify functional and performance gates, review raw curves, and record the reason. Do not auto-promote every successful main build. Keep prior artifacts so a later investigation can distinguish an intentional step change from gradual unnoticed drift.
`,
};
