import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Thresholds per Endpoint: A Practical Performance Guide',
  description: 'Use k6 thresholds per endpoint to enforce distinct latency and error budgets, control tag cardinality, diagnose failures, and build reliable CI gates.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# k6 Thresholds per Endpoint: A Practical Performance Guide

k6 thresholds per endpoint are implemented by tagging requests with a stable endpoint identifier and defining threshold keys that filter built-in or custom metrics by that tag. This lets a checkout write have a different latency budget from a catalog read, while a failed threshold makes the test fail for automation. The critical design choice is to tag logical route templates, not raw dynamic URLs.

A production-ready setup normally combines an overall service guardrail with endpoint-specific duration and failure-rate thresholds. It also generates enough samples per endpoint to make percentiles meaningful, preserves checks for functional correctness, and avoids unbounded tag values. This guide builds that setup step by step and shows how to diagnose failures that aggregate metrics hide.

## Start from endpoint service objectives, not copied numbers

Thresholds are pass or fail criteria for metric aggregates. Before writing k6 syntax, identify the user or service expectation for each endpoint. A search endpoint may permit a slower tail because it performs complex ranking. A session refresh endpoint may need a tight latency budget because it blocks many interactions. An asynchronous export request might be judged on acceptance latency rather than job completion.

Avoid choosing every target from one global average. Average latency can remain healthy while a small but critical endpoint becomes unusable. Likewise, a percentile target without an error-rate target can look good if failed requests return quickly.

| Endpoint class | Useful duration view | Companion signal | Reason |
|---|---|---|---|
| User-blocking read | p(95) and possibly p(99) | Failed-request rate | Tail delay affects interaction |
| Synchronous write | p(95) | Failed rate plus content check | Fast rejected writes are not success |
| Authentication | Tail percentile | Expected status and error rate | Failures cascade across journeys |
| Async job submission | Acceptance duration | Accepted response check | Completion is measured elsewhere |
| Health probe | Tight duration | Availability rate | Simple dependency signal |

Derive values from an agreed SLO, production evidence, and the load profile used in the test. This article uses example limits to illustrate syntax, not universal performance requirements.

## Understand how tagged thresholds work

k6 attaches tags to metric samples. A threshold key can select a metric plus a tag filter using the documented form \`metric_name{tag_name:tag_value}\`. Requests accept user-defined tags in their parameters, and built-in HTTP metrics such as \`http_req_duration\` and \`http_req_failed\` inherit those tags.

The smallest per-endpoint example is:

\`\`\`js
import http from 'k6/http';

export const options = {
  thresholds: {
    'http_req_duration{endpoint:catalog-list}': ['p(95)<300'],
    'http_req_failed{endpoint:catalog-list}': ['rate<0.01'],
  },
};

export default function () {
  http.get('https://test.example.com/api/catalog', {
    tags: { endpoint: 'catalog-list' },
  });
}
\`\`\`

Threshold duration values are interpreted in milliseconds for duration trends. The rate expression uses a decimal fraction, so \`0.01\` represents one percent. When a threshold fails, k6 reports the failure and exits with a non-zero status, which makes it suitable for CI gating. Official threshold syntax is documented at https://grafana.com/docs/k6/latest/using-k6/thresholds/.

## Prefer a dedicated endpoint tag over raw URLs

k6 provides system tags including \`name\`, \`method\`, \`status\`, \`url\`, \`scenario\`, and \`expected_response\`. The default request name is based on the URL. For dynamic paths such as \`/orders/8172\`, using each full URL as an identity creates many unique time series and makes stable thresholds difficult.

Assign a bounded logical endpoint value such as \`order-detail\` or \`GET /orders/:id\`. A dedicated \`endpoint\` tag is easy to read and does not overload the request name. Alternatively, deliberately set the built-in \`name\` tag to a normalized route. Pick one convention and apply it consistently.

| Tag strategy | Example value | Advantage | Risk |
|---|---|---|---|
| Dedicated endpoint | \`order-detail\` | Clear threshold intent | Requires team convention |
| Normalized name | \`GET /orders/:id\` | Uses familiar system tag | Other code may set name differently |
| Raw URL | \`/orders/8172\` | No extra work | High cardinality and fragmented data |
| Group | \`::checkout::submit\` | Useful for journey sections | Group duration includes all work inside |

Do not tag by user ID, order ID, timestamp, request UUID, or arbitrary search term. Tags are dimensions for aggregation, not a place to copy every diagnostic value.

## Centralize endpoint names and thresholds

Typos can silently split samples. If the request uses \`checkout-submit\` while the threshold filters \`checkout-submission\`, the intended submetric receives no matching samples. Centralize endpoint identifiers and build threshold keys from them.

\`\`\`js
import http from 'k6/http';

const endpoint = Object.freeze({
  catalogList: 'catalog-list',
  orderDetail: 'order-detail',
  checkoutSubmit: 'checkout-submit',
});

const taggedMetric = (metric, endpointName) =>
  \`\${metric}{endpoint:\${endpointName}}\`;

export const options = {
  thresholds: {
    [taggedMetric('http_req_duration', endpoint.catalogList)]: ['p(95)<300'],
    [taggedMetric('http_req_duration', endpoint.orderDetail)]: ['p(95)<450'],
    [taggedMetric('http_req_duration', endpoint.checkoutSubmit)]: ['p(95)<700'],
  },
};

export default function () {
  http.get('https://test.example.com/api/catalog', {
    tags: { endpoint: endpoint.catalogList },
  });
}
\`\`\`

A shared constant does not prove every threshold receives samples, so add execution checks described later.

## Combine per-endpoint and global guardrails

Endpoint thresholds locate regressions, while aggregate thresholds catch traffic not yet classified or systemic degradation. Use both. A new request that lacks the endpoint tag will contribute to the global HTTP metrics, so the service-level threshold still offers protection.

\`\`\`js
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800'],

    'http_req_failed{endpoint:catalog-list}': ['rate<0.01'],
    'http_req_duration{endpoint:catalog-list}': ['p(95)<300'],

    'http_req_failed{endpoint:checkout-submit}': ['rate<0.005'],
    'http_req_duration{endpoint:checkout-submit}': [
      'p(95)<700',
      'p(99)<1200',
    ],
  },
};
\`\`\`

The limits are examples. Note that an endpoint sample contributes to its tagged submetric and to the aggregate metric. This is intended, but it means the thresholds are related rather than independent experiments.

## Match metric aggregation to the question

k6 metrics have types, and threshold expressions use aggregations supported by those types. \`http_req_duration\` is a Trend, so duration thresholds commonly use \`avg\`, \`min\`, \`max\`, \`med\`, or \`p(N)\`. \`http_req_failed\` is a Rate, so use \`rate\`. \`http_reqs\` is a Counter, for which count and rate aggregations are relevant.

| Metric question | Metric type | Example expression | Interpretation |
|---|---|---|---|
| Did most calls meet latency? | Trend | \`p(95)<400\` | 95th percentile below 400 ms |
| Did the endpoint stay reliable? | Rate | \`rate<0.01\` | Less than one percent failed |
| Was enough traffic generated? | Counter | \`count>=500\` | At least 500 samples |
| Was the worst observed call bounded? | Trend | \`max<2000\` | No observed duration at or above limit |

Use \`max\` cautiously. One environmental pause can fail a long run, while a percentile can hide a small number of severe outliers. The right combination follows the service objective and test purpose.

## Define endpoint-specific request helpers

A helper can enforce tag consistency without hiding request semantics. Keep methods explicit and allow headers, bodies, and expected checks to remain visible. Do not create a magical wrapper that changes error classification or discards responses.

\`\`\`js
import http from 'k6/http';

const baseUrl = __ENV.BASE_URL || 'https://test.example.com';

function getOrder(orderId, params = {}) {
  return http.get(\`\${baseUrl}/api/orders/\${orderId}\`, {
    ...params,
    tags: {
      ...params.tags,
      endpoint: 'order-detail',
    },
  });
}

function submitCheckout(body, params = {}) {
  return http.post(\`\${baseUrl}/api/checkout\`, JSON.stringify(body), {
    ...params,
    headers: {
      'Content-Type': 'application/json',
      ...params.headers,
    },
    tags: {
      ...params.tags,
      endpoint: 'checkout-submit',
    },
  });
}
\`\`\`

The merge order above makes the endpoint identity authoritative while permitting other tags. Review whether callers should ever override it. Validate \`BASE_URL\` in setup code if a missing variable must be a hard failure rather than using a safe test default.

## Keep checks and thresholds in separate roles

A check evaluates a condition for individual iterations and records the result. A threshold evaluates aggregated metrics and determines test pass or fail. Checks do not automatically become a quality gate unless a threshold is applied to the check rate or another failure metric captures the condition.

HTTP status classification also deserves attention. By default, statuses from 200 through 399 are considered expected for the built-in failed-request metric. If an endpoint intentionally expects another status, or if a redirect should be treated as failure, use the documented response callback facilities and verify behavior in your test. The official reference is https://grafana.com/docs/k6/latest/javascript-api/k6-http/set-response-callback/.

\`\`\`js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  thresholds: {
    'checks{endpoint:order-detail}': ['rate>0.99'],
    'http_req_failed{endpoint:order-detail}': ['rate<0.01'],
    'http_req_duration{endpoint:order-detail}': ['p(95)<450'],
  },
};

export default function () {
  const response = http.get('https://test.example.com/api/orders/fixture-17', {
    tags: { endpoint: 'order-detail' },
  });

  check(response, {
    'order response is usable': res => res.status === 200 && Boolean(res.json('id')),
  }, { endpoint: 'order-detail' });
}
\`\`\`

The third \`check\` argument applies tags to check metrics. Tagging the request does not automatically mean a separately emitted check carries every user-defined tag, so make the intended grouping explicit.

## Generate enough samples for endpoint percentiles

A p(95) based on a handful of endpoint requests is fragile. Your load model determines how many samples each route receives. A journey might call catalog endpoints frequently and checkout only once, leaving checkout thresholds with far less evidence.

Estimate endpoint volume before the run: iteration rate multiplied by calls per iteration and duration, adjusted for branching and failures. After the run, inspect endpoint-specific request counts. A threshold on \`http_reqs\` filtered by the same tag can enforce a minimum sample count when that fits the test design.

\`\`\`js
export const options = {
  thresholds: {
    'http_reqs{endpoint:checkout-submit}': ['count>=200'],
    'http_req_duration{endpoint:checkout-submit}': ['p(95)<700'],
    'http_req_failed{endpoint:checkout-submit}': ['rate<0.005'],
  },
};
\`\`\`

Do not use an arbitrary count in every environment. A pull-request smoke run may intentionally generate fewer samples and should use a different performance claim than a scheduled load run.

## Separate endpoint budgets by scenario when necessary

The same endpoint can behave differently under distinct workload phases or user types. k6 automatically tags metrics with the scenario name. Threshold filters can combine relevant tags if you need a separate budget for a scenario, though excessive combinations increase the number of submetrics and the maintenance burden.

Use scenario-specific thresholds when the performance contract truly differs, not merely to excuse a weak result. For example, a heavy administrative export scenario can share an endpoint with interactive queries but impose a different request mix. If the service objective is identical for all callers, keep one endpoint threshold.

| Need | Recommended dimension | Avoid |
|---|---|---|
| Different logical route | Endpoint tag | Raw dynamic path |
| Different traffic generator | Scenario system tag | Virtual-user identifier |
| Different deployment | Test-wide environment tag in external output | Endpoint threshold per pod |
| Different expected result | Check tag or bounded outcome tag | Response body value |

Every added dimension should have a bounded set of values and an owner who uses it for analysis.

## Use abort-on-fail only for protective conditions

k6 supports the long threshold format with \`threshold\`, \`abortOnFail\`, and \`delayAbortEval\`. Aborting can save time and protect an overloaded test environment, but early data is volatile. A delay allows samples to accumulate before evaluation.

\`\`\`js
export const options = {
  thresholds: {
    'http_req_failed{endpoint:checkout-submit}': [
      {
        threshold: 'rate<0.10',
        abortOnFail: true,
        delayAbortEval: '30s',
      },
    ],
    'http_req_duration{endpoint:checkout-submit}': ['p(95)<700'],
  },
};
\`\`\`

Here, ten percent is an illustrative emergency cutoff, not the normal error budget. The official documentation notes that evaluation timing can differ in cloud execution, so consult the current threshold documentation for your execution environment. Do not expect an abort to occur at the exact instant one slow request appears.

## Diagnose the healthy-average, broken-checkout failure

Imagine a mixed test with nine catalog reads for every checkout submission. The overall p(95) remains under 400 ms, yet checkout climbs to 1.8 seconds. The aggregate passes because catalog samples dominate. Users still experience a slow purchase.

Diagnosis is straightforward if tags are sound:

1. Confirm checkout calls carry the expected endpoint tag.
2. Inspect the endpoint-specific request count.
3. Compare checkout duration, failure rate, and check rate.
4. Split by status only for diagnosis, not as an unbounded permanent threshold set.
5. Compare server traces for the same test window.
6. Verify the load generator was not saturated.

If the tagged metric has zero or unexpectedly few samples, suspect naming drift, a skipped branch, setup failure, or threshold filter mismatch before blaming the application.

## Catch tag mismatch before it creates a false pass

What people get wrong is assuming a declared threshold proves the endpoint ran. A spelling mismatch can produce a submetric with no meaningful samples, and the summary may not communicate the problem the way the team expects. Pair important latency gates with minimum request counts, keep identifiers centralized, and inspect the summary during review.

A source-level test can at least verify that the endpoint registry and threshold builder agree:

\`\`\`js
const endpointBudgets = {
  'catalog-list': { p95: 300, maxErrorRate: 0.01 },
  'order-detail': { p95: 450, maxErrorRate: 0.01 },
  'checkout-submit': { p95: 700, maxErrorRate: 0.005 },
};

function buildThresholds(budgets) {
  const thresholds = {};
  for (const [name, budget] of Object.entries(budgets)) {
    thresholds[\`http_req_duration{endpoint:\${name}}\`] = [\`p(95)<\${budget.p95}\`];
    thresholds[\`http_req_failed{endpoint:\${name}}\`] = [
      \`rate<\${budget.maxErrorRate}\`,
    ];
  }
  return thresholds;
}

export const options = { thresholds: buildThresholds(endpointBudgets) };
\`\`\`

Keep the configuration readable. Generating hundreds of opaque threshold keys from a remote spreadsheet makes code review and incident diagnosis harder.

## Avoid masking failures with response speed

An endpoint returning 401 immediately can have excellent duration and terrible usability. Always pair latency with failure classification and content checks appropriate to the scenario. Confirm that authentication setup succeeded before load generation. If the script accepts redirects or expected error responses, verify those semantics explicitly.

For negative tests, a 404 or 409 may be the correct result. In that case, give the request a distinct logical endpoint or outcome class and configure expected response behavior deliberately. Do not mix intentional negative calls into a success endpoint's failed-request rate, then loosen the threshold to make the dashboard green.

| Symptom | Misleading interpretation | Diagnostic action |
|---|---|---|
| Very low latency plus high failures | Service is fast | Inspect status and checks |
| Good p(95), extreme max | Harmless noise | Inspect tail count and infrastructure |
| Zero tagged requests | Endpoint is perfect | Verify branch and tag spelling |
| Check failures, HTTP success | Network is healthy | Inspect response semantics |
| Rising duration, stable errors | No incident | Correlate saturation and queueing |

Performance and correctness are separate signals that must agree.

## Control cardinality and observability cost

Each unique tag combination can expand metrics in outputs. Endpoint tags should come from a small registry. Status, scenario, and method are bounded enough for common analysis, while resource identifiers and arbitrary inputs are not. The official tags guidance is at https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/.

If detailed request-level debugging is needed, use logs or traces with appropriate sampling and privacy controls rather than metric tags. High-cardinality tags can increase storage and query cost in external time-series systems and make summaries harder to reason about.

Review cardinality whenever an AI coding agent generates or edits a k6 script. Agents often infer that more context in tags is always helpful. A QA review rule should reject identifiers whose value set grows with traffic.

## Integrate per-endpoint gates into CI

Run a short, controlled smoke performance job on changes where it provides signal, and run longer tests in stable environments on a schedule or before release. Threshold failures already produce a non-zero k6 exit status, so the shell does not need custom parsing to decide pass or fail.

\`\`\`yaml
name: endpoint-performance

on:
  workflow_dispatch:

jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run endpoint thresholds
        uses: grafana/run-k6-action@v1
        with:
          path: performance/endpoints.js
\`\`\`

Verify the current official action documentation before adopting third-party workflow inputs, and pin dependencies according to your organization's supply-chain policy. The central CI behavior is simple: keep the k6 exit status visible and archive enough output to identify which tagged threshold failed.

For teams spreading performance work across runners, the [Playwright test sharding and parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide) offers useful CI design context, although k6 load generation has different coordination needs. For choosing between scripting and GUI-oriented load tools, the [k6 versus JMeter comparison](/blog/k6-vs-jmeter-2026) frames the broader tradeoffs.

## Review AI-generated k6 changes with a contract checklist

AI coding agents can draft repetitive threshold maps effectively, but a reviewer must validate the performance contract. Check that every threshold tag exactly matches a request tag, dynamic paths are normalized, error rates use decimal fractions, duration values match intended units, functional checks cover meaningful responses, and sample counts support percentile claims.

Also confirm that the agent did not invent an option or executor setting. Run \`k6 inspect\` or the documented local validation workflow available in your installed k6 toolchain, then execute a small test against a controlled target. The safest proof is the tool accepting the script and producing the expected tagged submetrics.

If reusable QA capability instructions would help your agents generate and review load tests, ready-made QA skills install from qaskills.sh with the qaskills CLI. Treat generated thresholds as proposed SLO code, not authoritative numbers.

## Evolve endpoint budgets without normalizing regressions

Threshold changes deserve the same review as API or test expectations. When a budget is loosened, require evidence: a revised product objective, corrected workload assumption, or approved architectural constraint. Do not raise p(95) automatically because a test began failing. That converts thresholds from guardrails into a record of degradation.

When tightening a budget, inspect recent representative runs and ensure the load environment is stable enough to support the claim. Roll out new endpoint gates in an informational period if necessary, then make them blocking on an explicit date. Preserve historical values in version control so trend interpretation includes the contract that applied at the time.

| Budget change | Evidence to request | Regression risk |
|---|---|---|
| Looser latency | Updated user or service objective | Hides slower experience |
| Higher error allowance | Approved reliability tradeoff | Normalizes failed requests |
| New endpoint gate | Stable tag and sample volume | False confidence from no data |
| New percentile | Sufficient sample count | Volatile pass or fail |
| Abort condition | Environment protection need | Stops before diagnosis data |

Thresholds are executable expectations. Their review should focus on user impact, not only syntax.

## A complete adoption sequence

Inventory logical endpoints and assign bounded tag values. Map each endpoint to an agreed latency and reliability objective. Add request tags through explicit helpers, then define global and filtered thresholds. Include content checks and, for critical routes, minimum request counts. Run a controlled test and inspect that every expected submetric has samples.

Next, add CI execution in a stable environment and preserve summaries for triage. Monitor tag cardinality in external outputs. When a failure occurs, separate application latency, response correctness, workload generation, and generator health. Review any budget edit with the service owner.

The result is more than a colorful summary. Each logical API route has a testable contract, regressions identify the affected endpoint, and automation fails for the same reasons users would notice.

## Frequently Asked Questions

### Should every API endpoint have its own k6 threshold?

Not necessarily. Give separate thresholds to endpoints with distinct user impact, service objectives, risk, or performance characteristics. Low-volume administrative routes may belong in another test, while several equivalent read routes can sometimes share a bounded category. Avoid hundreds of gates that nobody owns. Start with critical paths, verify each receives enough samples, and expand when aggregate metrics hide actionable differences. The goal is diagnostic and contractual value, not one threshold entry per URL.

### Why does a tagged endpoint threshold show too few samples?

First compare the threshold filter with the exact request tag value. Then verify the code branch executed, setup completed, and the workload generated the expected route frequency. Dynamic tag values or a typo can fragment the metric. A failed authentication step can also skip later requests. Add a filtered \`http_reqs\` count threshold for critical endpoints when appropriate, and inspect raw or external output to confirm which tags were attached to samples.

### Can checks replace http_req_failed thresholds?

No. They answer related but different questions. \`http_req_failed\` reflects k6's expected-response classification for HTTP requests, while checks can validate application content and any custom condition. A 200 response with the wrong body may pass the HTTP classification and fail a check. Conversely, an intentional negative response may require deliberate expected-status handling. Use endpoint-tagged failure-rate, duration, and relevant check-rate thresholds together when all three are part of the contract.

### When is abortOnFail appropriate for an endpoint threshold?

Use it when continuing the test would waste resources, overload a fragile environment, or provide little additional evidence after a severe condition is established. Add \`delayAbortEval\` when early samples are too volatile, and retain non-aborting diagnostic thresholds where more data is valuable. Do not use immediate abort as a substitute for an ordinary SLO gate. Evaluation timing depends on the execution environment, so verify current k6 behavior and ensure archived output still identifies the triggering endpoint.
`,
};
