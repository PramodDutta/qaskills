import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Grid Docker Scaling Guide for Reliable Parallel Tests',
  description: 'Use this Selenium Grid Docker scaling guide to size browser nodes, control parallel sessions, isolate failures, and build observable CI capacity.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Selenium Grid Docker Scaling Guide for Reliable Parallel Tests

A scalable Selenium Grid in Docker is not simply a Hub plus as many browser containers as the host can start. Reliable capacity comes from matching test-runner concurrency to registered browser slots, reserving enough CPU and memory per session, isolating downloads and logs, and measuring queue time separately from browser execution time. Scale only after a small Grid can complete the suite repeatedly without infrastructure failures.

This Selenium Grid Docker scaling guide builds that model from a single node to multiple browser services. The workflow uses official Selenium container images, Docker Compose, Selenium's WebDriver endpoint, and the Grid status endpoint. It also explains the practical ceiling: adding containers to an exhausted host increases contention and can make the suite slower.

## Translate Suite Demand Into Browser Slots

Start with the unit that Grid actually schedules: a WebDriver session. A test worker normally holds one session for some duration, then releases it. If the runner launches 20 workers while the Grid exposes eight compatible slots, twelve requests must wait. That is healthy backpressure if intentional, but a timeout risk if the runner expects immediate creation.

Measure three durations separately:

1. Queue time, from requesting a session until Grid assigns a slot.
2. Session startup time, from assignment until the first command can run.
3. Test execution time, from the first command through \`quit\`.

The required concurrency is a planning estimate, not a Docker setting. If 600 isolated tests average 45 seconds and the target wall time is 15 minutes, the rough lower bound is 30 simultaneous sessions: \`600 × 45 / 900 = 30\`. Add setup and teardown time, uneven test lengths, retries, and a safety margin before committing to hardware.

| Input | Example | Capacity consequence |
|---|---:|---|
| Test cases | 600 | Total work to schedule |
| Mean session-held time | 45 seconds | Better input than assertion-only time |
| Target duration | 900 seconds | Delivery constraint |
| Mathematical minimum | 30 slots | Assumes perfect balancing |
| Planned headroom | 20 percent | Absorbs skew and startup variance |
| Initial target | 36 slots | Must still fit actual compute resources |

Do not multiply node count by a guessed maximum session value and call it capacity. A slot that technically exists but is starved of memory is not useful. Browser crashes, renderer hangs, and delayed commands will turn nominal parallelism into retries.

## Establish a Small Hub-and-Node Topology

Selenium Grid 4 can run in several modes. For a transparent Compose deployment, a Hub receives WebDriver requests and browser node containers register their capabilities through the Grid event bus. The browser nodes are replaceable workers. The Hub is the coordination point exposed to test runners.

This baseline uses the official Hub, Chrome node, and Firefox node images. Pin an image tag approved by your organization instead of relying on a floating tag in a production pipeline. The placeholders below make that decision explicit rather than inventing a current version.

\`\`\`yaml
services:
  selenium-hub:
    image: selenium/hub:\${SELENIUM_IMAGE_TAG}
    ports:
      - '4444:4444'

  chrome:
    image: selenium/node-chrome:\${SELENIUM_IMAGE_TAG}
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443

  firefox:
    image: selenium/node-firefox:\${SELENIUM_IMAGE_TAG}
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
\`\`\`

Only port 4444 needs to be published to a runner on the Docker host. Hub-to-node traffic uses the Compose network. Avoid publishing every browser node unless a debugging workflow genuinely requires direct access. A smaller exposed surface reduces accidental connections to individual nodes and makes the Hub the single scheduling authority.

The \`shm_size\` setting gives the browser container a larger shared-memory area than Docker's small default. Modern browsers use shared memory heavily. Treat the value as a starting point to observe, not a universal guarantee. Workloads with large pages, video, many tabs, or heavy canvas rendering may require different resources.

## Align Runner Concurrency With Registered Capacity

The runner and Grid form one queueing system. Selenium cannot stop a Jest, JUnit, TestNG, pytest, or custom worker pool from producing more session requests than the deployment can serve. Configure runner concurrency deliberately and keep it at or slightly below usable Grid capacity for predictable pull-request latency.

| Runner behavior | Grid behavior | Likely result |
|---|---|---|
| Workers equal healthy slots | Immediate or short scheduling | Stable baseline |
| Workers far exceed slots | Requests queue | Possible session-request timeouts |
| Slots exceed host resources | Sessions start but contend | Slow commands and browser crashes |
| One session shared by workers | Commands interleave | State corruption and false failures |
| Worker always quits its session | Slot returns promptly | Sustainable throughput |

The critical cleanup is \`quit\`, preferably in a \`finally\` block. Closing the browser window is not equivalent to ending the remote session. A leaked session occupies capacity until Grid or the node eventually reclaims it.

\`\`\`ts
import { Builder, WebDriver } from 'selenium-webdriver';

async function runCheckoutCase(): Promise<void> {
  let driver: WebDriver | undefined;

  try {
    driver = await new Builder()
      .forBrowser('chrome')
      .usingServer(process.env.SELENIUM_REMOTE_URL ?? 'http://localhost:4444')
      .build();

    await driver.get('https://store.example.test/checkout');
    // Perform assertions through your test framework here.
  } finally {
    await driver?.quit();
  }
}
\`\`\`

Keep one WebDriver instance owned by one worker unless the framework provides a well-defined session-sharing model. Tests that concurrently manipulate the same browser create race conditions that resemble Grid instability.

## Scale Compose Services Without Creating Identity Collisions

Docker Compose can create multiple containers for a service with \`--scale\`. Because Compose generates unique container names, do not set \`container_name\` on a service you intend to scale. Start the Hub and produce several Chrome and Firefox node containers like this:

\`\`\`bash
export SELENIUM_IMAGE_TAG='your-approved-pinned-tag'
docker compose up -d --scale chrome=6 --scale firefox=2
docker compose ps
curl --fail --silent http://localhost:4444/status
\`\`\`

Scaling the service changes the number of node containers, not the number of test-runner workers. Update both sides through one capacity variable in CI, or calculate compatible values in the pipeline. A mismatch is a common source of apparent hangs.

Avoid host port mappings on scalable node services. If every replica tries to bind the same VNC or node port on the host, only one can start. Internal Compose networking does not have that collision because each container has its own network namespace and address.

When decreasing scale, first stop sending new work and allow active sessions to finish. Abruptly removing containers is indistinguishable from a node crash to tests running there. For ephemeral CI, the simplest safe pattern is to create a fresh project-scoped Grid per job, run the suite, collect artifacts, and tear the stack down after sessions end.

## Decide How Many Sessions Belong on One Node

One browser session per node container is a strong default because it isolates process trees, temporary files, and failures. Selenium Docker images support environment-based session configuration, including \`SE_NODE_MAX_SESSIONS\`. Raising it can improve density for lightweight tests, but it does not create CPU or memory.

\`\`\`yaml
services:
  chrome:
    image: selenium/node-chrome:\${SELENIUM_IMAGE_TAG}
    shm_size: 2gb
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
      SE_NODE_MAX_SESSIONS: 1
\`\`\`

Benchmark density with your application, not a blank page. Record peak resident memory, CPU saturation, command latency, browser crash rate, and host I/O while running a representative mix. If one session consumes 1.2 GB during report rendering, putting four sessions into a 3 GB container is not economical, even if they usually idle below that.

Selenium's images also document an override mechanism that can allow session counts beyond the detected processor limit. Use such overrides only after measuring and accepting the oversubscription risk. The safe engineering question is not, "Can the node advertise eight slots?" It is, "Can eight worst-case sessions finish within the service-level objective without increasing failure rate?"

## Match Capabilities Instead of Sending Every Test to Chrome

Grid matches a new-session request to a compatible slot. Browser name is the minimum useful capability, while platform, browser options, and project-specific distinctions may further restrict placement. If a request never matches, adding generic Chrome nodes will not help a Firefox or differently constrained request.

Keep capability declarations minimal. Unnecessary exact constraints reduce schedulable capacity. On the other hand, do not erase requirements that affect behavior. A test explicitly validating Firefox needs Firefox.

\`\`\`ts
import { Builder } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

const options = new firefox.Options();
options.addArguments('-headless');

const driver = await new Builder()
  .forBrowser('firefox')
  .setFirefoxOptions(options)
  .usingServer(process.env.SELENIUM_REMOTE_URL ?? 'http://localhost:4444')
  .build();

try {
  await driver.get('https://store.example.test/account');
} finally {
  await driver.quit();
}
\`\`\`

Use separate test projects or tagged groups for browser coverage. A sensible pull-request policy may run the broad suite on one browser and a targeted compatibility set on another, with a nightly full cross-browser matrix. That is a product-risk decision, not a Grid limitation.

If your JavaScript suite is still choosing its execution layer, [the JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) clarifies the difference between test runners and browser drivers. Teams comparing Grid-based WebDriver tests with Playwright should also understand [Playwright locator best practices](/blog/playwright-best-practices-locators-2026), because selector quality affects flakiness regardless of where browsers run.

## Isolate Files, Downloads, and Per-Session State

Parallel sessions reveal hidden shared state. Tests may write the same download filename, reuse one account, contend over a shopping cart, or update a common feature flag. Grid cannot isolate server-side test data for you.

Generate a run identifier and worker identifier, then namespace every mutable resource. Use unique users, orders, tenants, and object-storage prefixes. Store browser downloads in session-specific locations if your Grid configuration makes those files available. Never assume a downloaded file exists on the runner's filesystem: the browser runs inside a remote node container.

A compact test context can make isolation visible:

\`\`\`ts
type TestIdentity = {
  runId: string;
  workerId: string;
  email: string;
  orderReference: string;
};

export function makeIdentity(runId: string, workerId: string): TestIdentity {
  const suffix = [runId, workerId].join('-').toLowerCase();
  return {
    runId,
    workerId,
    email: \`qa+\${suffix}@example.test\`,
    orderReference: \`grid-\${suffix}\`,
  };
}
\`\`\`

Cleanup should be scoped by the run identifier, not a broad delete query. A failed worker must not erase another worker's fixtures. Prefer API-level fixture creation and cleanup over slow UI setup, while retaining a small number of end-to-end creation journeys where they represent actual product risk.

## Observe Grid Health Before Blaming the Test

The Grid status endpoint provides a readiness view that automation can query at \`/status\`. Do not start the test process immediately after \`docker compose up -d\`; containers can be running before the Hub is ready and nodes are registered.

The following Node script polls documented status output without relying on an arbitrary sleep. It checks the response's top-level \`value.ready\` field and exits with a clear timeout.

\`\`\`ts
const gridUrl = process.env.SELENIUM_GRID_URL ?? 'http://localhost:4444';
const deadline = Date.now() + 60_000;

while (Date.now() < deadline) {
  try {
    const response = await fetch(\`\${gridUrl}/status\`);
    const body = await response.json() as { value?: { ready?: boolean } };
    if (response.ok && body.value?.ready === true) {
      console.log('Selenium Grid is ready');
      process.exit(0);
    }
  } catch {
    // Grid can refuse connections while its services initialize.
  }

  await new Promise(resolve => setTimeout(resolve, 1_000));
}

throw new Error('Selenium Grid did not become ready within 60 seconds');
\`\`\`

Readiness alone does not guarantee the desired capacity. For larger deployments, add a project-owned check that verifies expected browser capabilities are registered before launching a large suite. Base it on documented Grid observability surfaces used by your deployed version, and keep the check version-controlled alongside the image tag.

Collect Hub and node container logs with timestamps. Correlate them with test-runner session IDs when possible. Infrastructure metrics should include CPU, memory, shared-memory pressure, container restarts, session queue duration, new-session failures, and command latency. Test metrics should include setup time, execution time, failure category, and retry outcome.

## Diagnose a Grid That Gets Slower When It Scales

Consider a realistic failure: four Chrome nodes complete a suite in 22 minutes, but twelve nodes on the same host take 29 minutes and produce intermittent \`WebDriverException\` failures. The extra containers increased advertised capacity, yet CPU stayed saturated, memory paging rose, and application requests became bursty.

Diagnose this in controlled steps. Freeze the test revision and test data. Run at concurrency 2, 4, 6, 8, and 12. For each point, record wall time, median and tail command latency, queue time, browser crashes, host CPU, memory, and application error rate. Plot throughput, completed tests per minute, rather than celebrating session count.

| Observation | Probable boundary | Next check |
|---|---|---|
| Long queue, nodes otherwise idle | Capability mismatch | Compare requested and registered browsers |
| No queue, commands become slow | Host or application saturation | CPU, memory, network, backend limits |
| Containers restart | Resource or process failure | Docker state, exit reason, node logs |
| Sessions never return | Test teardown leak | Ensure \`quit\` runs after every outcome |
| Only downloads fail | Remote filesystem assumption | Download transfer and unique paths |
| Failures cluster on one replica | Node-specific degradation | Remove and inspect that container |

If throughput flattens at eight sessions, eight may be the host's useful limit. To grow beyond it, add compute hosts or move to an orchestrated environment, not more containers on the same machine. Also inspect the system under test. A QA environment sized for five browsers can become the bottleneck when Grid sends 30 concurrent login flows.

Do not use retries to conceal resource exhaustion. A retry may pass after contention falls, falsely categorizing an infrastructure limit as flaky test behavior. Classify the first failure and retain its artifacts even if policy allows one controlled rerun.

## Preserve Evidence From Ephemeral Browser Containers

Containers disappear easily, and so does the most valuable evidence. Design artifact collection before scaling. At minimum, retain the runner's assertion output, screenshots on failure, relevant browser console information when collected by the test, Hub logs, node logs, and a snapshot of container state.

Use a unique Compose project name per CI job so simultaneous builds do not discover or remove each other's containers. Project scoping also makes log collection predictable. The pipeline outline below avoids pretending that one CI vendor or test framework owns the workflow.

\`\`\`bash
export COMPOSE_PROJECT_NAME="grid-\${CI_JOB_ID}"
export SELENIUM_IMAGE_TAG='your-approved-pinned-tag'

docker compose up -d --scale chrome=4 --scale firefox=1
node scripts/wait-for-grid.mjs

set +e
npm run test:e2e
test_exit=$?
set -e

mkdir -p artifacts/grid
docker compose logs --no-color > artifacts/grid/containers.log
docker compose ps --all > artifacts/grid/containers.txt

docker compose down
exit "$test_exit"
\`\`\`

Shell variable expansion is intentionally shown because this code runs as a shell script, not inside the article's TypeScript template after publishing. In the source module, the required escaping preserves it.

For sensitive systems, review logs before uploading them. URLs, cookies, authorization headers, and customer data can appear in browser or proxy output. Artifact retention should balance diagnosis with data-handling requirements.

## What People Get Wrong About Horizontal Scaling

The first error is treating a container as a free unit of performance. Every browser still consumes real processors, memory, shared memory, networking, and downstream application capacity. Docker packages the processes; it does not remove their costs.

The second is changing node density, worker count, test sharding, and application data at once. When results worsen, no one knows which lever caused it. Scale through measured plateaus and change one capacity dimension per experiment.

The third is using only average duration. A handful of long tests can leave one worker busy after others finish. File-level sharding may be particularly uneven when one file contains an expensive suite. Record distributions and split slow groups intentionally.

The fourth is ignoring node replacement. Browser processes leak, crash, or retain unexpected state. Ephemeral nodes and scheduled recycling can reduce accumulated degradation, but replacement must drain active sessions rather than terminate them blindly.

## Create a Release-Ready Scaling Runbook

A runbook turns individual expertise into repeatable operations. Record the approved image tag, browser mix, node count, session density, runner worker count, expected readiness time, useful host limit, artifact paths, and teardown procedure. Include commands to inspect status and logs without granting people access to unrelated infrastructure.

Set explicit thresholds. For example, block expansion if container restarts are nonzero, new-session failures exceed the team's tolerance, or 95th-percentile command latency rises beyond the baseline. Threshold values must come from your service objectives and measurements, not copied from another organization.

| Decision | Evidence needed | Action |
|---|---|---|
| Add replicas on same host | CPU and memory headroom at peak | Scale in a small increment |
| Increase sessions per node | Per-session profile and isolation proof | Benchmark before rollout |
| Add another host | Current host reaches throughput plateau | Partition or orchestrate nodes |
| Reduce runner workers | Queue or application overload dominates | Lower concurrency and compare |
| Replace a node | Failures correlate with one replica | Drain it, preserve logs, recreate |
| Roll image tag | Release notes and controlled comparison | Pin, test, then promote |

The objective is not maximum parallelism. It is the shortest repeatable feedback time that preserves test meaning. A Grid that finishes two minutes faster but doubles nondeterministic failures costs more engineering time than it saves.

## Benchmark Capacity With a Controlled Step Test

Before selecting production CI capacity, run a repeatable step test against a fixed revision. Prepare a representative shard that includes navigation-heavy cases, authentication, file transfer, JavaScript-intensive pages, and the slowest normal business flow. Warm the application environment consistently, then execute that shard at increasing worker counts. Repeat each point enough times to see whether an apparent gain survives ordinary variance.

Record more than total duration. Capture session request time, browser startup, median command latency, slow-tail command latency, tests completed per minute, browser process exits, container restarts, host CPU, host memory, and the application response-error rate. Label every record with the pinned browser image and test commit. Without those identities, two benchmark runs are not truly comparable.

Calculate incremental efficiency. If moving from four to eight sessions nearly doubles throughput without increasing failures, the host has useful headroom. If moving from eight to twelve produces only a small gain and sharply increases command latency, the knee of the curve is near eight. Keep operating capacity below the cliff so ordinary application spikes and uneven tests do not push the system into instability.

Repeat the benchmark after meaningful browser-image, host, application, or suite changes. A capacity number is a property of the whole workload, not a permanent fact about Selenium. Store the benchmark method and summarized results beside the Grid runbook so future changes can be evaluated with the same experiment instead of intuition.

Also compare a no-op navigation workload with the representative shard. If both degrade similarly, the host or Grid path deserves attention. If only the business shard degrades, inspect the application environment, test data locks, third-party stubs, and expensive page behavior. This control run prevents the browser farm from receiving blame for a saturated dependency.

## Frequently Asked Questions

### How many Selenium sessions should one Docker host run?

There is no reliable universal number. Profile a representative browser workload on the actual host, then increase concurrency in small steps while measuring throughput, command latency, memory, CPU, container restarts, and failure rate. Stop when throughput flattens or reliability degrades. Include the application under test in the analysis because it may saturate before Grid does. One session per node container is a clear starting point, while higher density requires evidence that peak workloads fit without harmful contention.

### Is one browser container per test necessary?

No. A browser node can serve successive sessions, and its configured slot count may permit more than one simultaneous session. The important isolation boundary is the WebDriver session plus unique test data. One simultaneous session per container is popular because it makes resource accounting and failure isolation easier. If startup overhead or host density matters, benchmark multiple sessions per node using the same suite. Never share one active WebDriver session across independent parallel workers unless the test architecture explicitly coordinates it.

### Why are new session requests timing out even though Grid is ready?

Readiness means Grid can accept requests, not that a compatible slot is immediately free. Compare requested capabilities with registered node capabilities, inspect whether all slots are occupied, and measure queue duration. A Firefox request cannot use spare Chrome capacity. Also check for leaked sessions whose tests closed a window but never called \`quit\`. If requests arrive in a large burst, align runner workers with usable slots and confirm the client timeout policy accommodates legitimate short queues without masking a permanently unschedulable capability.

### When should a team move beyond Docker Compose for Selenium Grid?

Compose is effective for one-host development and self-contained CI jobs. Consider a multi-host scheduler when measured demand exceeds one machine, teams need independent scaling pools, or node lifecycle and placement require centralized automation. Moving platforms does not fix poor tests, capability mismatches, or an overloaded application environment. Establish resource profiles, session cleanup, observability, artifact capture, and a proven scaling plateau first. Those same operational contracts make any later orchestration choice safer and easier to evaluate.
`,
};
