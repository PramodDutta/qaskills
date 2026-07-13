import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Retry a Block of Assertions with Playwright toPass()',
  description:
    'Use Playwright toPass() to retry multi-step eventual assertions safely, tune intervals and timeouts, and diagnose state that never becomes internally consistent.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Retry a Block of Assertions with Playwright toPass()

The order has reached the database, but its audit event appears 300 milliseconds later and the read model catches up after another queue cycle. Checking any one of those facts is easy. Proving that all three describe the same completed operation at one observation point is where a normal auto-retrying locator assertion stops being enough. Playwright's \`expect(async () => {}).toPass()\` is designed for that exact boundary: rerun a complete probe until every assertion inside it succeeds in the same attempt.

This is not the same as giving three assertions long timeouts. Independent retries can pass against three different moments, potentially accepting a state that was never coherent. A block retry provides a fresh, end-to-end observation on every attempt. Used with care, it is an excellent fit for eventually consistent APIs, asynchronous jobs, replicated views, and UI state that must agree with a backend record.

## What toPass() actually retries

\`toPass()\` is a matcher on a function. Playwright invokes that function, awaits it, and treats a thrown error or failed assertion as an unsuccessful attempt. After an interval, it invokes the function again from the top. The matcher succeeds only when one invocation completes without throwing.

That execution model has consequences:

| Code inside the callback | What happens on failure | Testing implication |
|---|---|---|
| API request | A new request is sent next attempt | Endpoint should tolerate repeated reads |
| Locator lookup | Locator is evaluated again | Replaced DOM nodes are observed afresh |
| Local variable declared inside | Value is recreated | No stale snapshot leaks between attempts |
| Mutation such as clicking Submit | Mutation happens again | Usually unsafe unless explicitly idempotent |
| Multiple assertions | First failure ends that attempt | Later assertions run only after earlier ones pass |

The callback may contain Playwright assertions, ordinary Jest-compatible value assertions from Playwright's own \`expect\`, or application code that throws. Use the \`expect\` exported by \`@playwright/test\`; mixing another assertion library can make reporting and matcher behavior confusing.

A small example shows the important boundary:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('projection eventually agrees with the accepted order', async ({ request }) => {
  const create = await request.post('/api/orders', {
    data: { sku: 'QA-42', quantity: 2 },
  });
  expect(create.status()).toBe(202);
  const { orderId } = await create.json();

  await expect(async () => {
    const orderResponse = await request.get(\`/api/orders/\${orderId}\`);
    expect(orderResponse.status()).toBe(200);

    const order = await orderResponse.json();
    expect(order.status).toBe('allocated');
    expect(order.quantity).toBe(2);

    const eventsResponse = await request.get(
      \`/api/orders/\${orderId}/events\`,
    );
    expect(eventsResponse.status()).toBe(200);
    const events = await eventsResponse.json();
    expect(events.map((event: { type: string }) => event.type)).toContain(
      'InventoryAllocated',
    );
  }).toPass({
    intervals: [200, 500, 1_000, 2_000],
    timeout: 10_000,
  });
});
\`\`\`

The POST sits outside the callback because creating another order on every attempt would change the scenario. Both GETs sit inside because they are the observations that must be refreshed together.

## A consistency window, not three private clocks

Suppose the order status becomes \`allocated\` at second two, briefly reverts during a replay, and the audit event becomes visible at second four. Separate auto-retrying checks can each find a moment when their own condition is true. They do not guarantee the conditions overlap. \`toPass()\` samples the group as a unit.

Think of each callback invocation as a consistency window:

1. Acquire the current order representation.
2. Check its identity and business status.
3. Acquire the event stream representation.
4. Verify the matching event exists.
5. Accept the attempt only if every check holds.

The callback is not a transaction. The system can still change between the two HTTP requests. If strict atomicity matters, expose a server-side diagnostic snapshot or query through an endpoint with appropriate isolation. Block retry improves the observation discipline; it cannot manufacture atomic reads across independent services.

This distinction helps decide among Playwright's waiting tools:

| Mechanism | Repeats | Best fit | Main hazard |
|---|---|---|---|
| Locator assertion | Locator resolution plus one assertion | A DOM property becomes true | Cannot coordinate unrelated observations |
| \`expect.poll()\` | A value-producing function | One derived value changes over time | Awkward when several actions and checks belong together |
| \`expect().toPass()\` | Entire async assertion callback | Several facts must pass in one attempt | Repeats every operation in the callback |
| Test retries | Whole test in a new worker attempt | Environmental or cross-test flake investigation | Repeats setup and hides the exact wait boundary |
| Fixed timeout | Nothing, execution pauses | Rare external timing constraint | Slow and blind to early readiness |

For a single status code, \`expect.poll\` communicates intent more directly. For a visible label, a locator assertion is simpler. Reach for \`toPass\` when the unit of eventual truth is genuinely a block.

## Setting intervals from the system's cadence

Playwright accepts an \`intervals\` array of millisecond delays and a \`timeout\` for the matcher. The documented default intervals are short and general purpose. Production-like systems often have a known rhythm: a queue poll every second, a cache refresh every five seconds, or a batch projection every thirty seconds. Your schedule should sample that rhythm without hammering the dependency.

An interval list is consumed in order. If attempts continue after the list is exhausted, the last interval is reused. A useful schedule typically begins quickly enough to keep fast paths fast, then backs off:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('export completes and exposes a stable download', async ({ page }) => {
  await page.goto('/reports/quarterly');
  await page.getByRole('button', { name: 'Generate CSV' }).click();

  const reportRow = page.getByRole('row', { name: /Quarterly revenue/ });

  await expect(async () => {
    await expect(reportRow.getByTestId('state')).toHaveText('Ready', {
      timeout: 1_000,
    });
    await expect(reportRow.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      /^\/api\/exports\/[a-f0-9-]+\.csv$/,
      { timeout: 1_000 },
    );
    await expect(reportRow.getByTestId('size')).not.toHaveText('0 bytes', {
      timeout: 1_000,
    });
  }).toPass({
    intervals: [250, 500, 1_000, 2_000],
    timeout: 15_000,
  });
});
\`\`\`

There are two clocks here. Each locator assertion has an inner timeout, and \`toPass\` has an outer timeout. Long inner waits can make an attempt consume most of the outer budget and blur the retry behavior. Keep inner timeouts short when the goal is to resample the whole block. If the first locator alone deserves a long web-first wait, perform that prerequisite before \`toPass\`, then retry only the remaining consistency checks.

One easily missed detail is that \`toPass\` defaults to a timeout of zero and does not inherit the general \`expect.timeout\` setting. Zero does not mean "run once." Under the test runner a zero timeout falls back to the remaining test-level deadline, so the block keeps resampling on the \`[100, 250, 500, 1000]\` ms interval schedule until the whole test times out; in library mode (no runner) a zero timeout retries forever. The real hazard is the opposite of running once: a slow-to-stabilize block silently eats the entire test budget before failing. Set an explicit \`timeout\` in the matcher options to bound the retry window instead of relying on the test deadline.

## Keep mutations beyond the retry boundary

The fastest way to misuse \`toPass\` is to put a state-changing command in the callback. A click, POST, message publish, or database update may run multiple times. Even when the product promises idempotency, repeating the mutation changes what the test proves: it may be the third submission, not the original submission, that eventually succeeded.

Classify callback operations before committing the test:

| Operation | Safe by default? | Better placement |
|---|---:|---|
| GET a resource | Usually | Inside, to refresh the observation |
| Read locator text | Yes | Inside |
| Query a test-only read model | Usually | Inside, with bounded load |
| Click a refresh button | No | Prefer page reload or direct read if possible |
| Create or submit entity | No | Once, before the callback |
| Acknowledge queue message | No | Never as an observation |
| Call idempotent reconciliation endpoint | Context dependent | Separate setup step, assert idempotency independently |

Even reads can have effects. Some legacy GET endpoints update \`lastViewedAt\`, consume one-time tokens, or trigger lazy initialization. Know the application contract. The word "read" in the test does not make an endpoint safe.

When the UI itself only refreshes after a button click, first ask whether the product behavior is what users experience. If a user must click Refresh, one click followed by retried assertions is legitimate. Repeatedly clicking until the result appears tests a different interaction and can mask a missed event.

## Build probes that explain their last failure

An eventual assertion that times out should tell the investigator which state was actually observed. Generic messages such as "expected allocated, received pending" are useful, but a multi-source check benefits from context attached to each assertion.

Capture only diagnostic values from the current attempt. Do not accumulate huge response bodies across all attempts. Playwright reports the last failure, so label checks with the entity and source:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('invoice and ledger converge on the same amount', async ({ request }) => {
  const invoiceId = 'inv-test-184';

  await expect(async () => {
    const [invoiceResponse, ledgerResponse] = await Promise.all([
      request.get(\`/api/invoices/\${invoiceId}\`),
      request.get(\`/internal/ledger/entries?invoiceId=\${invoiceId}\`),
    ]);

    expect(
      invoiceResponse.ok(),
      \`invoice endpoint for \${invoiceId}\`,
    ).toBeTruthy();
    expect(
      ledgerResponse.ok(),
      \`ledger endpoint for \${invoiceId}\`,
    ).toBeTruthy();

    const invoice = await invoiceResponse.json();
    const ledger = await ledgerResponse.json();

    expect(invoice.state, \`invoice state for \${invoiceId}\`).toBe('posted');
    expect(ledger.entries, \`single ledger entry for \${invoiceId}\`).toHaveLength(1);
    expect(
      ledger.entries[0].amount,
      \`ledger amount for \${invoiceId}\`,
    ).toBe(invoice.total);
  }).toPass({ timeout: 20_000, intervals: [500, 1_000, 2_000] });
});
\`\`\`

Parallel reads reduce skew when the endpoints are independent. Do not use \`Promise.all\` if one request relies on a token or identifier returned by the other. Also consider load: five probes that each fan out to eight services can become an accidental stress test in a parallel suite.

For deep debugging, attach the final response payload after catching the matcher failure, then rethrow it. Avoid logging every attempt in normal CI because it creates noise and may expose sensitive data. Test diagnostics should follow the same redaction rules as application logs.

## Designing a retryable domain assertion

Repeated blocks become hard to maintain when every spec knows endpoint paths, response shapes, and timing. Extract a domain probe, not a generic "retry helper." \`toPass\` already is the retry helper. Your abstraction should express what a coherent state means.

\`\`\`typescript
import { APIRequestContext, expect } from '@playwright/test';

export async function expectShipmentDispatched(
  request: APIRequestContext,
  shipmentId: string,
): Promise<void> {
  await expect(async () => {
    const response = await request.get(\`/api/shipments/\${shipmentId}\`);
    expect(response.status()).toBe(200);
    const shipment = await response.json();

    expect(shipment.stage).toBe('dispatched');
    expect(shipment.trackingNumber).toMatch(/^[A-Z0-9]{10,24}$/);
    expect(shipment.timeline.at(-1)).toMatchObject({
      type: 'DISPATCHED',
      trackingNumber: shipment.trackingNumber,
    });
  }).toPass({
    timeout: 12_000,
    intervals: [300, 700, 1_500],
  });
}
\`\`\`

This function owns the operational expectation for shipment projection latency. If one environment has a fundamentally different service-level objective, pass a named profile rather than sprinkling arbitrary timeout overrides through tests. Timing is part of the system contract, so changes deserve review.

Avoid a wrapper that accepts an arbitrary callback and silently applies a sixty-second timeout. It removes the visual clue that code will be repeated and encourages unsafe mutations. Keeping \`toPass\` visible in domain helpers makes the retry boundary auditable.

## Failure modes worth testing deliberately

A reliable retry test must still fail for the right defects. Before trusting one, inject or simulate representative bad states:

- The primary resource never leaves \`pending\`.
- The projection reaches the final status but carries the wrong entity ID.
- The event is duplicated.
- Two services converge on different amounts.
- The endpoint returns a transient 503, then recovers.
- The response oscillates and never holds a coherent combination.

The duplicated event case is important. \`toContain\` accepts one or many matches. If exactly-once publication is required, filter by type and entity ID and assert a length of one. Eventual checks should be as precise as settled-state checks.

Oscillation exposes another nuance: one passing sample ends the matcher. If the requirement is sustained stability, \`toPass\` alone is insufficient. After the first coherent sample, wait for the domain's stability period and sample again, or build a probe that collects multiple read-only samples during one attempt. Be explicit about whether you need "eventually observed once" or "remains valid."

If a 401 or 403 appears, do not automatically retry it for twenty seconds. Authentication errors are seldom eventual. You can assert response status first, and the callback will still retry, but that delays a deterministic failure. A preflight outside the block can validate credentials, while the retry block handles only the known asynchronous transition.

## toPass() with soft assertions and test retries

Soft assertions record failures and allow execution to continue. That behavior conflicts with the callback contract: \`toPass\` needs a thrown failure to know an attempt did not pass. Keep assertions inside the callback hard. If you need several diagnostics, compute them first and assert a structured object once, or use custom messages.

Test retries operate at a larger scope. They rerun fixtures, navigation, mutation, and the eventual check. Configure them for genuinely nondeterministic infrastructure or browser-level incidents, not as a substitute for modeling a known asynchronous process. A test can reasonably use both: \`toPass\` handles the expected ten-second projection window, while a limited CI retry addresses an occasional browser crash. Their reports should make the difference visible.

For related assertion behavior, the [Playwright soft assertions and expect guide](/blog/playwright-soft-assertions-expect-guide) explains when collecting several failures is appropriate. The [Playwright retries and flaky-test handling guide](/blog/playwright-retries-flaky-test-handling-guide) covers runner-level retries and classification.

## Review checklist for a block retry

Before merging, review the callback as if it were a loop:

| Review question | Desired answer |
|---|---|
| Can every operation run more than once? | Yes, all are read-only or intentionally idempotent |
| Does each attempt reacquire changing state? | Yes, no snapshot is declared outside |
| Must all assertions be true together? | Yes, otherwise use a simpler wait |
| Is the timeout tied to a known latency budget? | Yes, with modest scheduling margin |
| Are inner assertion timeouts controlled? | Yes, no hidden minute-long attempt |
| Will the final error identify the lagging source? | Yes, messages include domain context |
| Is request volume acceptable in parallel CI? | Yes, intervals apply backoff |
| Could one lucky sample hide oscillation? | Addressed if sustained stability is required |

A block that passes this review is usually smaller than the code it replaced. It avoids sleeps, avoids duplicated polling utilities, and states the consistency contract in executable form.

## Prevent a probe from creating an impossible mixed snapshot

Two independent reads inside one attempt can still straddle a state transition. Imagine the order endpoint is read before a cancellation and the event endpoint is read after it. Both responses are fresh, but their combination never represented one committed version. Repeating the block may eventually find a coherent sample, yet a passing attempt does not prove every intermediate response was consistent.

Where this risk matters, give related representations a shared version. The order payload and event projection can expose a monotonically increasing revision, checkpoint, or event position. Assert that the projection has processed at least the revision responsible for the order state. A correlation ID alone proves association, not freshness.

Another option is a purpose-built observation endpoint that returns the business entity and projection checkpoint from a server-side transaction. This is preferable for financial reconciliation or invariants that must hold atomically. Do not add such an endpoint solely to make a fragile test pass; make it a controlled operational diagnostic with the same authorization and redaction discipline as other internal interfaces.

If eventual coherence is the actual contract, the multi-read probe remains appropriate. Document that the matcher seeks one acceptable observation rather than proving linearizability. Precision about that claim prevents a polling test from being cited as evidence for a stronger consistency guarantee than the architecture provides.

## Frequently Asked Questions

### Does toPass() use the timeout configured for ordinary Playwright assertions?

No. \`toPass\` has its own timeout behavior, and its default timeout is zero. It does not automatically adopt the general expect timeout. A zero default still retries: under the runner it uses the remaining test deadline, and in library mode it retries forever. Supply an explicit \`timeout\` in the matcher options to bound how long retrying continues.

### Why does my callback run only once?

An omitted timeout is not the cause; \`toPass\` keeps retrying by default. If the block truly runs once, the usual reason is that failures never throw. Soft assertions, or code that catches and suppresses assertion errors, make the first attempt look successful so \`toPass\` returns immediately. Confirm the callback throws on failure, then it will resample.

### Should locator assertions inside toPass() have a zero timeout?

Not necessarily. A small inner timeout can absorb normal rendering jitter, but it should be short relative to the outer budget. Long inner timeouts reduce the number of whole-block samples and can make failures harder to interpret.

### Can I click a button inside the retried function?

Only if repeating that click is part of the product requirement and is safe. In the common case, click once before the block and put fresh observations inside it. Treat the callback as a loop during review.

### When is expect.poll() clearer than toPass()?

Use \`expect.poll\` when one function returns the changing value you need to match, such as a job status or queue depth. Use \`toPass\` when several reads and assertions must succeed within the same attempt.
`,
};
