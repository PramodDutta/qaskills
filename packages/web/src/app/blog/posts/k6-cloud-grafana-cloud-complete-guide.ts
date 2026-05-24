import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Cloud and Grafana Cloud Complete Guide for 2026',
  description:
    'Master k6 Cloud and Grafana Cloud k6 with cloud execution, distributed load generators, results storage, dashboards, and CI integration. Production patterns.',
  date: '2026-05-01',
  category: 'Performance',
  content: `
# k6 Cloud and Grafana Cloud Complete Guide for 2026

k6 Cloud, now branded as Grafana Cloud k6, transforms the open-source k6 load testing tool into a managed, distributed, observability-first performance testing platform. Where local k6 runs are limited by the resources of a single machine, Grafana Cloud k6 spins up dozens of load generators across global regions, persists every run in a queryable backend, and overlays your application metrics from Prometheus, Loki, and Tempo on the same time axis. The combination converts performance testing from a checkbox in the release process into a continuous engineering discipline that feeds directly into the same observability stack your SREs already trust.

This guide walks through the platform from first principles. We will look at why teams move from local k6 to the cloud, what the architectural differences imply for test design, how to run a test from your laptop and from CI, how the results are stored and queried, what dashboards and alerts ship by default, how to extend them, and how the per-VUh pricing model maps to real budgets. Every section ships with runnable JavaScript snippets, dashboard JSON examples, and the exact CLI flags you need. By the end you will be able to take an existing k6 script, register it in Grafana Cloud, run it from three regions in parallel, ship the results to your Slack channel, and gate a GitHub Actions pull request on the p95 latency. For more on the open-source side see [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing) and explore the [performance skills](/skills) directory.

## Why Move from Local k6 to Grafana Cloud k6

Local k6 is a brilliant single-binary tool that runs anywhere Go runs. It happily generates 30,000 to 40,000 requests per second on a modest laptop and exports results as JSON, CSV, or to time-series backends. The model breaks down quickly though. A 100k VU spike test needs more sockets, more cores, and more network bandwidth than a single machine can provide. Even if you have the machine, the data you produce is ephemeral. You see the summary, maybe a Grafana dashboard pointing at a local Influx, then the result disappears the moment the container exits. There is no shared history, no comparison view, no team workspace, no role-based access, no automatic threshold review across runs.

Grafana Cloud k6 solves five problems at once. First, distributed execution. You declare load generator counts and regions in a \`loadZones\` block and the platform provisions the runners in AWS, GCP, or Azure regions you choose. Second, persistent storage. Every test run is stored with full granularity for 30 to 365 days depending on plan, queryable in PromQL and LogQL. Third, correlated observability. Because Grafana Cloud already hosts your Prometheus and Loki data, the test results appear on the same dashboards as your application metrics with zero glue code. Fourth, collaboration. Tests, runs, dashboards, and thresholds are organization-level objects with RBAC. Fifth, scheduled and CI execution. Tests can run on a cron schedule, on a webhook trigger, or from any CI provider with a single CLI command.

| Capability | Local k6 (OSS) | Grafana Cloud k6 |
|---|---|---|
| Max VUs per test | Limited by host | 100,000+ per run |
| Result storage | Stdout / file / push | 30-365 days persistent |
| Geographic distribution | Manual setup | 21+ load zones |
| Dashboard integration | Manual Grafana | Built-in Grafana Cloud |
| Scheduling | External cron | Built-in scheduler |
| Test comparison | Manual scripts | Side-by-side UI |
| Trace correlation | Manual | OTel + Tempo links |
| Cost model | Free (self-host) | VUh-based pricing |
| RBAC | None | Org + project roles |
| Notification channels | Custom | Slack/PD/Webhook native |

## Setting Up Your Grafana Cloud Stack and Connecting k6

Provisioning Grafana Cloud k6 starts with a Grafana Cloud account. Each stack receives an organization slug, a numeric stack ID, and a k6 access token. The k6 binary is the same one you use locally. You authenticate the CLI by running \`k6 cloud login --token <YOUR_TOKEN>\` once. The token is stored in \`~/.config/loadimpact/k6/config.json\` on Linux and macOS, and in \`%APPDATA%\\loadimpact\\k6\\config.json\` on Windows. From this point forward, any test you run with \`k6 cloud run script.js\` is uploaded, executed remotely, and streamed back to your terminal.

Behind the scenes the cloud CLI archives the script and any imported modules into a tarball, posts it to the API, and the platform schedules load generators. The streaming output you see in the terminal is the same output you would see locally because k6 writes the test progress to stdout from the runner side via a websocket connection. You can disconnect the terminal mid-test and the run continues. Reconnecting with \`k6 cloud logs <test-run-id>\` resumes the stream.

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  cloud: {
    name: 'Checkout API smoke',
    projectID: 384751,
    distribution: {
      'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
      'amazon:de:frankfurt': { loadZone: 'amazon:de:frankfurt', percent: 30 },
      'amazon:in:mumbai': { loadZone: 'amazon:in:mumbai', percent: 20 },
    },
    note: 'Smoke test prior to Black Friday rollout',
  },
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    'http_req_duration{endpoint:checkout}': ['p(95)<1200'],
  },
};

export default function () {
  const res = http.post(
    'https://shop.example.com/api/checkout',
    JSON.stringify({ cartId: 'c-1', token: 't-1' }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'checkout' },
    },
  );
  check(res, {
    'status is 200': (r) => r.status === 200,
    'order id present': (r) => r.json('orderId') !== undefined,
  });
  sleep(1);
}
\`\`\`

The \`cloud\` block in the options object is what turns this from a local script into a cloud-aware one. The \`distribution\` field lets you allocate percentages across load zones. The \`projectID\` selects which Grafana Cloud k6 project receives the results. The \`note\` becomes a searchable tag in the UI. Tags applied with \`tags:\` inside the script become Prometheus labels in the results store, which means you can filter dashboards by endpoint, region, payload size, or any custom dimension.

## Load Zones, Geographic Distribution, and Network Realism

Picking the right load zones is half the art of cloud load testing. A test that hammers your origin from a single region next door to your data center will produce flattering latency numbers that mislead the team. Real users sit on residential broadband in 50 countries with TLS handshakes, DNS lookups, and a 200ms round trip baseline. Grafana Cloud k6 currently offers 21 zones spanning AWS, GCP, and Azure in North America, South America, Europe, Middle East, Africa, Asia, and Oceania. Each zone is identified by a cloud provider, region code, and city.

The distribution map is more than a vanity feature. For a global SaaS product the typical strategy is to weight load zones by the actual geographic distribution of your real traffic, which you can pull from your CDN analytics. If 45 percent of your traffic comes from North America, 30 from Europe, 15 from Asia, and 10 from rest-of-world, your distribution block should mirror that. The platform then reports per-zone metrics so you can see whether the Frankfurt nodes are slower because the Frankfurt origin is overloaded or because the EU CDN cache is cold.

| Region | Zone Identifier | Provider | Typical Latency to US-East |
|---|---|---|---|
| Virginia (US East) | amazon:us:ashburn | AWS | 5 ms |
| Oregon (US West) | amazon:us:portland | AWS | 75 ms |
| Sao Paulo | amazon:br:sao paulo | AWS | 130 ms |
| Dublin | amazon:ie:dublin | AWS | 80 ms |
| Frankfurt | amazon:de:frankfurt | AWS | 95 ms |
| Mumbai | amazon:in:mumbai | AWS | 190 ms |
| Singapore | amazon:sg:singapore | AWS | 230 ms |
| Tokyo | amazon:jp:tokyo | AWS | 175 ms |
| Sydney | amazon:au:sydney | AWS | 215 ms |

You can also force the platform to add network throttling to simulate residential conditions. The \`userAgent\` and \`discardResponseBodies\` options at the script level help you control what is measured. For a realistic mobile test, combine a 3G throttle defined in your network shaping setup with a Chrome iPhone user agent and a smaller think time variance.

## Persistent Results Storage and Querying with PromQL

The piece that elevates Grafana Cloud k6 from a hosted runner into an observability product is the results store. Every metric k6 emits, both the built-in ones such as \`http_req_duration\`, \`iterations\`, \`vus\`, and your own custom Trend, Counter, Rate, or Gauge metrics, lands in a Prometheus-compatible time-series database scoped to your stack. Queries are PromQL with the standard rate, histogram_quantile, sum by, and topk functions. Logs from \`console.log\` calls inside the script ship to Loki and can be queried with LogQL.

A typical run-comparison query looks like this. To compare p95 latency for the checkout endpoint between today and last week:

\`\`\`promql
histogram_quantile(0.95,
  sum by (le, test_run_id) (
    rate(k6_http_req_duration_seconds_bucket{endpoint="checkout"}[5m])
  )
)
\`\`\`

Pin two test_run_ids on a Grafana time series panel and you have a clean before-and-after diff. To get error rate by region:

\`\`\`promql
sum by (load_zone) (
  rate(k6_http_reqs_total{status=~"5.."}[1m])
) /
sum by (load_zone) (
  rate(k6_http_reqs_total[1m])
)
\`\`\`

This style of analysis is impossible with a raw JSON summary. The persistent store lets you build trend dashboards that highlight regressions across sprints. A common pattern is to run a nightly performance smoke test on \`main\` and chart the p95 over time. The first day a regression slips in, the chart bends upward and a Grafana alert fires.

## Test Thresholds and Pass-Fail Gating

Thresholds in k6 are assertions on metrics evaluated at the end of the test. Grafana Cloud k6 honors the same syntax and additionally exposes each threshold as a row in the result detail view, color-coded green or red. A failed threshold causes the CLI to exit non-zero, which is the hook your CI uses to fail a pipeline. Threshold scope is granular. You can target a metric globally, scope to a tag, scope to a specific stage, or scope to a sub-metric.

\`\`\`javascript
export const options = {
  thresholds: {
    'http_req_failed': ['rate<0.005'],
    'http_req_duration': [
      { threshold: 'p(95)<1000', abortOnFail: false },
      { threshold: 'p(99)<2500', abortOnFail: true, delayAbortEval: '1m' },
    ],
    'http_req_duration{endpoint:checkout}': ['p(95)<800'],
    'http_req_duration{endpoint:catalog}': ['p(95)<500'],
    'checks{check:order id present}': ['rate>0.99'],
    'browser_web_vital_lcp': ['p(75)<2500'],
    'browser_web_vital_fid': ['p(75)<100'],
  },
};
\`\`\`

The \`abortOnFail\` flag stops the test immediately when the threshold is breached, saving VU-hours on a test that is already doomed. The \`delayAbortEval\` field gives the system warm-up time before evaluating, which prevents false positives during ramp-up. Pair this with the \`Browser\` module thresholds and your script can fail on Core Web Vitals violations too, bringing the same gates that Lighthouse uses into a load test.

## CI Integration: GitHub Actions, GitLab, Jenkins, and Azure DevOps

Every CI provider can drive Grafana Cloud k6 with the same three-step recipe. Install the k6 binary, set the cloud token as a secret environment variable, then run \`k6 cloud run\` with the script path. The exit code of the CLI is what determines whether the pipeline is green.

\`\`\`yaml
name: Performance
on:
  pull_request:
    paths:
      - 'apps/api/**'
      - 'tests/perf/**'
  schedule:
    - cron: '0 6 * * *'

jobs:
  k6-cloud:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - name: Run smoke on PR
        if: github.event_name == 'pull_request'
        env:
          K6_CLOUD_TOKEN: \${{ secrets.K6_CLOUD_TOKEN }}
        run: |
          k6 cloud run \\
            --env BASE_URL=https://staging.example.com \\
            tests/perf/smoke.js
      - name: Run full load nightly
        if: github.event_name == 'schedule'
        env:
          K6_CLOUD_TOKEN: \${{ secrets.K6_CLOUD_TOKEN }}
        run: |
          k6 cloud run \\
            --env BASE_URL=https://prod.example.com \\
            tests/perf/full.js
\`\`\`

For Jenkins, wrap the same command in a \`sh\` step inside a stage and surface the test URL using the JSON output of \`k6 cloud run -o cloud --quiet\`. For Azure DevOps, use a Bash task with the same logic. The pattern of running a small smoke on every PR and a heavy load nightly is the most common shape in mature teams. It catches regressions cheaply on the PR while still preserving budget for the deep test.

## Scheduled Tests and Synthetic Monitoring

Beyond CI, Grafana Cloud k6 has a built-in scheduler. You upload a script to the platform, attach a cron expression, and the platform runs it on the same shared load generator pool. Use this for synthetic monitoring of critical user journeys. A login-and-checkout journey running every five minutes from three regions costs about 50 VUh per day and produces a live SLA dashboard that pages on-call when error rate or latency breaches a Grafana alert.

Schedules support overlapping windows, time-zone selection, and a maintenance window where the test is skipped to avoid alerting during release rollouts. Combined with Grafana Synthetic Monitoring, which provides simpler HTTP and DNS probes from 21 zones, you get a comprehensive black-box monitoring stack that fits inside the same observability bill.

## Custom Metrics, Tags, and Sub-Metrics

The platform shines when you instrument your test richly. Beyond the built-in HTTP metrics, you can define your own Trend, Counter, Rate, and Gauge metrics. Each can carry tags, and tags become labels in Prometheus. A common pattern is to tag every request with a \`flow\` label such as \`checkout\`, \`search\`, \`login\`, and a \`payload_size\` label such as \`small\`, \`medium\`, \`large\`. Reports then slice by these dimensions trivially.

\`\`\`javascript
import http from 'k6/http';
import { Trend, Counter, Rate } from 'k6/metrics';

const checkoutLatency = new Trend('checkout_latency_ms', true);
const checkoutErrors = new Counter('checkout_errors');
const cartConversion = new Rate('cart_to_order_conversion');

export default function () {
  const res = http.post('https://shop.example.com/api/checkout', payload(), {
    tags: { flow: 'checkout', plan: 'pro' },
  });
  checkoutLatency.add(res.timings.duration, { region: __ENV.REGION });
  if (res.status >= 500) checkoutErrors.add(1, { code: String(res.status) });
  cartConversion.add(res.status === 200);
}
\`\`\`

Tags applied per metric add() call land on that data point. Tags at script options level apply globally. Both are searchable in PromQL with the standard label selector syntax.

## Browser Tests in the Cloud

The k6 browser module, powered by Chromium under the hood, also runs in Grafana Cloud k6. Browser tests cost more VUh per virtual user because each VU drives a real browser process, so you typically run them at a smaller scale. The payoff is real Web Vitals, real network waterfalls, and a real DOM render. Use them for the top three user flows and combine with protocol-level load tests for the rest.

\`\`\`javascript
import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: { browser: { type: 'chromium' } },
      vus: 5,
      iterations: 50,
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(75)<2500'],
    browser_web_vital_cls: ['p(75)<0.1'],
  },
};

export default async function () {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('https://shop.example.com');
  await page.locator('[data-test=search]').type('headphones');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-test=result-card]');
  check(page, { 'has results': async () => (await page.locator('[data-test=result-card]').count()) > 0 });
  await page.close();
}
\`\`\`

## Pricing Model and Cost Control

Grafana Cloud k6 is metered in Virtual User hours, abbreviated VUh. One VUh is one virtual user running for one hour. A test with 500 VUs running for 12 minutes is 100 VUh. The free tier currently includes 500 VUh per month, which is enough for a few small smoke tests per day. Pro plans start at thousands of VUh and scale linearly. Browser VUs typically cost five to ten times protocol VUs due to the resource overhead.

To control cost, use the smoke-then-load pattern. PRs run a 5 VU 1 minute test, which is 0.08 VUh. Nightly main runs a 500 VU 15 minute test, which is 125 VUh. Weekly heavy load runs a 10,000 VU 30 minute soak, which is 5,000 VUh. The bulk of the budget is the weekly soak. Keep an eye on the dashboard that ships out of the box, which shows VUh consumed per project, per day, per workspace.

| Test Type | VUs | Duration | VUh Cost | Frequency | Monthly VUh |
|---|---|---|---|---|---|
| Smoke (PR) | 5 | 1 min | 0.08 | 200 / mo | 16 |
| Regression (nightly) | 200 | 10 min | 33 | 30 / mo | 990 |
| Full load (weekly) | 2,000 | 20 min | 666 | 4 / mo | 2,664 |
| Soak (monthly) | 1,000 | 4 hr | 4,000 | 1 / mo | 4,000 |
| Browser journey | 10 | 5 min | 8 (browser mult) | 100 / mo | 800 |
| Total monthly | - | - | - | - | 8,470 |

## Alerts, Notifications, and Slack Integration

Result-driven alerts ride on Grafana Cloud's own alerting engine. A common pattern is to create a Grafana alert that fires when \`histogram_quantile(0.95, ...)\` exceeds your SLA, with a routing policy that pages PagerDuty during business hours and pings Slack outside. Inside the k6 platform you can additionally configure per-test notifications that fire when a test starts, finishes, or fails a threshold. Slack, MS Teams, webhooks, and email are first-class destinations.

## Comparison Mode and Run Trending

The comparison view is one of the most clicked features in the UI. Pick two test runs and the platform overlays their RPS, latency percentiles, error rate, and custom metrics. Differences are highlighted in red and green. The trending view stacks the last 30 runs of a test and draws a sparkline, which is the cheapest way to spot a slow creep regression.

## Migrating from Local k6 to Grafana Cloud k6

Migration is mostly additive. Add a \`cloud:\` block to your \`options\`. Set the \`K6_CLOUD_TOKEN\` env var. Change \`k6 run\` to \`k6 cloud run\`. Anything that worked locally works in the cloud. The two real gotchas are file-system access and IP allowlists. The cloud runners do not have access to your local file system, so anything you read via \`open()\` must be checked into the repo and bundled in the archive. If your target environment is behind an IP allowlist, you must whitelist the static IPs of each load zone you use. Grafana publishes the IP ranges in the docs and they change occasionally, so use a tag that pulls them dynamically.

## Conclusion and Next Steps

Grafana Cloud k6 turns k6 from a script you run on your laptop into a platform you run the company's performance posture on. Distributed load, persistent storage, correlated observability, and built-in scheduling are the four pillars that make it worth the move. Start small. Sign up for the free tier, port one smoke test, wire it into a single GitHub Action, then build up. Within a quarter you will have a trended dashboard, scheduled smokes, CI gates, and budget alerts, all without leaving the Grafana ecosystem your SREs already love.

Browse the full [performance testing skills](/skills) catalog or read [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing) for a deeper tooling comparison.
`,
};
