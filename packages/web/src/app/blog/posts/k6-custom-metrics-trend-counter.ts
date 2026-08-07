import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Custom Metrics with Trend and Counter: A Testable Design',
  description: 'Build k6 custom metrics Trend Counter instrumentation that measures business latency and event volume, adds safe tags, and enforces meaningful CI thresholds.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# k6 Custom Metrics with Trend and Counter: A Testable Design

k6 custom metrics with \`Trend\` and \`Counter\` let a performance test measure behavior that built-in HTTP metrics cannot express. Use a \`Trend\` for numeric observations whose distribution matters, such as end-to-end checkout time, queue delay, or items returned. Use a \`Counter\` for accumulated occurrences, such as accepted orders, retry attempts, or business-rule rejections. Create metrics in the init context, call \`add\` when the event actually occurs, attach bounded tags, and apply thresholds to the resulting metric or tagged submetric.

The hard part is not importing two classes. It is deciding what one sample means. A trend populated only on success can make latency look excellent while failures rise. A counter incremented once per iteration can be mistaken for accepted transactions. Tags built from user IDs can explode series cardinality. This guide designs the measurement contract first, implements a runnable k6 script, and shows how to test the instrumentation itself before trusting a load-test report.

## Choose the metric from the question you need answered

Start with a sentence a reviewer should be able to complete: "For every ___, record ___." If the blank produces many numeric observations and you care about percentiles, use a trend. If the blank describes occurrences that must be totaled, use a counter. Built-in metrics should remain the source for network-level questions they already answer well.

| Question | Metric choice | Sample meaning | Useful output |
|---|---|---|---|
| How long did the whole purchase journey take? | Custom Trend | One duration per attempted journey | Median and tail percentiles |
| How many orders were accepted? | Custom Counter | One increment per accepted order | Total count |
| How often did the client retry? | Custom Counter | One increment per retry request | Retry volume |
| How many items did search return? | Custom Trend | Result count from each valid response | Distribution of result sizes |
| How slow was one HTTP request? | Built-in \`http_req_duration\` | One HTTP timing sample | Request latency percentiles |
| Did assertions pass? | Built-in checks rate | One result per check | Passed-check proportion |

Do not create \`my_response_time\` merely to duplicate \`http_req_duration\`. Duplicate instrumentation can disagree because timers start and stop at different boundaries. A custom trend is justified when the boundary is intentionally different, such as a multi-request workflow or time reported by an asynchronous job.

Similarly, a counter should name the event, not an ambiguous outcome. \`orders_accepted\` tells a reviewer when to increment. \`order_count\` leaves open whether it counts attempts, successful responses, created database rows, or items in the cart.

## Understand what Trend and Counter actually aggregate

Both metric types receive samples through \`add\`, and both can take tags with a sample. Their aggregation semantics differ.

| Property | \`Trend\` | \`Counter\` |
|---|---|---|
| Input | Numeric observation | Numeric increment |
| Natural use | Distribution | Accumulation |
| Common threshold expression | \`p(95)<value\`, \`avg<value\` | \`count>value\` |
| Example | Journey duration in milliseconds | Accepted-order events |
| Frequent mistake | Omitting slow failed attempts | Incrementing for attempts but naming successes |

The \`Trend\` constructor accepts a metric name and can optionally mark values as time. When time semantics are enabled, k6 formats the values as durations. The values added should therefore use a consistent time unit. The following script records milliseconds returned by \`Date.now()\` differences.

\`Counter\` adds the numeric values you provide. Calling \`add(1)\` once per accepted order produces an event count. Calling \`add(response.json('quantity'))\` would instead accumulate item quantities, which is valid but should be named accordingly, for example \`items_accepted_total\`.

Create custom metrics before virtual-user code runs:

\`\`\`js
import { Counter, Trend } from 'k6/metrics';

const checkoutJourneyMs = new Trend('checkout_journey_ms', true);
const ordersAccepted = new Counter('orders_accepted');
const checkoutRetries = new Counter('checkout_retries');
\`\`\`

Custom metrics are created in the init context. Keeping declarations at module scope makes every virtual user contribute to the same named test metrics while k6 handles sample collection.

## Write the sample contract before the script

Add a short metric catalog beside the test. It prevents future editors from moving an \`add\` call without understanding the effect.

| Metric | Unit | Emission condition | Tags | Exclusions |
|---|---|---|---|---|
| \`checkout_journey_ms\` | Milliseconds | Once after each started journey reaches a terminal outcome | \`outcome\`, \`payment_path\` | Setup and think time |
| \`orders_accepted\` | Orders | Once after response confirms order acceptance | \`payment_path\` | Rejected and indeterminate attempts |
| \`checkout_retries\` | Requests | Once immediately before each retry request | \`reason\` | Initial request |

Notice that the duration trend includes failed terminal outcomes. It uses an \`outcome\` tag so success latency can be filtered, but the unfiltered metric still represents all attempts. If failed journeys were omitted, a fast-failing service could report a deceptively low latency.

Define terminal outcome carefully. A transport timeout is terminal if the test will not retry. A \`202 Accepted\` response may be only an intermediate state if the user journey waits for an asynchronous confirmation. The metric boundary should match the workload's user-visible behavior.

## Implement a checkout example with precise emission points

The script below shows one request and a response-based business assertion. URLs and limits are examples, not recommendations for a production service.

\`\`\`js
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const checkoutJourneyMs = new Trend('checkout_journey_ms', true);
const ordersAccepted = new Counter('orders_accepted');
const businessRejections = new Counter('business_rejections');

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    checkout_journey_ms: ['p(95)<1200'],
    'checkout_journey_ms{outcome:accepted}': ['p(95)<900'],
    orders_accepted: ['count>0'],
  },
};

export default function () {
  const startedAt = Date.now();
  const response = http.post(
    'https://test.example.com/api/orders',
    JSON.stringify({ sku: 'QA-BOOK', quantity: 1 }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'create-order' },
    },
  );

  const accepted = check(response, {
    'order accepted': (res) => res.status === 201,
  });

  const outcome = accepted ? 'accepted' : 'failed';
  checkoutJourneyMs.add(Date.now() - startedAt, { outcome });

  if (accepted) {
    ordersAccepted.add(1);
  } else if (response.status === 422) {
    businessRejections.add(1, { reason: 'validation' });
  }
}
\`\`\`

The \`check\` return value indicates whether all checks in that call passed, which makes it usable as the branch condition here. The HTTP request still contributes built-in metrics, while the custom metrics describe the business event and journey boundary.

In a real service, status alone may not prove acceptance. Validate a stable response field if the contract requires it. Avoid brittle parsing that throws before the duration sample is recorded. If parsing can fail, classify it as a terminal outcome and record the trend in a \`finally\` block or explicit error path.

## Record every terminal path without double counting

Complex journeys have success, expected rejection, timeout, parsing failure, and unexpected response paths. Centralize final recording so exactly one duration sample is emitted per attempt and counters increment only for their own event.

\`\`\`js
import { Counter, Trend } from 'k6/metrics';

const journeyMs = new Trend('purchase_journey_ms', true);
const accepted = new Counter('purchase_accepted');
const rejected = new Counter('purchase_rejected');
const indeterminate = new Counter('purchase_indeterminate');

function recordOutcome(startedAt, outcome, paymentPath) {
  journeyMs.add(Date.now() - startedAt, { outcome, payment_path: paymentPath });

  if (outcome === 'accepted') accepted.add(1, { payment_path: paymentPath });
  if (outcome === 'rejected') rejected.add(1, { payment_path: paymentPath });
  if (outcome === 'indeterminate') {
    indeterminate.add(1, { payment_path: paymentPath });
  }
}

export default function () {
  const startedAt = Date.now();
  const paymentPath = 'card';
  let outcome = 'indeterminate';

  try {
    outcome = runPurchase(paymentPath);
  } finally {
    recordOutcome(startedAt, outcome, paymentPath);
  }
}

function runPurchase() {
  // Replace with the requests and contract checks for the tested system.
  return 'accepted';
}
\`\`\`

The \`finally\` block prevents thrown script errors from silently removing the journey observation. Be cautious: if an iteration aborts outside the code path, the metric may still be absent. Compare attempted, terminal, and accepted counters if strict accounting matters.

A conservation rule is valuable: \`attempted = accepted + rejected + indeterminate\`. k6 thresholds do not express every cross-metric arithmetic relationship directly, so export the summary or metric stream to the team's analysis layer and assert the invariant there. Within the script, one outcome variable and one recorder reduce the chance of imbalance.

## Keep tags finite, stable, and diagnostic

Tags turn one metric into filtered submetrics. They are powerful for comparing business paths, but every unique tag combination increases the number of series the test and output system must handle.

Good tags come from a small controlled vocabulary:

| Tag | Safe values | Diagnostic use | Avoid |
|---|---|---|---|
| \`outcome\` | \`accepted\`, \`rejected\`, \`indeterminate\` | Separates terminal results | Raw error message |
| \`payment_path\` | \`card\`, \`wallet\`, \`invoice\` | Compares supported flows | Card token or account ID |
| \`reason\` | \`timeout\`, \`validation\`, \`upstream\` | Groups retry or failure class | Stack trace |
| \`region\` | Approved test regions | Finds location skew | Hostname containing ephemeral IDs |

Never use order IDs, timestamps, free-form search strings, user emails, trace IDs, or exception messages as metric tags. Put high-cardinality diagnostics in logs or traces with a correlation field, not in time-series dimensions.

Create constants for tag values so a typo does not split \`accepted\` and \`acceptted\` into separate series:

\`\`\`js
const outcome = Object.freeze({
  accepted: 'accepted',
  rejected: 'rejected',
  indeterminate: 'indeterminate',
});

const paymentPath = Object.freeze({
  card: 'card',
  wallet: 'wallet',
  invoice: 'invoice',
});

journeyMs.add(642, {
  outcome: outcome.accepted,
  payment_path: paymentPath.card,
});
\`\`\`

Tags should describe the sample at emission time. If a request begins on card and falls back to wallet, decide whether the journey tag means initial path, final path, or a separate fallback flag. Document the choice rather than changing tag meaning between code branches.

## Set thresholds that match the metric's semantics

Thresholds are pass or fail criteria over metric aggregates. For trends, tail percentiles are usually more revealing than an average, although the correct statistic follows the objective. For counters, a minimum count can catch a workload that never reached the intended business path.

\`\`\`js
export const options = {
  thresholds: {
    purchase_journey_ms: ['p(95)<1500', 'p(99)<2500'],
    'purchase_journey_ms{outcome:accepted}': ['p(95)<1200'],
    purchase_accepted: ['count>50'],
    purchase_indeterminate: ['count<2'],
  },
};
\`\`\`

The numbers are illustrative and only meaningful with a defined load model and test duration. A minimum accepted count depends on how many iterations the test is expected to attempt. It can fail because the system rejected orders, because the test generated too little load, or because the counter was never incremented. Always interpret it alongside iteration counts, built-in request failures, and checks.

Avoid a counter threshold as the only error-rate gate. Ten indeterminate outcomes are catastrophic in a twenty-attempt smoke test and minor in a million-attempt endurance test. k6 includes rate metrics for proportions, and a custom \`Rate\` may fit a ratio question better. Use a counter when the total occurrence volume itself is the contract or when external analysis will calculate a ratio against a well-defined denominator.

For broader tool selection and protocol tradeoffs, [k6 versus JMeter](/blog/k6-vs-jmeter-2026) helps place this script-level instrumentation in context. If the workload runs across CI workers, the operational ideas in [Playwright test sharding and parallel CI](/blog/playwright-test-sharding-parallel-ci-guide) are useful for thinking about partition ownership, although performance samples require their own aggregation discipline.

## Validate instrumentation with a deterministic fake service

Performance scripts are test code and can contain bugs. Before generating load, run a tiny scenario against a controllable endpoint that returns known sequences: two acceptances, one validation rejection, one slow response. Confirm the counter totals, outcome tags, and trend sample count match the fixture.

A small Node service can provide predictable routes for local validation:

\`\`\`js
import http from 'node:http';

let requestNumber = 0;

const server = http.createServer((request, response) => {
  if (request.url !== '/api/orders') {
    response.writeHead(404).end();
    return;
  }

  requestNumber += 1;
  if (requestNumber % 3 === 0) {
    response.writeHead(422, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ code: 'OUT_OF_STOCK' }));
    return;
  }

  response.writeHead(201, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ accepted: true, id: \`test-\${requestNumber}\` }));
});

server.listen(8080);
\`\`\`

Point a short k6 validation script at \`http://localhost:8080\`, use one virtual user and a controlled number of iterations, then inspect the end-of-test summary. Because the service behavior is deterministic for sequential requests, a mismatch indicates script instrumentation rather than system capacity.

Also test a connection failure and malformed JSON path. These are the branches most likely to skip an \`add\` call. Keep the validation mode separate from the real load profile so a local fake does not become part of a performance baseline.

## Diagnose the misleadingly fast trend failure

A common production test shows \`checkout_journey_ms p(95)=410 ms\`, comfortably under its threshold, while users report timeouts. The script records the trend only inside \`if (accepted)\`. Slow timeouts and failed responses never produce samples.

Diagnose it with accounting:

1. Compare iteration count with the number of journey trend observations in the detailed output or analysis backend.
2. Inspect every control-flow path between timer start and metric emission.
3. Force a timeout or failing response using a deterministic service.
4. Confirm the failure produces an \`outcome:indeterminate\` duration sample.
5. Keep the success-filtered threshold, but add an unfiltered journey threshold or failure guardrail.

This failure illustrates what people get wrong about custom metrics: instrumentation is not automatically objective because it produces numbers. The placement of \`add\` selects the population. Missing samples are often more damaging than slightly inaccurate samples because the report gives no visible warning that difficult outcomes vanished.

Another deceptive result occurs when \`orders_accepted.add(1)\` runs after any HTTP 2xx response even though the response body says the business operation was rejected. Align counter emission with the domain contract, not a broad transport category.

## Account for retries without inflating success

Retries create two distinct quantities: request attempts and business operations. Count them separately. One order journey may send three requests, incur two retries, and result in one accepted order.

\`\`\`js
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const orderAttempts = new Counter('order_request_attempts');
const orderRetries = new Counter('order_retries');
const ordersAccepted = new Counter('orders_accepted');

function submitWithOneRetry(url, body, params) {
  orderAttempts.add(1);
  let response = http.post(url, body, params);

  if (response.status >= 500) {
    orderRetries.add(1, { reason: 'server_error' });
    orderAttempts.add(1);
    response = http.post(url, body, params);
  }

  if (response.status === 201) {
    ordersAccepted.add(1);
  }
  return response;
}
\`\`\`

The example limits retry count deliberately. A real retry policy must match the client behavior being modeled and should avoid synchronized retry storms. If the API supports idempotency semantics, use the appropriate application contract so repeated requests do not create duplicate business operations.

Do not increment \`ordersAccepted\` for both the first response and a later status poll that confirms the same order. Decide which event establishes acceptance and emit exactly once.

## Review metric output with workload context

A trend percentile without sample count and load context is incomplete. Include scenario, virtual users or arrival configuration, test duration, generated iterations, request failure rate, and relevant counter totals in the report. When comparing builds, verify that the populations are comparable.

If one build accepts fewer orders, its success-only latency trend may improve simply because hard requests were rejected. Review accepted count, rejection count, and unfiltered journey duration together. Segment by a small number of designed tags only after checking the overall view.

Distributed execution adds another concern: totals and distributions must be aggregated across all load generators by the supported output system. Do not average worker p95 values. Percentiles must be calculated from the combined sample distribution or an aggregation method designed for that purpose. Likewise, ensure a minimum counter threshold applies to the full run rather than being interpreted independently per accidental test partition.

Version the metric catalog with the script. A renamed metric or changed emission condition breaks historical comparability even if the workload stays constant. Note such changes in the result metadata and start a new baseline when semantics change.

Review units at the same time. A trend called \`queue_wait_ms\` should receive milliseconds on every path, including values decoded from service responses. If one endpoint reports seconds and another reports milliseconds, the combined distribution is mathematically valid but operationally useless. Add a fixture with a known value, such as 250 milliseconds, and confirm the summary displays the expected magnitude. Unit suffixes in metric names are not enforced by k6, so the test code and its catalog must enforce that contract.

Also compare metric totals after a script refactor. A stable service with a sudden halving of \`orders_accepted\` and unchanged request volume may indicate an emission regression rather than a product regression. Instrumentation changes deserve the same review discipline as assertion changes because they redefine the evidence a release gate consumes.

## Frequently Asked Questions

### When should I use a Trend instead of the built-in HTTP duration metric?

Use the built-in HTTP timing metrics for a single request's network phases and overall request duration. Add a Trend when the measured boundary is genuinely different, such as a login journey spanning several requests, time from submission to asynchronous completion, queue delay returned by the service, or result-set size. Document the unit and emission condition. Do not duplicate built-in duration under a new name, because reviewers may assume the values are comparable even when timer boundaries or failure handling differ.

### Does a Counter automatically represent a failure rate?

No. A Counter accumulates the numeric increments added to it. A total failure count has no denominator, so its severity depends on how many attempts occurred and how long the test ran. Use a rate metric when the primary question is the proportion of events that failed, or calculate the ratio in an analysis system from clearly matched counters. A counter remains useful for absolute limits, rare event volume, retry amplification, and accounting checks, but its name and report must state what event each increment represents.

### Can custom metric tags contain request or user identifiers?

They technically accept tag values, but unique request, user, order, timestamp, or trace identifiers are a poor metric design. They create high-cardinality series, increase processing and storage cost, and make threshold groups unstable. Restrict metric tags to reviewed finite values such as outcome class, payment path, or test region. Put unique identifiers in logs or traces and connect them through a correlation field. The metric should reveal which category is unhealthy; the trace should identify the individual event.

### How do I prove that a custom metric is not missing samples?

Define an accounting invariant and exercise every terminal path against a deterministic fake service. For a journey, count attempts and classify each as accepted, rejected, or indeterminate, then verify those outcomes sum to attempts. Force success, validation failure, timeout, malformed response, and thrown-script paths. Inspect the emitted samples or end summary and make sure the duration recorder runs once per started journey. Repeat this validation whenever control flow changes, because a misplaced return or exception can silently bias the measured population.
`,
};
