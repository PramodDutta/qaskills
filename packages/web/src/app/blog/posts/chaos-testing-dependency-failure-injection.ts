import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chaos Testing Dependency Failure Injection for Reliable Services',
  description: 'Apply chaos testing dependency failure injection with controlled faults, measurable assertions, and safe recovery checks that expose fragile service behavior.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Chaos Testing Dependency Failure Injection for Reliable Services

Chaos testing dependency failure injection deliberately makes a service dependency slow, unavailable, malformed, or inconsistent so you can verify how your system protects users and data. The practical goal is not to create random breakage. It is to run a bounded experiment with a named dependency, a precise fault, an expected degraded behavior, and evidence that recovery works after the fault ends.

For a checkout API, that might mean returning HTTP 503 from the tax provider for thirty seconds and proving that the API rejects the order without charging the card. For an AI-assisted test platform, it might mean delaying the model gateway and proving that jobs remain cancellable, a timeout is surfaced honestly, and retry queues do not duplicate work. The strongest tests assert the user-visible response, the dependency-call budget, the persisted state, and the recovery path together.

This guide builds an implementation from controlled fault doubles through CI guardrails. If you need to decide which JavaScript runner belongs around these experiments, consult the [complete JavaScript testing frameworks guide for 2026](/blog/javascript-testing-frameworks-complete-guide-2026). Browser checks appear later only as an outside-in probe, not as the mechanism that creates the fault.

## Turn a Resilience Claim Into a Falsifiable Experiment

"The service handles payment failures" is not testable enough. A useful hypothesis names six elements:

1. The caller and the dependency.
2. The injected behavior.
3. The duration or number of affected calls.
4. The expected response to the caller.
5. The state invariant that must hold.
6. The recovery condition after injection stops.

Example: "When the order service receives three consecutive 503 responses from inventory, it returns a retryable response within two seconds, creates no confirmed order, makes no more than three inventory calls, and accepts a new order within ten seconds after inventory recovers."

That sentence supplies assertions. It also prevents a common mistake: declaring success because the process did not crash. A service can remain alive while hanging requests, exhausting its connection pool, duplicating messages, or returning a misleading success.

| Hypothesis field | Weak statement | Testable statement |
| --- | --- | --- |
| Fault | Inventory is broken | Inventory returns 503 for calls 1 through 3 |
| User outcome | Graceful error | HTTP 503 with a retryable problem response |
| Time bound | Quickly | Response completes within two seconds in the lab |
| State invariant | No bad data | No order reaches confirmed status |
| Call budget | Retries reasonably | At most three inventory requests occur |
| Recovery | Comes back | Next clean request succeeds without a restart |

Latency limits in a lab are not production service-level objectives. Keep the assertion generous enough for shared CI, but strict enough to distinguish a bounded timeout from a one-minute hang.

## Map Dependency Failures by Observable Effect

Injecting only HTTP 500 creates shallow confidence. Dependencies fail at transport, protocol, semantic, and data-consistency layers. Each layer exercises different code.

| Failure class | Concrete injection | Code path stressed | Evidence to collect |
| --- | --- | --- | --- |
| Connection | Refuse or close a connection | Connection handling, retry classification | Attempt count, error category |
| Latency | Delay headers or response body | Timeout, cancellation, pool capacity | Duration, aborted work, open connections |
| Protocol | Return malformed JSON or wrong content type | Parser and validation | Safe error, body redaction |
| Availability | Return 429, 503, or 504 | Backoff, fallback, circuit behavior | Call spacing, response contract |
| Semantic | Return valid JSON with impossible values | Domain validation | No corrupted state |
| Partial success | Accept request, lose response | Idempotency and reconciliation | Duplicate count, stable idempotency key |
| Stale data | Return old version or old timestamp | Freshness policy | Rejection or explicit stale indicator |
| Authentication | Return 401 after credential rotation | Token refresh and fail-closed logic | Refresh count, secret handling |

Choose faults that match incidents or architecture risks. A cache, database, message broker, payment gateway, and model provider have different dangerous modes. Returning malformed JSON from a PostgreSQL connection is not meaningful, while a slow query and connection exhaustion are.

## Put the Injection Point at the Right Boundary

There are four practical places to inject failure. Use the lowest level needed to exercise the behavior in question.

| Injection point | Suitable tests | Strength | Limitation |
| --- | --- | --- | --- |
| Function fake | Unit tests for classification and fallback | Fast and deterministic | Skips serialization and transport |
| Controllable HTTP double | Service integration tests | Exercises client, parser, timeout, retries | Does not emulate every TCP condition |
| Network proxy | Container or staging tests | Adds latency, loss, and connection faults | Requires infrastructure and cleanup |
| Real dependency sandbox | Contract and recovery drills | Highest provider realism | Cost, rate limits, less deterministic |

Start with a function fake for decision logic, then use a controllable server for transport behavior. Add proxy-level experiments where connection mechanics matter. Running every fault at the network level slows feedback and makes diagnosis harder; running everything as a mock leaves the real client path untested.

The injection control must be outside ordinary production traffic. Good options include an in-process test double, a dedicated proxy in an isolated environment, or a test-only administration endpoint protected by environment and authentication controls. A public header such as \`X-Fail-Dependency: true\` that works in production is an avoidable vulnerability.

## Build a Deterministic Fault Server

A small HTTP server is enough to exercise status codes, delayed bodies, invalid payloads, and call sequences. The server below is local test infrastructure. Tests provide a queue of planned responses, and every request consumes one plan.

\`\`\`ts
import { createServer, type Server } from 'node:http';

type FaultPlan =
  | { kind: 'json'; status: number; body: unknown }
  | { kind: 'delay'; milliseconds: number; status: number; body: unknown }
  | { kind: 'malformed'; status: number; body: string }
  | { kind: 'close' };

export class DependencyDouble {
  private plans: FaultPlan[] = [];
  private server?: Server;
  readonly calls: Array<{ method?: string; url?: string; body: string }> = [];
  origin = '';

  enqueue(...plans: FaultPlan[]) {
    this.plans.push(...plans);
  }

  async start() {
    this.server = createServer(async (request, response) => {
      let body = '';
      for await (const chunk of request) body += chunk;
      this.calls.push({ method: request.method, url: request.url, body });

      const plan = this.plans.shift() ?? {
        kind: 'json' as const,
        status: 200,
        body: { available: true },
      };

      if (plan.kind === 'close') {
        request.socket.destroy();
        return;
      }
      if (plan.kind === 'delay') {
        await new Promise(resolve => setTimeout(resolve, plan.milliseconds));
      }
      response.statusCode = plan.status;
      response.setHeader('content-type', 'application/json');
      response.end(plan.kind === 'malformed' ? plan.body : JSON.stringify(plan.body));
    });

    await new Promise<void>(resolve => this.server?.listen(0, '127.0.0.1', resolve));
    const address = this.server.address();
    if (!address || typeof address === 'string') throw new Error('No TCP address');
    this.origin = \`http://127.0.0.1:\${address.port}\`;
  }

  async stop() {
    await new Promise<void>((resolve, reject) =>
      this.server?.close(error => (error ? reject(error) : resolve())),
    );
  }
}
\`\`\`

The queue makes a retry sequence explicit. It also defaults to success after planned faults, which supports recovery checks. In a production-quality helper, fail the test if expected plans remain unused, and cap recorded body size so a runaway request does not consume memory.

## Test Timeout, Cancellation, and State Together

Assume an order API calls inventory. Configure the application under test with the double's origin before it starts. Do not patch a URL after the client has already been constructed unless the application explicitly supports runtime configuration.

\`\`\`ts
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { DependencyDouble } from './dependency-double';
import { startApplication } from './test-application';

const inventory = new DependencyDouble();
let application: Awaited<ReturnType<typeof startApplication>>;

before(async () => {
  await inventory.start();
  application = await startApplication({
    inventoryOrigin: inventory.origin,
    inventoryTimeoutMs: 250,
  });
});

after(async () => {
  await application.stop();
  await inventory.stop();
});

test('a slow inventory response leaves no confirmed order', async () => {
  inventory.enqueue({
    kind: 'delay',
    milliseconds: 1000,
    status: 200,
    body: { available: true },
  });

  const started = Date.now();
  const response = await fetch(\`\${application.origin}/orders\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku: 'CHAIR-7', quantity: 1 }),
  });
  const elapsed = Date.now() - started;

  assert.equal(response.status, 503);
  assert.ok(elapsed < 900, \`expected bounded response, got \${elapsed} ms\`);
  assert.equal(await application.orders.countByStatus('confirmed'), 0);
});
\`\`\`

The 900 millisecond assertion is deliberately above the configured 250 millisecond client timeout. It detects an unbounded wait without pretending a shared runner has real-time precision. The important state assertion prevents an implementation from returning an error after committing the order.

Also confirm cancellation propagates. A caller timing out is not enough if abandoned dependency work keeps sockets and CPU occupied. Observable indicators include aborted requests at the double, active-request gauges returning to baseline, and no work completing after the user has received an error.

## Verify Retries as a Budget, Not a Feeling

Retries can turn a small outage into a traffic surge. Assert when retries happen, which operations qualify, and how many attempts occur. Reads and idempotent requests are easier to retry safely than arbitrary writes.

\`\`\`ts
test('retries a transient availability response within the attempt budget', async () => {
  inventory.enqueue(
    { kind: 'json', status: 503, body: { error: 'temporarily_unavailable' } },
    { kind: 'json', status: 503, body: { error: 'temporarily_unavailable' } },
    { kind: 'json', status: 200, body: { available: true } },
  );
  const callsBefore = inventory.calls.length;

  const response = await fetch(\`\${application.origin}/availability/CHAIR-7\`);

  assert.equal(response.status, 200);
  assert.equal(inventory.calls.length - callsBefore, 3);
});

test('does not retry a validation failure', async () => {
  inventory.enqueue({
    kind: 'json',
    status: 400,
    body: { error: 'invalid_sku' },
  });
  const callsBefore = inventory.calls.length;

  const response = await fetch(\`\${application.origin}/availability/UNKNOWN\`);

  assert.equal(response.status, 400);
  assert.equal(inventory.calls.length - callsBefore, 1);
});
\`\`\`

Avoid asserting exact millisecond gaps unless your retry policy exposes a deterministic clock or jitter source for testing. In an integration test, assert the attempt ceiling and an overall duration bound. Unit-test a pure backoff calculation separately if exact delays are business-critical.

| Operation | Retry default | Required protection | Failure assertion |
| --- | --- | --- | --- |
| Read inventory | Often reasonable | Attempt and time budget | No more than configured attempts |
| Create payment | Only with provider-supported idempotency | Stable idempotency key | One resulting charge |
| Publish event | Depends on broker semantics | Durable id and consumer deduplication | One business effect |
| Refresh token | Usually one controlled refresh | Prevent refresh stampede | Bounded refresh calls |
| Upload large body | Context-specific | Replayable body and cancellation | No hidden repeated transfer |

## Exercise the Ambiguous Success Window

The hardest failure is not a clear 503. It is when the dependency completes a write but the response never reaches the caller. The caller cannot know whether retrying creates a duplicate. Payment, provisioning, and message-publication flows need idempotency or reconciliation.

Model the dependency so it records the operation and closes the connection before returning a response. The application may retry with the same idempotency key, query status, or mark the operation pending. The acceptable policy depends on the domain, but duplicate business effects are rarely acceptable.

\`\`\`ts
test('reuses one idempotency key after an ambiguous payment result', async () => {
  payments.enqueue(
    { kind: 'close' },
    { kind: 'json', status: 200, body: { paymentId: 'pay-101' } },
  );
  const before = payments.calls.length;

  const response = await fetch(\`\${application.origin}/checkout\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cartId: 'cart-101' }),
  });

  assert.equal(response.status, 200);
  const calls = payments.calls.slice(before);
  assert.ok(calls.length >= 1);

  const keys = calls.map(call => JSON.parse(call.body).idempotencyKey);
  assert.equal(new Set(keys).size, 1);
  assert.equal(await application.payments.countForCart('cart-101'), 1);
});
\`\`\`

The double cannot prove a real provider honors the key. Add a provider sandbox contract test for that behavior, and keep the fast ambiguous-window test for application orchestration.

## Assert Degradation at the User Boundary

Service-level checks show detailed failure reasons, but users encounter pages, command responses, or job states. Add a thin outside-in check for the most important degraded behavior. The browser should not inject the fault itself; arrange the fault through isolated test control, then observe the UI.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('checkout explains temporary inventory failure without losing the cart', async ({
  page,
  request,
}) => {
  await request.post('/test-control/dependencies/inventory', {
    data: { scenario: 'unavailable-for-next-request' },
  });

  await page.goto('/cart?fixture=single-chair');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page.getByRole('alert')).toContainText(
    'We could not confirm availability. Your cart is saved.',
  );
  await expect(page.getByTestId('cart-line')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled();
});
\`\`\`

The endpoint name and scenario are application-specific, but the separation is reusable. Protect test controls, scope them to the test tenant, and automatically clear them. For reliable selectors in degraded states, follow [Playwright locator best practices for 2026](/blog/playwright-best-practices-locators-2026), especially role-based queries for alerts and actions.

## Measure the Blast Radius During the Test

A passing response assertion can coexist with unhealthy internals. Collect a small set of signals before, during, and after injection:

- Request outcome counts by dependency and error class.
- Latency distribution, especially high percentiles rather than only an average.
- Retry attempts and retry exhaustion.
- Active and queued work.
- Connection-pool utilization.
- Circuit or fallback state if the application exposes it.
- Duplicate operations and invariant violations.
- Time from fault removal to steady-state recovery.

| Signal movement | Likely interpretation | Follow-up |
| --- | --- | --- |
| User errors bounded, retries bounded | Designed degradation | Confirm recovery and data state |
| User errors bounded, queue climbs | Hidden backlog | Extend observation after healing |
| Latency grows across unrelated routes | Shared resource exhaustion | Inspect pools, event loop, thread limits |
| Dependency calls exceed incoming calls many times | Retry amplification | Reduce attempts or add coordination |
| Success responses with invariant failures | Dangerous false success | Stop rollout and fix transaction boundary |
| Metrics recover, requests still fail | Health signal is incomplete | Add outcome-based readiness evidence |

Use trace or correlation identifiers to connect one injected request across logs and metrics. Never place credentials, full payment details, prompts containing sensitive data, or authorization headers into failure logs. Chaos experiments often exercise error paths that received less redaction attention than success paths.

## Diagnose Retry Amplification Under a Partial Outage

A realistic failure mode begins with only one inventory replica returning 503. The order service retries twice, the gateway retries once, and a worker retries the whole job. Incoming traffic remains constant, but dependency traffic multiplies. Latency rises for healthy replicas, their queues fill, and soon the partial outage becomes broad.

Diagnosis should answer where each extra attempt originated:

1. Select one request trace and count spans to inventory.
2. Compare call counts at the gateway, service client, and worker.
3. Group logs by stable operation id, not only request id, because retries may create new request ids.
4. Inspect whether retries happen inside the caller's deadline.
5. Check whether non-idempotent operations are replayed.
6. Remove one retry layer in the lab and repeat the same injection.

What people get wrong is validating retries only with eventual success. A test that says "the request passed after the third attempt" may celebrate the behavior that causes an outage. Success criteria need an attempt budget, a deadline, and a downstream traffic ratio. In many architectures, one layer should own retry policy while other layers surface the failure.

## Prove Healing Without Restarting the World

Every injection test needs a recovery phase. Remove the planned fault, send clean traffic, and verify more than a health endpoint. A green liveness route might bypass the failed client, while its pool remains poisoned or a circuit remains open.

\`\`\`ts
async function eventually(
  check: () => Promise<boolean>,
  options: { timeoutMs: number; intervalMs: number },
) {
  const deadline = Date.now() + options.timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, options.intervalMs));
  }
  throw new Error(\`recovery condition not met; last error: \${String(lastError)}\`);
}

await eventually(
  async () => {
    const response = await fetch(\`\${application.origin}/availability/CHAIR-7\`);
    return response.status === 200;
  },
  { timeoutMs: 10_000, intervalMs: 250 },
);

assert.equal(await application.orders.countByStatus('confirmed'), expectedConfirmed);
\`\`\`

Polling with a deadline is appropriate for eventual recovery. A fixed sleep either wastes time or races the system. Record recovery time as an observation even if the assertion uses a generous ceiling.

## Run Safely in CI and Shared Environments

Begin with in-process or per-job dependencies so experiments cannot affect neighbors. A CI test should own its application instance, fault double, database namespace, and cleanup. If an experiment targets a shared staging dependency, serialize it, label it clearly, and require an environment-specific safety review.

A straightforward GitHub Actions job can run the isolated integration suite and preserve reports:

\`\`\`yaml
name: dependency-failure-tests

on:
  pull_request:

jobs:
  fault-injection:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:dependency-failures
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dependency-failure-results
          path: test-results/
\`\`\`

Pin third-party actions according to your organization's supply-chain policy. The job timeout is a final containment boundary, not a replacement for application request deadlines or test cleanup.

Use a safety checklist before widening scope:

| Guardrail | Local or isolated CI | Shared staging | Production experiment |
| --- | --- | --- | --- |
| Named owner present | Recommended | Required | Required |
| Automatic expiration | Required | Required | Required |
| Tenant or traffic scope | Per process | Per test tenant | Small verified segment |
| Abort condition | Test timeout | Error and saturation limits | SLO and business limits |
| Cleanup verification | Process exit plus assertions | Explicit health and state checks | Independent control plane |
| Data invariant check | Required | Required | Required with audit trail |

Do not graduate an experiment to production simply because the isolated test passes. Production chaos requires operational authorization, live telemetry, blast-radius controls, communication, and rollback authority that are outside an ordinary test commit.

## Build a Focused Failure Portfolio

Do not create a Cartesian product of every dependency and every fault. Rank cases by user harm, prior incidents, and uncertainty. One carefully asserted ambiguous-payment test is worth more than twenty generic 500-response tests.

A practical portfolio for each critical dependency contains:

- One fast unit test for error classification.
- One transport-level timeout or unavailable test.
- One semantic-invalid-response test.
- One ambiguous-result test for state-changing operations.
- One recovery test.
- One outside-in degraded-experience check for the critical user journey.

Review the portfolio after incidents and architecture changes. Remove faults that no longer represent the boundary, and add cases when a new queue, cache, provider, or retry layer changes risk. Chaos testing dependency failure injection stays useful when each experiment is a small executable claim about system behavior, not a theatrical outage.

## Frequently Asked Questions

### Is dependency failure injection the same as mocking?

Mocking is one mechanism for controlling a collaborator, while dependency failure injection is an experiment design that may use mocks, real servers, proxies, containers, or provider sandboxes. A function mock can verify classification logic quickly, but it cannot prove that an HTTP client cancels a delayed response or handles malformed bytes. Use the lightest mechanism that reaches the risky behavior, then add a lower-level experiment where transport, pooling, serialization, or recovery materially affects the outcome.

### Which dependency should a team test first?

Start with a dependency that can cause irreversible user harm or a wide outage, and whose behavior during failure is uncertain. Payment providers, identity systems, primary databases, job brokers, and model gateways often rank highly, but architecture and incident history should decide. Define one narrow fault based on a credible event, such as an accepted write followed by a lost response. Measure state safety and recovery, not just the returned status. This produces more learning than selecting the easiest service to stub.

### How can I test timeouts without making the suite slow?

Configure shorter dependency deadlines in the isolated test application while preserving the same control flow used in production. Inject a delay comfortably above that test deadline, then assert a generous overall upper bound. Keep exact backoff math in unit tests with an injectable clock when necessary. Do not sleep for the full production timeout, and do not change the behavior so radically that cancellation paths differ. A few targeted real-time tests can complement the fast suite if runtime-specific timing is a known risk.

### Should chaos dependency tests run on every pull request?

Fast, deterministic tests using per-process doubles are excellent pull-request candidates. Container proxy tests may run on pull requests when their setup is reliable and runtime is acceptable. Shared-environment or production experiments belong in separately authorized workflows with owners, abort conditions, and observability. Split by blast radius and feedback cost rather than using one label for everything. The core regression checks should stay close to code changes, while broader resilience drills can run on a schedule or before high-risk releases.
`,
};
