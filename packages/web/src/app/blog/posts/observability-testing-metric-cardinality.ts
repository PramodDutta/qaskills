import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Observability Testing for Metric Cardinality Before It Reaches Production',
  description: 'Use observability testing metric cardinality checks to catch unbounded labels, budget time series, and protect dashboards and alerts before release.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Observability Testing for Metric Cardinality Before It Reaches Production

Observability testing metric cardinality means verifying that instrumentation creates a bounded, intentional number of time series under representative and adversarial input. The workflow is to inventory metric labels, calculate a series budget, generate varied requests, scrape the emitted metrics, count unique label sets, and fail when a label grows beyond its approved domain.

This catches instrumentation defects that ordinary functional tests miss. A request ID, raw URL, user email, exception message, or AI prompt placed in a metric label can create a new series for nearly every operation. The application may remain correct while the monitoring backend consumes more memory, queries slow down, dashboards become unreliable, and alert evaluation suffers. A cardinality test turns “be careful with labels” into an executable release gate.

## Model Cardinality as a Product of Label Domains

A metric series is identified by its metric name and complete label set. If an HTTP counter has 5 methods, 20 normalized routes, 5 status classes, and 3 service versions, its theoretical combination space is 1,500 series. Not every combination will occur, but multiplying known domains exposes budgets that cannot work before any load test runs.

Cardinality is not the number of samples. One series sampled every 15 seconds produces many samples but remains one active series. Conversely, a counter emitted once for each unique request ID produces many series even if each has only one sample. Tests must count distinct label sets, not metric lines over time without deduplication.

| Label candidate | Expected domain | Cardinality risk | Safer representation |
|---|---:|---|---|
| HTTP method | Small protocol set | Low | Label such as \`method="GET"\` |
| Route template | Bounded application routes | Moderate | \`/users/:id\`, not the raw path |
| Status class | Usually five classes | Low | \`2xx\`, \`4xx\`, \`5xx\` when exact codes are unnecessary |
| Deployment revision | Bounded active releases | Moderate | Label only if release comparison is required |
| User ID | Grows with customers | Unbounded | Logs or traces with access controls |
| Request ID | Unique per operation | Unbounded | Trace and log correlation field |
| Exception message | Includes dynamic values | Unbounded | Stable error type or error code |
| AI model name | Small configured allowlist | Low if normalized | Canonical model identifier |

Start with a budget sheet owned by the service team. Include the metric, why each label is needed, its permitted values or upper bound, the expected combination count, and the response when the budget is exceeded. A budget is an engineering constraint, not an exact prediction of backend cost. Retention, scrape interval, churn, and backend implementation also affect cost.

\`\`\`yaml
metrics:
  http_requests_total:
    labels:
      method: [GET, POST, PUT, PATCH, DELETE]
      route_max: 40
      status_class: [2xx, 3xx, 4xx, 5xx]
    active_series_budget: 800
  agent_tool_calls_total:
    labels:
      tool_max: 25
      outcome: [success, rejected, error]
    active_series_budget: 75
forbidden_labels:
  - request_id
  - user_id
  - prompt
  - raw_url
\`\`\`

These limits are illustrative. A repository can keep a reviewed file like this beside instrumentation tests so an AI coding agent sees the same constraints as human reviewers.

## Audit Instrumentation at the Source

Static review finds obvious hazards before a service runs. Search metric constructors and label calls for identity-like values. Review any label sourced from route parameters, query strings, headers, free text, database keys, exception strings, file paths, or agent-generated content.

The following TypeScript example shows bounded labels and a route normalizer. It does not depend on a metrics package, so the rule is clear and runnable:

\`\`\`ts
type Labels = Readonly<Record<string, string>>;

class SeriesRecorder {
  private readonly keys = new Set<string>();

  record(metric: string, labels: Labels): void {
    const ordered = Object.entries(labels).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    this.keys.add(JSON.stringify([metric, ordered]));
  }

  count(): number {
    return this.keys.size;
  }
}

function routeTemplate(pathname: string): string {
  if (/^\\/users\\/[^/]+$/.test(pathname)) return '/users/:id';
  if (/^\\/orders\\/[^/]+$/.test(pathname)) return '/orders/:id';
  return 'unmatched';
}

const metrics = new SeriesRecorder();
for (let id = 1; id <= 1_000; id += 1) {
  metrics.record('http_requests_total', {
    method: 'GET',
    route: routeTemplate(\`/users/\${id}\`),
    status_class: '2xx',
  });
}

if (metrics.count() !== 1) {
  throw new Error(\`expected one series, received \${metrics.count()}\`);
}
\`\`\`

The dynamic user IDs never enter the label set. An unmatched route is deliberately collapsed to a stable value. In production, track an unmatched-route counter and investigate it through logs. Do not “fix” the counter by placing the raw unknown path in a label.

Static checks cannot prove runtime behavior. Middleware may expose a resolved route name in one framework state and a raw path in another. Error handlers may add labels only on uncommon branches. Follow review with black-box requests and scrape analysis.

## Calculate the Budget Before Running Load

Use a small executable calculation to document the expected upper bound. The calculation should distinguish additive metrics from multiplicative labels. It should also include replicated targets when estimating backend-wide series, since each scraped instance usually creates distinct series through target labels.

\`\`\`js
function combinationCount(domains) {
  return domains.reduce((product, size) => product * size, 1);
}

const perInstance = combinationCount([
  5,  // methods
  40, // route templates
  4,  // status classes
]);
const replicas = 6;
const estimatedActiveSeries = perInstance * replicas;

console.log(JSON.stringify({ perInstance, replicas, estimatedActiveSeries }));

if (estimatedActiveSeries > 5_000) {
  throw new Error('http metric exceeds reviewed illustrative budget');
}
\`\`\`

The comments make assumptions visible. If exact HTTP status is operationally required, use the actual bounded status domain instead of class. If route and method combinations are constrained by the router, a generated route inventory can provide a tighter estimate than a Cartesian product. Retain the conservative product when uncertainty is safer.

| Budget view | Calculation | What it answers |
|---|---|---|
| Per metric, per instance | Product of label domain sizes | Can this instrumentation design remain bounded? |
| Fleet active series | Per-instance series times active targets | What is the likely backend footprint now? |
| Churn over a window | Newly created label sets per time period | Are short-lived values continuously replacing series? |
| Query fan-out | Series matched by a dashboard or rule | Will a critical query scan too much data? |

Do not collapse all four into one number. A deployment label with three active values can have modest active cardinality but substantial churn if every commit creates a new value that remains in retained blocks. A query scoped to one service may be safe even when the backend stores many unrelated series.

## Generate Adversarial Inputs That Resemble Real Traffic

A good cardinality fixture varies values that should not create series: resource IDs, query parameters, long invalid paths, tenant identifiers, trace IDs, exception details, and user-controlled agent names. It also covers expected bounded dimensions, such as method, route, and outcome.

This Vitest test demonstrates the key invariant. It intentionally sends 2,000 unique IDs and proves the recorder has only the expected bounded combinations:

\`\`\`ts
import { expect, test } from 'vitest';

type RequestObservation = {
  method: 'GET' | 'POST';
  pathname: string;
  status: number;
};

function labelsFor(observation: RequestObservation): Record<string, string> {
  const route = /^\\/users\\/[^/]+$/.test(observation.pathname)
    ? '/users/:id'
    : 'unmatched';
  return {
    method: observation.method,
    route,
    status_class: \`\${Math.floor(observation.status / 100)}xx\`,
  };
}

test('unique user paths do not create unique metric labels', () => {
  const series = new Set<string>();
  for (let id = 0; id < 2_000; id += 1) {
    const observation: RequestObservation = {
      method: id % 2 === 0 ? 'GET' : 'POST',
      pathname: \`/users/user-\${id}\`,
      status: id % 5 === 0 ? 404 : 200,
    };
    series.add(JSON.stringify(labelsFor(observation)));
  }

  expect(series.size).toBe(4);
  for (const key of series) {
    expect(key).not.toMatch(/user-\\d+/);
  }
});
\`\`\`

Vitest selects tests by name with \`-t\` or \`--testNamePattern\`, for example \`npx vitest run -t "unique user paths"\`. The full CI run should include all instrumentation tests because a safe HTTP metric does not prove that queue, database, or AI-agent metrics are safe.

Property-based generation is useful when already present in the repository, but it is not required. A deterministic loop with documented classes of hostile input is easier to debug and can be extended whenever a production incident reveals a new pattern.

## Scrape the Service and Count Unique Series

Source review can miss labels added by a metrics library, framework, or scrape configuration. Start the real service, drive the workload, fetch its Prometheus text exposition endpoint, and count the series for the metric under test. The Prometheus exposition format identifies a series by its metric name and label set; HELP and TYPE lines are metadata and must not be counted.

This Node.js script accepts a metrics URL and metric name, then counts unique exposition lines after removing sample values and timestamps. It is deliberately limited to one metric and common text-format samples, which keeps its purpose auditable:

\`\`\`js
const metricsUrl = process.argv[2];
const metricName = process.argv[3];

if (!metricsUrl || !metricName) {
  throw new Error('usage: node count-series.js <url> <metric-name>');
}

const response = await fetch(metricsUrl);
if (!response.ok) {
  throw new Error(\`scrape failed with HTTP \${response.status}\`);
}

const body = await response.text();
const series = new Set();

for (const line of body.split('\\n')) {
  if (line.startsWith('#') || line.trim() === '') continue;
  const sample = line.trim().split(/\\s+/)[0];
  const name = sample.includes('{') ? sample.slice(0, sample.indexOf('{')) : sample;
  if (name === metricName) series.add(sample);
}

process.stdout.write(\`\${JSON.stringify({ metricName, count: series.size })}\\n\`);
\`\`\`

Save it as an ES module, such as \`count-series.mjs\`, because it uses top-level \`await\`. Invoke it after the adversarial workload:

\`\`\`bash
set -euo pipefail

metrics_url="http://127.0.0.1:9464/metrics"
metric_name="http_requests_total"
budget="800"

result="$(node count-series.mjs "\${metrics_url}" "\${metric_name}")"
count="$(node -e 'const value=JSON.parse(process.argv[1]); console.log(value.count)' "\${result}")"

if [ "\${count}" -gt "\${budget}" ]; then
  echo "series budget exceeded: \${count} > \${budget}" >&2
  exit 1
fi
\`\`\`

This check counts the target's current exposition. It does not estimate retained historical churn inside the monitoring backend, and it does not understand every nuance of all exposition formats. Use a standards-aware parser already approved in your stack if you need broader format support. The official Prometheus exposition documentation is at https://prometheus.io/docs/instrumenting/exposition_formats/.

## Detect Label Leakage, Not Just Excess Count

A budget can still pass when a few sensitive values leak into labels. Add assertions against forbidden label names and representative secret or identity patterns. Prefer structural allowlists over a giant collection of regular expressions. If a metric is approved to have only \`method\`, \`route\`, and \`status_class\`, any fourth label introduced by application code should trigger review.

\`\`\`ts
import { strict as assert } from 'node:assert';

const allowed = new Set(['method', 'route', 'status_class']);

function assertAllowedLabels(labels: Record<string, string>): void {
  for (const [name, value] of Object.entries(labels)) {
    assert.ok(allowed.has(name), \`unexpected label name: \${name}\`);
    assert.ok(!value.includes('@'), \`possible email in label: \${name}\`);
    assert.ok(value.length <= 80, \`label value too long: \${name}\`);
  }
}

assertAllowedLabels({
  method: 'GET',
  route: '/users/:id',
  status_class: '2xx',
});
\`\`\`

Length is only a heuristic, and 80 is illustrative. It cannot establish that a value is safe. A short customer ID is still high cardinality and may still be sensitive. The strongest test checks each label against an approved semantic domain.

Metric labels are not a substitute for logs or traces. Put request IDs and tenant IDs in structured diagnostic records with appropriate access and retention. Then use exemplars or trace correlation features supported by your observability stack when you need to move from an aggregate metric to one representative operation.

## Query the Monitoring Backend for Fleet Evidence

Target-level scraping proves what one process emits. A staging monitoring backend reveals labels added by discovery, multiple replicas, recording rules, and churn across restarts. For Prometheus, use its documented HTTP API and PromQL with care. Query only the scoped staging tenant or service used by the test.

Useful PromQL shapes include:

\`\`\`promql
count({__name__="http_requests_total", service="catalog"})
\`\`\`

\`\`\`promql
count by (route) (
  {__name__="http_requests_total", service="catalog"}
)
\`\`\`

\`\`\`promql
count(count by (instance) (
  {__name__="http_requests_total", service="catalog"}
))
\`\`\`

The first counts matching active series at query time. The second reveals which route values dominate. The third counts the observed instance label values among matching series. Scope queries tightly because an unqualified selector can itself be expensive on a large backend.

Prometheus also documents TSDB status information in its HTTP API, but availability and response details depend on the server and deployment. Treat backend-wide data as supporting evidence, not a portable assertion for every vendor. In managed systems, use the provider's official cardinality explorer or API rather than assuming Prometheus administration endpoints are exposed.

## Diagnose a Raw-Path Cardinality Incident

Consider a service that labels requests with \`request.url\`. Normal smoke tests exercise \`/users/1\` and \`/users/2\`, so dashboards appear healthy. A crawler then requests tens of thousands of unique invalid paths. Each 404 produces a distinct label value. The active series count rises, scrape payloads expand, query latency worsens, and an alert using the same metric evaluates slowly.

Diagnose it with an evidence chain:

1. Identify the metric family with the largest unexpected growth.
2. Group its series by label name and inspect the dominant value count.
3. Compare values to route templates and look for IDs or raw invalid paths.
4. Check deployment history to locate the instrumentation change.
5. Reproduce with unique paths against one isolated instance.
6. Replace raw paths with resolved templates plus a stable \`unmatched\` value.
7. Verify the fix with both a scrape count and a backend query after old series age out according to normal retention.

Deleting data is not the first response. Stop creating the unbounded series, protect the backend, and follow the operational procedure for retention or deletion supported by your platform. Historical series may remain queryable even after the application fix, so dashboards will not always drop instantly.

## What People Get Wrong About Metric Cardinality

The most common error is testing only happy-path labels. Cardinality failures live in dynamic IDs, invalid routes, error messages, filenames, and user-generated values. Generate those deliberately. A second error is counting label values independently and adding them. Labels combine multiplicatively, so individually modest domains can create a large product.

Teams also remove every label to minimize cost. That produces cheap metrics that cannot answer operational questions. The goal is bounded, useful dimensions. Keep labels that support routing, ownership, service level, and diagnosis, while moving identities and free text elsewhere.

Another mistake is treating active series and churn as identical. A frequently changing deployment or ephemeral instance label can generate historical churn even when only a few values are active. Finally, a dashboard that loads once is not proof of safety. Test the emitted label model directly and validate critical queries under the representative series set.

## Make Cardinality Review Part of Delivery

Add instrumentation ownership to code review. When a metric changes, require its purpose, label domains, estimated series count, privacy review, and test. Run source and component checks on every pull request. Run the real-service scrape test when instrumentation or routing changes. Use a staging backend check periodically to catch target labels and churn outside the application.

| Delivery checkpoint | Automated evidence | Reviewer question |
|---|---|---|
| Metric definition | Approved label names and bounded domains | Can any value grow with users or requests? |
| Component test | Unique input does not increase series unexpectedly | Does every error branch normalize labels? |
| Service scrape | Actual unique label sets stay within budget | Did framework middleware add dimensions? |
| Staging backend | Fleet count and dominant values are explainable | Are replica and deployment labels necessary? |
| Dashboard and alert test | Critical query remains scoped and meaningful | Will query cost grow with unsafe labels? |

Use the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) when deciding where metric unit tests, service integration tests, and browser checks belong. If a Playwright flow creates the adversarial request mix, the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) keep UI interactions stable while the scrape remains the cardinality oracle.

Do not have the browser infer cardinality from a dashboard visualization. Query the target exposition or observability API and assert the numeric result directly. The dashboard can have a separate rendering test, but its pixels are indirect evidence of the underlying label set.

## Measure Churn Across Restarts and Deployments

An endpoint scrape is a snapshot, so it can miss a label that changes once per deployment. Build identifiers, instance names, ephemeral queue names, and dynamically generated agent identifiers may stay bounded at any moment while continuously producing new historical series. Test churn by repeating a short workload across several disposable process starts and collecting the union of observed label sets.

Keep stable target metadata separate from application-controlled labels in the report. A monitoring system may add \`instance\`, \`job\`, cluster, or environment labels during ingestion even though they do not appear in the endpoint exposition. Application tests own the labels the process emits. Fleet tests own the final ingested series identity. This ownership split prevents teams from deleting a useful application label when an unnecessary discovery label is the actual source of growth.

For each restart, compare three numbers: series currently exposed, series never seen in earlier runs, and series used by critical queries. A healthy restart with stable instrumentation should recreate substantially the same application label sets. If every start introduces a generated worker name, trace token, or revision that dashboards never filter on, remove or normalize that dimension. If a revision label is necessary for rollout diagnosis, document how many revisions remain active and verify that queries constrain it appropriately.

Historical retention means a corrected deployment does not immediately erase old series. Mark the fix by deployment time, confirm that the rate of new unsafe series falls to zero, and allow normal retention to age out old data. This separates successful remediation from an unrealistic expectation that stored history disappears as soon as code changes.

## Guard Metrics Created by AI-Agent Workflows

AI coding and execution systems introduce attractive but dangerous dimensions. Prompt text, conversation ID, tool arguments, generated file path, model response, repository path, and agent run ID are useful for tracing one operation, but they are poor metric labels because their value spaces are open-ended. Instrument the stable operational questions instead: configured tool name, bounded outcome, workflow stage, error category, and whether a human handoff occurred.

Tool names need normalization when agents or plugins can supply them dynamically. Maintain an allowlist for supported tools and map everything else to a stable unknown category. Do not use the unknown tool's raw name as a second label, which recreates the problem. Record the original value in a controlled log or trace if it is required for diagnosis. Apply the same rule to model identifiers, provider response codes, and workflow step names.

Adversarial testing should include agent-generated strings designed to look like paths, emails, UUIDs, timestamps, and multiline errors. Pass them through the instrumentation boundary and prove that the series count stays fixed. Also check that no label value contains a recognizable portion of the prompt or tool argument. A cardinality budget alone can miss leakage when the fixture creates only a few unique secrets.

Measure the questions operators truly need. A counter grouped by tool and outcome can show that browser actions are failing more often than file reads. A histogram grouped by stable workflow stage can show where latency accumulates. A gauge labeled by run ID would instead create a series per run and still be awkward for aggregate analysis. Store per-run state in the execution system, not in a time-series label.

When an AI agent edits instrumentation, make the budget file and label allowlist part of its task context. Require the agent to name every new label's bounded domain and add a unique-input test. Code review should reject a claim such as “low cardinality” without a domain calculation. Generated code can be syntactically correct and functionally useful while creating an operational cost that appears only after thousands of runs.

Finally, distinguish tenant-level service objectives from tenant identity in all metrics. If a small fixed set of service tiers requires different objectives, a tier label may be bounded and useful. A tenant ID normally is not. Per-tenant investigation belongs in logs, traces, or a purpose-built analytics store whose indexing and retention are designed for that access pattern.

## Frequently Asked Questions

### What is a high-cardinality metric label?

A label is high cardinality when it can take many distinct values relative to the approved operational need and system budget. User IDs, request IDs, raw URLs, timestamps, and free-form errors are common examples because their domains grow with traffic or data. There is no universal numeric cutoff. Evaluate the full combination of labels, number of targets, churn over time, scrape interval, retention, and backend limits. A bounded route label can be useful even if it has dozens of values.

### How do I test cardinality without a monitoring backend?

Run the real service, generate representative and adversarial requests, scrape its metrics endpoint, and count unique label sets for each metric under test. Compare those counts and label names with a reviewed budget. This catches application and library instrumentation problems without Prometheus or another backend. Add a backend-level staging test later to cover discovery labels, replicas, recording rules, historical churn, and query behavior that a single target cannot represent.

### Should request IDs ever appear in metrics?

Do not use request IDs as ordinary metric labels because they normally create one series per request. Put them in logs and traces, where high-cardinality correlation fields belong and where retention and access can be controlled appropriately. If your metrics and tracing stack supports exemplars, use the documented exemplar mechanism to associate selected samples with traces. That preserves aggregate metric behavior without turning every request identity into a persistent time series label.

### How often should metric cardinality budgets be reviewed?

Review a metric whenever its labels, routing, deployment topology, or expected tenant scale changes. Run automated bounded-domain tests in pull requests and a fleet-level report on a regular operational cadence. Also review immediately after a cardinality incident or observability backend change. A budget based on five replicas and twenty routes becomes stale when either dimension grows. Store assumptions beside the tests so reviewers can update the calculation rather than treating one threshold as permanent.
`,
};
