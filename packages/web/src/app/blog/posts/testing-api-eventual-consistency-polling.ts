import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Eventually Consistent APIs with Polling',
  description:
    'Test eventually consistent APIs with deadline-based polling, classified responses, diagnostic timeouts, and stable assertions for delayed state changes.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Eventually Consistent APIs with Polling

The create request returns \`202 Accepted\`, the read replica still says \`404\`, and 600 milliseconds later the resource appears as \`PROCESSING\`. A fixed sleep turns that normal propagation path into either wasted time or a flaky test. Polling treats delayed visibility as an explicit state transition with a deadline.

Good polling is not “retry until green.” It names the observations that are transient, fails immediately on terminal responses, uses a monotonic clock, and reports the last state when time expires. That structure lets a test tolerate the consistency model without tolerating arbitrary defects.

## Identify the consistency boundary first

Ask which write and which read are separated. A command may persist in one service, publish an event, update a projection, refresh a cache, and finally become searchable. Poll the public endpoint whose delayed guarantee matters to the user. Polling the writer's database only proves storage, not projection availability.

| Write path | Delayed read | Useful terminal state |
|---|---|---|
| Submit export job | GET job status | \`COMPLETED\` with download URL |
| Create customer | Search index query | Exact customer ID appears |
| Change permission | Authorization decision | New allow/deny decision observed |
| Cancel order | Read-model order endpoint | \`CANCELLED\` with version advanced |
| Upload document | Processing endpoint | \`READY\` or explicit \`FAILED\` |

Document whether read-your-writes is promised. If a command response includes the complete new representation, assert it immediately. Poll only the separate view that is eventually updated. Otherwise the test can accidentally weaken a synchronous contract.

## Poll with a monotonic deadline

Use \`performance.now()\` in Node for elapsed time. Wall clocks can jump because of synchronization or manual changes. A deadline also makes per-attempt latency count toward the budget, unlike a naïve retry-count loop.

\`\`\`typescript
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

type PollOptions<T> = {
  timeoutMs: number;
  intervalMs: number;
  read: () => Promise<T>;
  accept: (value: T) => boolean;
  describe: (value: T) => string;
};

export async function pollUntil<T>(options: PollOptions<T>): Promise<T> {
  const deadline = performance.now() + options.timeoutMs;
  let lastValue: T | undefined;
  let attempts = 0;

  while (performance.now() < deadline) {
    attempts += 1;
    lastValue = await options.read();
    if (options.accept(lastValue)) return lastValue;

    const remaining = deadline - performance.now();
    if (remaining > 0) {
      await delay(Math.min(options.intervalMs, remaining));
    }
  }

  const observation =
    lastValue === undefined ? 'no completed read' : options.describe(lastValue);
  throw new Error(
    \`Polling timed out after \${options.timeoutMs} ms and \${attempts} attempts; last observation: \${observation}\`,
  );
}
\`\`\`

This helper intentionally does not catch errors. Transport error policy belongs at the call site because a connection reset, \`401\`, and \`500\` have different meanings. A reusable helper that swallows all failures converts broken authentication into a timeout.

## Classify every observation

Each response should be success, transient, or terminal. For a newly created projection, \`404\` may be transient. For an existing resource transition, \`404\` may mean data loss and should fail. Status codes are context, not universal retry rules.

| Observation | Typical classification | Reason to reconsider |
|---|---|---|
| \`404\` immediately after async create | Transient | API promises immediate addressability |
| \`200\` with \`PENDING\` | Transient | State has exceeded its own SLA |
| \`200\` with \`FAILED\` | Terminal failure | Test is specifically waiting to observe failure |
| \`401\` or \`403\` | Terminal | Token refresh is explicitly under test |
| \`429\` | Possibly transient | \`Retry-After\` exceeds test deadline |
| \`500\` | Usually terminal in functional tests | Known brief failover is the test subject |

Model the classification in the read function, not in a broad assertion retry:

\`\`\`typescript
type Job = { id: string; status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' };
type Observation =
  | { kind: 'not-visible' }
  | { kind: 'job'; job: Job };

async function readJob(baseUrl: string, id: string): Promise<Observation> {
  const response = await fetch(\`\${baseUrl}/jobs/\${id}\`);
  if (response.status === 404) return { kind: 'not-visible' };
  if (!response.ok) {
    throw new Error(\`GET /jobs/\${id} returned \${response.status}\`);
  }

  const job = (await response.json()) as Job;
  if (job.status === 'FAILED') {
    throw new Error(\`Job \${id} entered FAILED\`);
  }
  return { kind: 'job', job };
}

const completed = await pollUntil({
  timeoutMs: 15_000,
  intervalMs: 250,
  read: () => readJob(process.env.API_URL!, jobId),
  accept: (value) => value.kind === 'job' && value.job.status === 'COMPLETED',
  describe: (value) => JSON.stringify(value),
});
\`\`\`

Validate unknown statuses instead of trusting the cast in production test code. A schema library or explicit guard turns a new server state into a useful compatibility failure.

## Derive the deadline from behavior

The polling deadline is an assertion about the system. Choose it from the documented consistency objective plus expected test-environment variance, not from the longest failure seen last week. If the product promises search visibility within five seconds, a test deadline around that boundary can enforce it. A 90-second timeout would make the test stable by ceasing to test the promise.

Keep three time controls distinct:

| Control | Governs | Example |
|---|---|---|
| HTTP request timeout | One network call | Abort a read after 2 seconds |
| Poll interval | Load between observations | Read projection every 250 ms |
| Overall deadline | Maximum convergence time | Require visibility within 8 seconds |

One stalled request must not consume an unbounded overall deadline. Use \`AbortSignal.timeout()\` where supported, or create an abort controller per attempt. Ensure the request timeout is shorter than the remaining polling budget.

## Choose interval and backoff based on the system

A constant interval is predictable for short functional tests. Exponential backoff reduces load during long waits but gives coarse detection near the end. Add bounded jitter when many parallel tests create a synchronized polling wave. Keep randomization small enough that deadlines remain interpretable.

\`\`\`typescript
function nextDelay(attempt: number): number {
  const exponential = Math.min(100 * 2 ** attempt, 2_000);
  const jitter = Math.floor(Math.random() * 100);
  return exponential + jitter;
}
\`\`\`

For a deterministic unit test of the polling helper, inject the delay and clock rather than using real time. For an end-to-end API test, real elapsed time is often the behavior under examination. Do not mock away the propagation mechanism and claim its latency was tested.

Respect server hints. A \`202\` response may return \`Location\` for the status resource and \`Retry-After\` for a suggested delay. Follow the documented semantics. Do not construct an endpoint from an internal ID when the API provides the canonical polling URL.

## Assert the transition, not only the destination

Sometimes the final state is sufficient. In other cases, order matters: version numbers must never decrease, a canceled job must not return to running, and progress must remain between 0 and 100. Preserve observations when transition behavior is contractual.

\`\`\`typescript
const observedStatuses: string[] = [];

await pollUntil({
  timeoutMs: 10_000,
  intervalMs: 200,
  read: async () => {
    const response = await fetch(\`\${baseUrl}/exports/\${exportId}\`);
    if (!response.ok) throw new Error(\`status \${response.status}\`);
    const body = (await response.json()) as { status: string };
    observedStatuses.push(body.status);
    return body;
  },
  accept: (body) => body.status === 'COMPLETED',
  describe: (body) => body.status,
});

expect(observedStatuses.at(-1)).toBe('COMPLETED');
expect(observedStatuses).not.toContain('FAILED');
\`\`\`

Do not require observing every intermediate state unless the API guarantees their visibility. A fast worker can move from \`QUEUED\` to \`COMPLETED\` between polls. Asserting that \`RUNNING\` was seen makes correct performance look like a failure.

## Prevent stale success and cross-test collisions

A poll can find an old object that happens to match the desired attributes. Generate a unique correlation key per test, use the ID returned by the command, and assert a version, creation time, or request identifier when available. Search tests are particularly vulnerable if they query only a common name.

Parallel tests need unique namespaces. Cleanup should target the exact created resource and occur even after a polling timeout. If deletion is itself eventually consistent, either use isolated tenant data with scheduled cleanup or perform a bounded teardown poll without hiding the primary test failure.

Cache layers add another trap. A repeated GET may be served from a browser, CDN, or proxy cache. Follow API cache headers; for a test environment, a documented cache-bypass header or unique query can be appropriate. Do not blindly append random parameters to production contracts because that may test a different cache path.

## Make timeout failures actionable

“Expected completed, received pending” lacks history. Record attempt count, elapsed time, last status, resource ID, safe response excerpt, and correlation ID. Keep the log bounded so a stuck test does not emit thousands of payloads or secrets.

Capture a few state changes rather than every identical response:

| Diagnostic | Value during triage |
|---|---|
| Command response and timestamp | Proves when propagation began |
| Poll target URL without credentials | Identifies the projection queried |
| Distinct observed states | Reveals progress or a stuck phase |
| Last response status and version | Separates absence from stale content |
| Trace or correlation ID | Connects test to service logs |
| Total elapsed time and attempts | Exposes deadline and interval behavior |

For general request design, negative coverage, and schema checks around this polling pattern, see [API testing best practices](/blog/api-testing-best-practices-guide).

## Test the poller itself with a fake clock boundary

Shared polling utilities deserve unit tests. Verify immediate success, success after transient observations, terminal read error propagation, and timeout text containing the last observation. Inject \`now\` and \`sleep\` functions to avoid slow unit tests. Also test that the helper does not sleep after success and never schedules a delay longer than remaining time.

Keep match functions side-effect free. If \`accept\` throws, propagate the assertion because the observed payload violated expectations. Retrying a matcher exception can turn a schema regression into a late timeout.

Polling complements rather than replaces contract testing. A schema contract proves the status field and enum shape; polling proves the delayed state eventually appears within a deadline. See [API contract testing for microservices](/blog/api-contract-testing-microservices) for the interface side of that boundary.

## Know when to use events instead

Polling is appropriate when the public client contract is to poll, when no notification channel exists, or when the read model itself must be validated. A webhook, queue subscription, server-sent event, or websocket can provide faster completion signals, but then the test must manage correlation, subscription readiness, duplicates, and lost messages.

Even event-driven tests may poll the final resource after receiving a completion event. The event says work finished; the read verifies the promised state is visible. Avoid polling an internal database solely because event synchronization feels difficult.

| Strategy | Strength | Tradeoff |
|---|---|---|
| Constant polling | Simple and diagnosable | Repeated request load |
| Backoff polling | Lower load for long operations | Slower detection and more timing variation |
| Webhook receiver | Tests push delivery semantics | Requires reachable callback and replay handling |
| Queue consumer | Natural for event architecture | More infrastructure and cleanup |
| Direct DB query | Precise internal diagnosis | Bypasses public consistency contract |

## Verify absence with a sustained window

Negative eventual assertions are asymmetric. Seeing a forbidden object once proves failure, but not seeing it on one request does not prove it will never appear. For a deletion, revocation, or “event must not be published” requirement, define an observation window and poll throughout it. Fail immediately if the forbidden state appears, succeed only when the whole window passes.

This is appropriate only when the requirement itself is time bounded, such as “a canceled draft must not enter the searchable index during the next ten seconds.” It cannot prove permanent absence. Long negative windows also slow the suite, so reserve them for risks where late appearance matters.

Track every unique observation and stop on terminal contradictions. For permission revocation, an initial \`200\` may be transient and a later \`403\` is success. After success, optionally sample for a short stability period if cache oscillation is a known risk. Document that second window separately from convergence time.

## Coordinate polling with rate limits

Parallel CI workers can turn a modest interval into substantial traffic. Twenty workers polling four resources every 100 milliseconds produce hundreds of requests per second. Calculate the upper bound, use isolated test credentials, and honor documented rate limits.

If the endpoint returns \`429\` with \`Retry-After\`, parse the header according to its specified format and compare the delay with the remaining deadline. If waiting would exceed the deadline, fail with a rate-limit diagnosis. Silently extending the test changes the consistency assertion and can make a saturated environment appear healthy.

Avoid a global semaphore that blocks unrelated suites invisibly. A bounded polling client can expose queue time and active attempts, helping distinguish service convergence from test-side throttling. Production-like performance tests should measure these effects separately from functional gates.

## Poll versioned representations safely

Some read models expose an entity tag, sequence, or aggregate version. Use it to detect stale cache responses and regression. After a command based on version 12, the converged projection should normally show a version greater than 12. A desired status paired with an older version may be stale success from a previous lifecycle.

Conditional GET can reduce payload transfer, but \`304 Not Modified\` is transient only relative to the entity tag you sent. Record the initial tag, send \`If-None-Match\`, and fetch the full representation when it changes. Do not compare an entity tag lexically unless the API documents ordering.

For delete flows, the terminal representation may be \`404\`, \`410 Gone\`, or a tombstone with a version. Assert the documented contract. A generic poller that treats every \`404\` as “not ready” will time out on a successful deletion.

## Separate functional convergence from latency measurement

A functional test answers whether the state converges within a defensible limit. It is a poor source for percentile dashboards because CI scheduling, shared tenants, network paths, and sparse samples distort latency. If consistency latency is a service-level indicator, instrument the write and projection events or run a controlled measurement workload.

Still record elapsed convergence time as diagnostic metadata. Trends can reveal that a test deadline is approaching, but do not publish an unqualified percentile from a handful of gated cases. When a limit changes, update the product objective and test rationale together rather than increasing timeouts during an incident.

Review slow successful attempts. A suite that always passes at 9.8 seconds against a 10-second limit is not healthy merely because it is green. Alerting or nonblocking telemetry can surface that erosion before the binary gate begins to flap.

## Frequently Asked Questions

### Is a 404 always retryable after an asynchronous create?

No. Retry it only when the API contract permits delayed visibility for that resource and only until the deadline. If the command promises immediate addressability, a \`404\` is a defect. For an already visible resource, disappearance may be terminal.

### How often should an eventual-consistency test poll?

Use an interval that gives useful detection without overloading the read service. Hundreds of milliseconds is common for short integration flows, but the correct value depends on the published latency and test concurrency. Measure request volume across parallel workers.

### Should assertion failures inside the polling callback be retried?

Only assertions representing a declared transient state. Schema violations, unauthorized responses, impossible state transitions, and terminal failure states should stop immediately. Explicit classification is safer than catching every assertion error.

### Can I use Jest retryTimes instead of a polling loop?

Test retries rerun setup and the whole case, which can create duplicate resources and obscure the propagation history. Polling repeats only the delayed observation within one business operation. Reserve whole-test retries for understood infrastructure policy, not normal consistency.

### How can I prove the API met its consistency SLA?

Start a monotonic timer at the accepted command response, poll the documented read surface, and fail at the stated deadline. Record elapsed time as diagnostic data. For performance reporting, run controlled measurements separately rather than treating one functional test as a statistical latency study.
`,
};
