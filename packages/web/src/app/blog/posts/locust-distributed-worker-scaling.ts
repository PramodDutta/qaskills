import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Locust Distributed Worker Scaling: Prove the Load Generators Are Not Your Bottleneck',
  description: 'Locust distributed worker scaling with reproducible master-worker commands, capacity calibration, observability, failure diagnosis, and CI-ready load gates.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# Locust Distributed Worker Scaling: Prove the Load Generators Are Not Your Bottleneck

Locust distributed worker scaling means adding worker processes until the load-generation tier can produce the required request rate with measurable headroom, while keeping the workload model and target environment constant. The master coordinates user counts and aggregates statistics; workers run the simulated users and send results back. The master does not run user greenlets, so adding CPU to it does not directly add request-generation capacity.

The correct sizing method is experimental. Calibrate one worker against a controlled target, record requests per second, worker CPU, memory, network, event-loop responsiveness, failures, and response-time percentiles, then repeat with 2, 4, and more workers. A healthy generator tier scales its attainable throughput as workers are added until the system under test, a shared network path, test data, or another external dependency becomes the limit. User count alone is not proof of generated load.

If you are still choosing a load tool, the [k6 versus JMeter comparison for 2026](/blog/k6-vs-jmeter-2026) frames execution-model tradeoffs. When the worker fleet is trustworthy, use [performance testing p99 tail latency analysis](/blog/performance-testing-p99-tail-latency-analysis) to interpret the slowest requests without averaging away user pain.

## Draw the coordinator and worker boundary accurately

In a distributed run, the master tells workers when to spawn and stop users, exposes the web interface when enabled, and aggregates worker statistics. Each worker executes the \`User\` tasks in the locustfile. A single worker process generally uses one Python CPU core for user execution, which is why the Locust documentation recommends a worker process per processor core when CPU is the limiting resource.

The current official distributed-running documentation is https://docs.locust.io/en/stable/running-distributed.html. Pin and record the Locust release used by your project rather than silently inheriting a new environment image.

| Component | Runs simulated users? | Capacity concern | Evidence to collect |
| --- | --- | --- | --- |
| Master | No | aggregation, coordination, UI, network messages | CPU, memory, connected worker count, logs |
| Worker process | Yes | Python CPU, sockets, memory, client work | per-process CPU, RPS contribution, errors |
| Worker host | Through its processes | cores, NIC, file descriptors, NAT path | host CPU, network, socket and OS limits |
| System under test | Receives load | application and dependency saturation | server metrics, traces, queues, errors |
| Shared infrastructure | Indirectly | DNS, proxy, gateway, NAT, bandwidth | path-specific metrics and connection failures |

Do not call every container a worker "node" in dashboards if one host runs eight worker processes. Host-level and process-level capacity answer different questions. A process can saturate one core while the host dashboard reports only 12.5 percent total CPU on an eight-core machine.

## Start with a workload whose rate can be explained

Scaling tests are useless when the locustfile contains unpredictable setup, random endpoints, external authentication calls, or test data that exhausts after one minute. Begin with one representative transaction and deterministic data selection, then layer complexity back in.

This locustfile performs a read and validates a minimal response contract. It uses \`between\` to model an illustrative think-time range.

\`\`\`python
from locust import HttpUser, between, task


class CatalogUser(HttpUser):
    wait_time = between(0.8, 1.2)

    @task
    def read_product(self) -> None:
        product_id = (self.environment.runner.user_count % 100) + 1
        path = "/api/products/" + str(product_id)

        with self.client.get(
            path,
            name="GET /api/products/:id",
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure("expected HTTP 200")
                return

            try:
                payload = response.json()
            except ValueError:
                response.failure("response was not JSON")
                return

            if "id" not in payload or "name" not in payload:
                response.failure("missing id or name")
\`\`\`

The data selection is intentionally simple, but it can create a hot cache. If production traffic spans millions of products, use a seeded partition of valid IDs per worker. Do not generate random identifiers that mostly return 404, because that measures an error path rather than the intended endpoint.

Closed workload models such as this one are response-time dependent. Each user completes a request, waits, then repeats. A rough per-user rate is inversely related to response time plus think time. If the target slows, aggregate RPS can fall even though user count stays constant. That behavior is not necessarily worker saturation. Distinguish it from an open arrival-rate requirement and document which workload model the test represents.

## Prove local distribution before adding machines

First run multiple processes on one Linux or macOS host. The supported \`--processes\` option can start a master and the requested number of workers through \`fork\`; it is not available on Windows. For an explicit topology that mirrors later multi-host deployment, start master and workers separately.

\`\`\`bash
locust -f locustfile.py \\
  --master \\
  --headless \\
  --expect-workers 2 \\
  --expect-workers-max-wait 60 \\
  --host https://test-api.example.test \\
  --users 200 \\
  --spawn-rate 20 \\
  --run-time 5m \\
  --csv results/baseline
\`\`\`

In two other shells on the same host, launch one worker each:

\`\`\`bash
locust -f locustfile.py --worker --master-host 127.0.0.1
\`\`\`

\`\`\`bash
locust -f locustfile.py --worker --master-host 127.0.0.1
\`\`\`

The worker commands do not need \`--users\`, \`--spawn-rate\`, or \`--run-time\`; those values are controlled by the master. The master command's \`--expect-workers 2\` prevents a headless test from starting with only one connected worker. \`--expect-workers-max-wait 60\` bounds startup waiting so CI fails rather than hanging forever.

The \`--csv\` prefix produces statistics artifacts documented by Locust. Archive the summary, history, and failures files alongside logs and infrastructure metrics. File names and the full option catalog are documented at https://docs.locust.io/en/stable/config-options.html.

## Package an identical locustfile on every worker

Version skew is a dangerous source of false performance results. One worker may execute an older wait time or miss a newly added task while aggregate statistics look plausible. Package the locustfile, dependency lock, configuration, and interpreter into one immutable image. Label every run with the image digest or source commit.

For a local Docker Compose calibration, this complete file mounts the same code into all services and writes master CSV results to a host directory:

\`\`\`yaml
services:
  master:
    image: locustio/locust
    ports:
      - "8089:8089"
    volumes:
      - ./:/mnt/locust:ro
      - ./results:/results
    command:
      - -f
      - /mnt/locust/locustfile.py
      - --master
      - --headless
      - --expect-workers
      - "4"
      - --expect-workers-max-wait
      - "60"
      - --host
      - https://test-api.example.test
      - --users
      - "400"
      - --spawn-rate
      - "40"
      - --run-time
      - 5m
      - --csv
      - /results/distributed

  worker:
    image: locustio/locust
    volumes:
      - ./:/mnt/locust:ro
    command:
      - -f
      - /mnt/locust/locustfile.py
      - --worker
      - --master-host
      - master
    depends_on:
      - master
\`\`\`

Run it after creating the results directory:

\`\`\`bash
mkdir -p results
docker compose up --abort-on-container-exit --scale worker=4
\`\`\`

For a reproducible project, replace the unpinned image reference with a reviewed tag or digest already validated by your team. The example intentionally avoids inventing a version. Also remember that four containers do not guarantee four physical cores. Container CPU limits and host contention determine actual compute.

## Calibrate worker capacity without attacking production

A generator calibration target should be controlled and cheap. Options include a dedicated instance of the real service, a representative stub that can absorb more traffic than the generators, or a local endpoint designed solely to measure client overhead. Each answers a different question.

Use a staircase:

1. Warm the service and connections at a low user count.
2. Hold a plateau long enough to stabilize.
3. Increase users or target workload in declared steps.
4. Stop when worker CPU, errors, scheduling, memory, network, or the target becomes limiting.
5. Repeat at least once to detect environmental variance.

Record a row for each plateau:

| Workers | Users | Aggregate RPS | RPS per worker | Worker CPU | Target p95 | Failures | Interpretation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 200 | measured | measured | measured | measured | measured | baseline |
| 2 | 400 | measured | measured | measured | measured | measured | check near-linear gain |
| 4 | 800 | measured | measured | measured | measured | measured | locate first shared bottleneck |
| 8 | 1600 | measured | measured | measured | measured | measured | confirm headroom or saturation |

The table deliberately contains no promised throughput. Locust capacity depends on task code, HTTP client, payload parsing, TLS, response size, logging, wait time, network, and hardware. Published anecdotes are not sizing guarantees.

Use median RPS over the stable portion of each plateau, not the ramp. Report dispersion between repetitions. Exclude setup traffic or name it separately so authentication spikes do not distort business endpoint rates.

## Watch the load generators as closely as the target

A performance test has two systems under observation: the product and the generators. The generator dashboard should include, per worker process or host:

- CPU utilization and Locust CPU warnings.
- Resident memory and container memory throttling or termination.
- Network bytes, packets, retransmissions, and connection failures.
- Open file/socket pressure and OS limits.
- Worker connectivity and restarts.
- Requests per second contribution where available.
- DNS, TLS, and connection-pool errors.
- Clock synchronization across hosts.

The master needs its own monitoring because statistics aggregation and message handling can become busy at very large scale, even though it runs no users. Avoid heavy custom event listeners on the coordinator. Official Locust guidance notes that blocking custom message handlers can delay heartbeats and other messages; long handlers should not run synchronously in the control path.

| Signal combination | Likely limiter | Confirmation step |
| --- | --- | --- |
| worker core near saturation, target healthy | worker CPU | add workers at same total users or simplify task code |
| worker CPU low, target latency and queues rise | system under test | hold generators constant and inspect server traces |
| worker CPU low, connect errors rise on all hosts | shared network/NAT/DNS | compare paths and connection metrics |
| one worker contributes far less | noisy host, skewed data, or task issue | compare its CPU, logs, and assigned data |
| master busy, workers lose connection | coordination or custom-handler pressure | remove expensive listeners and inspect master resources |
| users reached but RPS falls as latency rises | closed-model feedback | compare cycle time and server saturation |

This is where QA engineers add unusual value: a graph is not a diagnosis. Correlate timestamps and change one variable at a time.

## Use a load shape that waits for users to arrive

Slow user initialization can make a time-only staircase advance before a stage reaches its intended population. A custom \`LoadTestShape\` can wait until the current user count reaches the stage target before moving on. Locust calls \`tick\` approximately once per second and stops when it returns \`None\`.

The following shape holds each plateau for its full duration only after the target population arrives:

\`\`\`python
from locust import LoadTestShape


class WorkerScaleShape(LoadTestShape):
    stages = (
        {"hold_for": 120, "users": 100, "spawn_rate": 20},
        {"hold_for": 120, "users": 300, "spawn_rate": 40},
        {"hold_for": 120, "users": 600, "spawn_rate": 60},
    )
    stage_index = 0
    plateau_started_at = None

    def tick(self):
        if self.stage_index >= len(self.stages):
            return None

        stage = self.stages[self.stage_index]
        target = stage["users"]
        current = self.get_current_user_count()

        if current < target:
            self.plateau_started_at = None
            return target, stage["spawn_rate"]

        now = self.get_run_time()
        if self.plateau_started_at is None:
            self.plateau_started_at = now

        if now - self.plateau_started_at >= stage["hold_for"]:
            self.stage_index += 1
            self.plateau_started_at = None
            if self.stage_index >= len(self.stages):
                return None
            next_stage = self.stages[self.stage_index]
            return next_stage["users"], next_stage["spawn_rate"]

        return target, stage["spawn_rate"]
\`\`\`

The explicit stage state keeps user startup outside the hold period. Do not claim plateau duration from wall-clock stage boundaries if user startup consumed most of the stage.

For worker-scaling experiments, you may prefer separate fixed-load runs over a shape. Separate runs make worker count, steady window, and artifact naming obvious. Shapes are most useful after basic topology and capacity are proven.

## Partition credentials and data without accidental collisions

Distributed workers execute the same code. If every simulated user chooses the first account from the same list, the test measures lock contention, duplicate login, rate limiting, or shared-cart corruption that may not represent production.

Safe data strategies include:

- Generate independent accounts before the timed run and distribute them deterministically.
- Allocate non-overlapping ID ranges to worker identities through an external manifest.
- Use a concurrency-safe queue service outside the request path for one-time credentials.
- Model deliberate sharing only for scenarios where users truly share a resource.

Do not pop records from a local file and assume workers coordinate. Every process has its own memory and typically its own file view, so each can consume the same first record. Similarly, a module-level counter is process-local.

When test data must be sent from master to workers, Locust supports custom messages. Keep the payload small, register handlers consistently, acknowledge allocation, and do the transfer before the timed load. The distributed documentation includes a supported messaging example. For large datasets, immutable sharded files or a dedicated data service are easier to audit than a giant coordinator message.

Test data also affects scaling curves. A single cached product ID can make eight workers look excellent while a realistic high-cardinality mix increases database work. Record the distribution seed and cardinality with every run.

## Diagnose the "more workers, same RPS" failure

Suppose a two-worker run produces the expected load. The team scales to eight workers and quadruples users, but aggregate RPS barely moves. They conclude that Locust cannot scale.

Start with evidence:

1. Did all eight workers connect before the run? Check master logs and the expected-worker gate.
2. Did actual user count reach the target? Slow \`on_start\` work may delay spawning.
3. Are individual worker cores saturated? A hot core with idle host capacity means too few processes or CPU limits.
4. Did response time rise as RPS flattened? In a closed model, target slowdown lengthens every user cycle.
5. Did connection or DNS errors increase? A shared NAT gateway or resolver can cap the fleet.
6. Are all workers executing identical code and data partitions?
7. Did the target service hit a concurrency, database, queue, or downstream limit?

In one realistic outcome, worker CPU stays below its danger zone, all workers remain connected, user count reaches target, server p95 triples, and the database connection pool is fully occupied. The system under test is the limiter. Adding workers merely creates more waiting users.

In another outcome, server metrics remain flat, each worker process pins one core, parsing a multi-megabyte JSON response dominates profiles, and RPS rises when another process is added. The generator is the limiter. Reduce unnecessary response parsing only if the real user behavior does not require it, or add workers with measured headroom.

The same symptom has opposite remedies. That is why a worker count without generator and server telemetry is not a capacity result.

## What people get wrong about distributed scaling

The most damaging mistake is equating simulated users with requests per second. A thousand users waiting on five-second responses produce a different rate from a thousand users receiving 100-millisecond responses. Wait behavior changes it again.

Other recurring errors include:

- Running one worker process on a many-core host and calling the entire host saturated.
- Starting a headless master without \`--expect-workers\`, so partial capacity begins the test.
- Passing load parameters to workers and assuming they override the master.
- Scaling containers beyond available cores, which increases scheduling contention rather than capacity.
- Comparing a one-worker test and an eight-worker test against different target deployments.
- Leaving verbose per-request logging enabled and measuring log I/O.
- Performing expensive token generation or database setup inside every timed user start.
- Assuming aggregate statistics prove every worker contributes evenly.
- Changing users, workers, test data, and task weights in one run comparison.
- Treating a CPU warning as a product failure instead of generator evidence.

A subtler error is distributing too early. If a single-worker script is not repeatable, eight copies multiply uncertainty. Establish response validation, data lifecycle, naming, and stable local measurements first.

## Put a bounded distributed smoke test in CI

CI should not be your only performance environment, but it can prove that the topology starts, all workers connect, representative requests succeed, and artifacts are emitted. Keep the run small and use a dedicated target.

This shell script starts one master and two workers, waits through Locust's expected-worker mechanism, and propagates the master exit status. It assumes Locust is already installed and \`TEST_HOST\` is defined by CI.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p results

locust -f locustfile.py \\
  --master \\
  --headless \\
  --expect-workers 2 \\
  --expect-workers-max-wait 45 \\
  --host "\${TEST_HOST}" \\
  --users 20 \\
  --spawn-rate 5 \\
  --run-time 90s \\
  --csv results/ci \\
  --only-summary &
master_pid=$!

locust -f locustfile.py --worker --master-host 127.0.0.1 &
worker_one_pid=$!

locust -f locustfile.py --worker --master-host 127.0.0.1 &
worker_two_pid=$!

set +e
wait "\${master_pid}"
master_status=$?
set -e

kill "\${worker_one_pid}" "\${worker_two_pid}" 2>/dev/null || true
wait "\${worker_one_pid}" 2>/dev/null || true
wait "\${worker_two_pid}" 2>/dev/null || true

exit "\${master_status}"
\`\`\`

This script uses braced shell variables so names cannot be consumed greedily. In a mature harness, add a trap so interrupted jobs also stop children, use CI-native process or container supervision, and parse artifacts in a separate gate. Locust provides failure-exit options in its configuration catalog, but choose thresholds explicitly from your service objective and validated release, rather than copying undocumented flags from a blog.

Nightly or pre-release tests should own the longer scaling curve. Keep CI focused on wiring and gross regressions so ordinary build noise is not mistaken for capacity science.

## Convert calibration into a worker-sizing decision

Once a stable plateau gives measured sustainable RPS per worker, size for the required generator rate and add headroom for variation. Do not simply divide peak RPS by the best one-minute number. Use the lower sustainable capacity observed under representative payloads, response validation, TLS, and data mix.

Document:

- Required aggregate request rate and workload mix.
- Measured sustainable rate per worker process.
- Chosen worker process count and host distribution.
- CPU and network headroom at the chosen point.
- Master resources and expected-worker count.
- Image digest, locustfile commit, target version, and data seed.
- Steady-state duration and excluded warm-up window.
- Abort conditions for generator and target safety.

If one host failure would remove too much capacity, spread workers across failure domains. If all workers egress through one NAT gateway, host redundancy does not remove that shared limit. Topology diagrams should include the network path, not only Locust boxes.

Finally, rerun a small calibration after meaningful changes to Locust, Python, the HTTP client choice, task code, payload handling, container limits, or worker instance type. Historical per-worker capacity is not permanent.

## Frequently Asked Questions

### How many Locust workers should run on each machine?

Start with one worker process per available processor core, as the official distributed guidance recommends for accessing CPU capacity, then measure. Container limits, hyperthreading, network bandwidth, memory, task complexity, and neighboring workloads can make the practical count lower. More processes than usable cores may add contention without increasing RPS. Track process-level CPU as well as host CPU, because one saturated process can hide inside a low whole-host average. Capacity testing, not core count alone, determines the final topology.

### Why does adding Locust workers sometimes reduce throughput?

Additional workers can expose a shared limit: the target slows, a database pool fills, a NAT gateway exhausts connections, DNS struggles, or the worker hosts contend for the same cores. In Locust's closed user model, increased response time lengthens each user's cycle and can lower RPS. Compare connected workers, actual users, per-worker CPU, connection errors, target latency, and server saturation on the same timeline. Revert one change at a time before blaming coordination overhead.

### Should the Locust master also generate users?

No. In distributed mode, the master coordinates spawning, stopping, and statistics aggregation, while worker processes run users. Plan generator capacity from workers only. The master still needs adequate CPU, memory, and network resources, especially for large fleets or custom message handlers, because delayed coordination can disrupt the run. Monitor it as a control-plane component, but do not count its cores in the worker throughput budget unless separate worker processes also run on that host.

### How do I know whether a performance failure belongs to Locust or the application?

Correlate both sides. Worker-core saturation, Locust CPU warnings, flat server load, and improved RPS after adding worker processes point toward generator limits. Low worker CPU combined with rising server queues, resource saturation, response times, and errors points toward the application or its dependencies. Connection failures across workers with quiet application metrics suggest shared infrastructure. Repeat a controlled plateau, preserve the workload and target, and use per-worker plus server telemetry before assigning the defect.
`,
};
