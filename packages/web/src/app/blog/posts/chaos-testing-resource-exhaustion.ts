import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chaos Testing Resource Exhaustion Without Crashing the Test Environment',
  description: 'Apply chaos testing resource exhaustion to expose memory, CPU, disk, connection, and process-limit failures with bounded, repeatable QA workflows.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Chaos Testing Resource Exhaustion Without Crashing the Test Environment

Chaos testing resource exhaustion intentionally constrains or consumes a finite resource, such as memory, CPU, disk space, file descriptors, database connections, or process slots, then verifies that the system degrades predictably and recovers. A responsible test uses an isolated target, one resource fault at a time, a control workload, hard abort conditions, automatic cleanup, and assertions on customer-visible behavior.

The objective is not to make a graph turn red or force an out-of-memory kill. It is to discover whether admission control, deadlines, backpressure, queues, health checks, and recovery behave as designed before organic load finds the limit. QA engineers should treat resource exhaustion as a contract test for scarcity. The contract describes which requests remain available, which are rejected, how quickly rejection happens, whether data stays correct, and how the service returns to steady state.

## Translate “Low Resources” Into a Falsifiable Contract

Begin with a resource budget and a system invariant. “Test high CPU” lacks a boundary, workload, and outcome. “When the catalog service receives one CPU core and the synthetic workload reaches 40 concurrent reads, the health endpoint remains responsive, requests either complete within the test deadline or return 503, and no partial cache records are written” is measurable.

The budget should identify the resource pool. A process heap, container memory limit, node disk, database connection pool, and tenant quota have different owners and failure mechanisms. Measuring host free memory while a container is limited by its control group can lead to the wrong diagnosis.

| Resource | Injection variable | Safety invariant | Graceful degradation evidence |
|---|---|---|---|
| Memory | Container limit or bounded allocator | No corrupt or partial writes | Rejection, restart policy, heap and RSS evidence |
| CPU | CPU quota plus controlled workload | No duplicate processing | Bounded latency, queue depth, event-loop delay |
| Disk space | Small isolated filesystem | Durable writes are atomic | Clear storage error, no truncated committed object |
| File descriptors | Low process limit or open-handle fixture | Existing connections are not silently corrupted | Fast refusal, handle count returns after cleanup |
| Database connections | Small pool plus held connections | Transactions preserve consistency | Pool wait timeout, 503 or retryable response |
| Process IDs | Isolated process limit | Parent service remains controllable | Spawn failure is handled and children are reaped |

For every row, define an expected customer result. A server can remain alive while all requests hang, which is not resilience. Conversely, a supervised process can restart quickly with no lost work, which may satisfy the contract even though a container exited. “Process did not crash” is rarely the complete oracle.

Use an experiment manifest that is reviewable and machine-checkable:

\`\`\`yaml
name: image-worker-memory-pressure
target: image-worker-canary
resource:
  kind: memory
  limit_mebibytes: 256
workload:
  concurrent_jobs: 4
  fixture: medium-jpeg
steady_state:
  accepted_job_completes: true
  duplicate_outputs: 0
abort:
  production_traffic_detected: true
  control_error_rate_percent: 1
recovery:
  queue_drains_seconds: 120
\`\`\`

The numbers are illustrative. Set them from capacity tests, service objectives, and the cost of data loss. The manifest should also name the owner, environment, duration, cleanup action, and evidence location when used by a real team.

## Establish a Baseline Before the Fault

Resource tests need a baseline under the same workload. Record throughput, latency distribution, error classification, queue depth, resource usage, and a business invariant before injection. Continue sending an identical control workload to an unmodified instance if the environment supports it. Without the control, an unrelated database outage can be misattributed to the experiment.

Use a small probe that emits durations and validates response semantics. This Node.js program uses only built-in APIs and can run against a local or ephemeral target:

\`\`\`js
const { performance } = require('node:perf_hooks');

async function probe(baseUrl, requests) {
  const results = [];
  for (let index = 0; index < requests; index += 1) {
    const started = performance.now();
    try {
      const response = await fetch(\`\${baseUrl}/ready\`, {
        signal: AbortSignal.timeout(2_000),
      });
      results.push({
        status: response.status,
        durationMs: performance.now() - started,
      });
    } catch (error) {
      results.push({
        status: 0,
        durationMs: performance.now() - started,
        error: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
  return results;
}

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:8080';
probe(baseUrl, 20).then((results) => {
  process.stdout.write(\`\${JSON.stringify(results)}\\n\`);
});
\`\`\`

Run the same probe before, during, and after the fault. Preserve individual results, not only an average. Averages can hide a bimodal failure in which half the calls are fast and half time out. Assert that every accepted response has a valid body and that timeout errors are not mislabeled as application rejections.

## Constrain Memory at the Container Boundary

Memory exhaustion tests are safest when a runtime limit contains the blast radius. Docker documents \`--memory\` for a hard memory limit. Run the target in an isolated test network, apply a known limit, and keep the load generator outside the constrained container so it can observe and clean up.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

container_name="resource-test-api"
cleanup() {
  docker rm --force "\${container_name}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach \\
  --name "\${container_name}" \\
  --memory 256m \\
  --publish 127.0.0.1:18080:8080 \\
  example/resource-test-api:local >/dev/null

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent http://127.0.0.1:18080/ready >/dev/null; then
    break
  fi
  if [ "\${attempt}" -eq 10 ]; then
    exit 1
  fi
  sleep 1
done

node probe.js http://127.0.0.1:18080 > memory-results.json
docker inspect "\${container_name}" > memory-container-inspect.json
\`\`\`

The image name is a placeholder for a real image built by your project. The script does not allocate memory by magic, so the application or a dedicated test workload must process fixtures that exercise its normal allocation path. Prefer a representative image decode, report build, cache fill, or batch job over an endpoint that blindly allocates bytes. Production-like code paths reveal amplification, buffering, and cleanup defects that a synthetic allocator misses.

Capture both resident memory and runtime heap metrics. In Node.js, \`process.memoryUsage()\` reports fields including RSS and heap usage. A native buffer can grow RSS without a corresponding JavaScript heap increase. That difference is diagnostic rather than contradictory.

\`\`\`ts
import { createServer } from 'node:http';

const server = createServer((request, response) => {
  if (request.url !== '/diagnostics/memory') {
    response.writeHead(404).end();
    return;
  }

  const memory = process.memoryUsage();
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
  }));
});

server.listen(9090, '127.0.0.1');
\`\`\`

Expose diagnostic endpoints only in controlled environments or protect them using the same operational controls as other sensitive telemetry. The test should fail if memory rises without returning near its post-warmup baseline after the workload and an appropriate settling period. Do not force garbage collection and call that proof of production recovery unless the production runtime is configured to do the same.

## Separate CPU Saturation From Event-Loop Blocking

CPU pressure can come from useful parallel work, runtime collection, native compression, encryption, or one blocking callback. The same host utilization can produce very different customer outcomes. Pair CPU utilization with queue length, request concurrency, and event-loop delay for Node.js services.

The following server publishes event-loop delay percentiles using a documented Node.js performance hook. It also includes a bounded CPU route for an isolated experiment:

\`\`\`js
const http = require('node:http');
const { monitorEventLoopDelay } = require('node:perf_hooks');

const delay = monitorEventLoopDelay({ resolution: 20 });
delay.enable();

http.createServer((request, response) => {
  if (request.url === '/cpu-work') {
    let result = 0;
    for (let index = 0; index < 5_000_000; index += 1) {
      result = (result + index) % 1_000_003;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ result }));
    return;
  }

  if (request.url === '/event-loop') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      p50Ms: delay.percentile(50) / 1e6,
      p99Ms: delay.percentile(99) / 1e6,
    }));
    delay.reset();
    return;
  }

  response.writeHead(404).end();
}).listen(8080, '0.0.0.0');
\`\`\`

The loop count is illustrative and machine-dependent. Calibrate workload by observed saturation, not by assuming that a fixed iteration count produces a particular percentage. A container quota can make the experiment repeatable across similarly provisioned runners:

\`\`\`bash
docker run --rm \\
  --cpus 0.50 \\
  --publish 127.0.0.1:18080:8080 \\
  example/resource-test-api:local
\`\`\`

Keep readiness semantics deliberate. If readiness fails whenever latency increases slightly, orchestration may remove every replica at once, worsening the outage. If readiness always succeeds while the process cannot serve bounded requests, traffic keeps arriving and queues grow. Test the probe contract under pressure and confirm that the load balancer has a viable healthy path.

## Force Connection-Pool Scarcity at the Pool, Not the Database

Database connection exhaustion is best tested first with a deliberately small application pool and held transactions in a disposable database. Reducing the pool affects only the target service. Exhausting the database's global connection limit can disrupt unrelated applications and administration access.

Model the expected pool behavior before involving a driver. This runnable queue demonstrates a fixed capacity with a bounded wait:

\`\`\`ts
import { setTimeout as delay } from 'node:timers/promises';

class PermitPool {
  private active = 0;

  constructor(private readonly capacity: number) {}

  async run<T>(operation: () => Promise<T>, waitMs: number): Promise<T> {
    const deadline = Date.now() + waitMs;
    while (this.active >= this.capacity) {
      if (Date.now() >= deadline) throw new Error('pool wait timeout');
      await delay(5);
    }

    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
    }
  }
}

const pool = new PermitPool(1);
const held = pool.run(async () => {
  await delay(100);
  return 'first';
}, 20);

await delay(5);
const rejected = pool.run(async () => 'second', 20);

const outcomes = await Promise.allSettled([held, rejected]);
if (outcomes[0].status !== 'fulfilled') throw new Error('holder failed');
if (outcomes[1].status !== 'rejected') throw new Error('waiter should time out');
\`\`\`

In a real integration test, use the pool size and acquisition timeout options documented by your database driver. Hold exactly enough connections to fill the configured application pool, send one more request, and assert a bounded, classified failure. Then release the holders and prove the next request succeeds. The recovery assertion catches leaked clients and missing \`finally\` blocks.

| Observation | Likely cause | Next evidence |
|---|---|---|
| Pool wait grows, database sessions equal pool size | Expected local saturation | Acquisition timeout and request status |
| Database sessions keep growing after requests finish | Client leak | Checkout and release call paths |
| Requests hang beyond the HTTP deadline | Missing cancellation or timeout mismatch | Trace spans and socket state |
| Retry traffic multiplies pool demand | Unbounded or synchronized retries | Attempt count and retry delay distribution |
| Control instance also fails | Shared database bottleneck | Database resource and lock metrics |

## Validate Disk-Full Behavior With an Isolated Filesystem

Disk exhaustion can corrupt artifacts when code writes directly to a final path and fails midway. The robust pattern writes to a temporary file on the same filesystem, flushes as required by the durability contract, and renames atomically after the full payload is present. A disk-full test must inspect the destination, not only the returned error.

At the unit boundary, inject a writer that fails after a known number of bytes. This tests cleanup deterministically without filling any device:

\`\`\`ts
import { strict as assert } from 'node:assert';

class LimitedWriter {
  private written = 0;

  constructor(private readonly limit: number) {}

  write(chunk: Buffer): void {
    if (this.written + chunk.length > this.limit) {
      throw new Error('ENOSPC');
    }
    this.written += chunk.length;
  }

  byteCount(): number {
    return this.written;
  }
}

function writeReport(writer: LimitedWriter, chunks: Buffer[]): void {
  for (const chunk of chunks) writer.write(chunk);
}

const writer = new LimitedWriter(5);
assert.throws(
  () => writeReport(writer, [Buffer.from('abc'), Buffer.from('def')]),
  /ENOSPC/,
);
assert.equal(writer.byteCount(), 3);
\`\`\`

This is not a substitute for an isolated filesystem integration test because real write buffering, metadata allocation, and rename behavior matter. It does establish the application's failure contract quickly. At the higher layer, mount a small disposable volume into the target container, prefill it to a controlled threshold, run the write, and delete the container and volume after evidence collection. Never fill the CI host root filesystem.

Assert four outcomes: the operation returns a documented error, an earlier committed artifact remains readable, no partial final artifact is visible, and a write succeeds after space is restored. Also inspect log rotation. A service facing a full log volume can enter a loop in which error reporting consumes the remaining space.

## Test File-Descriptor and Process Limits Carefully

File descriptor exhaustion often appears as refused sockets, failed file opens, or accept-loop errors. Process exhaustion appears when workers cannot spawn. Both can make cleanup tools fail, so the controller must live outside the constrained target. Linux process limits and container options vary by environment. Use only controls supported by your runner and container engine.

For an application-level descriptor test, deliberately cap a connection pool or wrap the open operation, rather than opening arbitrary files until the host fails. For a container experiment, Docker documents \`--ulimit\` and \`--pids-limit\`. Apply them to an ephemeral target and verify the actual limits inside it before load begins.

\`\`\`bash
docker run --rm \\
  --ulimit nofile=128:128 \\
  --pids-limit 64 \\
  --publish 127.0.0.1:18080:8080 \\
  example/resource-test-api:local
\`\`\`

Do not assert that every operating system returns the same error text. Assert the application's normalized failure category and observable outcome. Error numbers, wording, and whether a library retries can differ. Preserve the original error in restricted diagnostic evidence for later analysis.

## Diagnose a Retry Storm Caused by Pool Exhaustion

A common failure unfolds like this: the database slows, the service's small connection pool fills, requests wait, and an upstream client reaches its deadline. The client retries immediately. The original request continues running because cancellation was not propagated, so each retry adds work. Pool wait increases, the queue grows, health checks time out, and orchestration restarts healthy-but-busy instances.

The diagnosis needs a timeline across layers:

1. Confirm the first constrained resource, such as pool permits, reached its limit before request failures rose.
2. Compare inbound logical operations with physical attempts. A widening ratio indicates retries.
3. Check whether timed-out upstream requests remain active downstream.
4. Inspect pool acquisition duration separately from query duration.
5. Verify whether readiness changes removed capacity during the pressure window.
6. Release held connections and observe whether the queue drains without restart.

The fix is not automatically “increase the pool.” A larger pool may push overload into the database and increase contention. Coordinated deadlines, cancellation propagation, bounded queues, retry budgets, jitter, and admission control usually matter more. Capacity changes should follow measured database headroom.

## What People Get Wrong About Resource Exhaustion

The first mistake is maximizing destruction. Exhausting every resource simultaneously may resemble a severe incident, but it provides weak diagnostic information. Start with one constrained pool and a repeatable workload. Combine faults only after individual responses are understood.

The second mistake is generating pressure from inside the target and trusting its report. When the target is starved, its telemetry may be delayed or lost. Keep the controller, abort logic, and at least one observer outside the constrained boundary. The third mistake is checking only recovery of process health. Prove that queues drain, leases release, temporary files disappear, connection counts return, and a new business operation completes exactly once.

Another error is confusing a leak with a legitimate cache or warmup plateau. Track the resource through repeated work and recovery cycles. A leak grows across cycles or fails to return near a stable post-warmup band. One snapshot cannot establish that trend. Finally, avoid presenting illustrative thresholds as universal capacity recommendations.

## Assemble a Layered Automation Strategy

Resource exhaustion belongs in several test layers. Fast tests inject failures at allocation and acquisition boundaries. Container tests apply enforceable limits. System exercises validate routing, alerts, scaling, and recovery. Each layer answers a different question.

| Test layer | Main question | Typical cadence | Required cleanup |
|---|---|---|---|
| Unit or component | Does code classify scarcity and release resources? | Every pull request | Reset fake pools and writers |
| Container integration | Does the runtime behave under a hard local limit? | Pull request or nightly | Remove container and disposable volumes |
| Service environment | Do retries, queues, and health checks coordinate? | Nightly or pre-release | Restore configuration and drain workload |
| Operational game day | Do people, alerts, and automation control blast radius? | Planned | Verify service and data steady state |

Choose a runner based on the boundary. Vitest is effective for TypeScript components and small integrations. Playwright is useful when exhaustion must surface as a clear, recoverable UI state. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps define that split. When a browser test checks a degraded banner or retry control, follow the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) so DOM refactoring does not masquerade as resilience failure.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when you want agents to reuse a reviewed workflow. Whether executed by a person or an AI coding agent, require the experiment definition, blast-radius check, abort thresholds, cleanup result, and evidence summary in the test output.

## Use Repeated Pressure Cycles to Separate Leaks From Capacity Limits

One climb toward a limit cannot tell you whether the service has a leak, a delayed cleanup path, or a correctly retained cache. Run several identical pressure and recovery cycles while keeping input size and concurrency fixed. Capture the resource level before work, at peak, after the queue drains, and after a documented settling period. Compare the post-cycle floors rather than expecting every runtime to return to its initial startup value.

A capacity limit is repeatable: each cycle approaches a similar peak and returns to a stable post-warmup band. A leak produces a rising floor, growing handle count, or progressively earlier failure. Delayed cleanup returns eventually but may violate the recovery objective. A bounded cache rises until its intended capacity and then stabilizes. Confirm the hypothesis with application evidence, such as active pool leases or cache entries, rather than assigning a cause from RSS alone.

Keep the experiment workload constant while diagnosing the trend. If job sizes or concurrency grow in every cycle, rising use is expected and the result is ambiguous. Conversely, include one deliberately larger final cycle after the stable test to confirm admission control at the reviewed boundary. Report both the resource measurements and the business result for every cycle, since stable memory with lost jobs is still a failure.

When a process restarts between cycles, treat that as a separate recovery mode. Record exit reason, restart count, unacknowledged work, and time until readiness. Do not combine pre-restart and post-restart samples into a smooth line that hides the discontinuity. The restart may be the expected containment mechanism, but its correctness still depends on durable work and idempotent side effects.

## Put Abort Logic Outside the Starved Component

An abort condition is useful only if it can still execute when the fault reaches its target. A cleanup hook inside a memory-starved process may never allocate enough memory to run. A disk-full container may be unable to write its own recovery marker. A CPU-saturated event loop may not answer the command that asks it to stop. Place the experiment controller on an unconstrained runner, give it a hard deadline, and make resource restoration possible without cooperation from the target.

Monitor both the target and the surrounding environment. Abort immediately if production traffic reaches the canary, a control instance degrades, shared database health changes, or a safety invariant such as duplicate processing fails. Availability thresholds can allow a short observation window, but data corruption and isolation breaches should stop injection at the first confirmed occurrence. Document which signals are sampled and the longest detection delay, because a one-minute alert cannot enforce a five-second blast-radius promise.

Cleanup must be idempotent. The controller should be able to release held connections, stop load, remove the constrained container, and detach disposable storage even if an earlier step already ran. Follow cleanup with verification rather than assuming a successful command restored service. Check the actual container state, pool usage, disk availability, queue depth, and a fresh synthetic operation.

Design for controller failure too. CI cancellation, network loss, or a crashed laptop should not leave a fault active indefinitely. Use platform-enforced job timeouts, short-lived environments, expiring fault configuration, and an independent cleanup path appropriate to the test platform. Avoid a test-only fault switch that remains enabled until somebody remembers to turn it off.

Evidence collection belongs outside the target for the same reason. Stream or scrape important signals during the run instead of copying them only afterward. If the container is killed for exceeding memory, its final local logs may be incomplete. External request records, supervisor exit status, queue acknowledgements, and business ledgers can still prove what happened. This design makes a destructive-looking experiment bounded, attributable, and recoverable.

## Frequently Asked Questions

### Which resource should I exhaust first?

Start with the resource most closely tied to a known risk or recent incident, and choose the narrowest controllable pool. For a database timeout problem, shrink and fill the application's connection pool before touching the database-wide limit. For upload corruption, inject write failure before creating a small isolated filesystem. This produces a clearer diagnosis and safer cleanup. Use production telemetry and architecture diagrams to identify which finite pool actually governs the customer path.

### Should a service restart when memory is exhausted?

It depends on the service contract and supervisor design. A fast supervised restart can be acceptable for a stateless worker if in-flight jobs are retried idempotently and readiness prevents early traffic. It is not acceptable if acknowledged work disappears, side effects duplicate, or every replica restarts together. Test the full outcome: exit classification, restart delay, work recovery, duplicate count, readiness, and post-recovery latency. “The container came back” proves only one step.

### How can I test disk exhaustion without filling the CI machine?

First inject a deterministic failing writer to verify error handling and partial-file cleanup. For filesystem semantics, mount a deliberately small disposable volume into an ephemeral container and target only that mount. Keep the load generator and cleanup controller outside it. Never consume the runner's root filesystem. After the fault, remove filler data, verify a fresh write, preserve diagnostic evidence, and delete the isolated volume according to your CI retention policy.

### What proves that a resource exhaustion test recovered successfully?

Recovery requires more than a green health endpoint. The constrained resource should return to its expected post-warmup range, queued work should drain within a bound, held permits and handles should be released, and new business operations should complete correctly. Compare control and fault cohorts, check for duplicate or missing side effects, and verify alert resolution. If a restart is part of the design, also confirm readiness gates traffic until dependencies and internal state are usable.
`,
};
