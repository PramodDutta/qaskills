import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'oha: Fast HTTP Load Testing with a Live TUI',
  description: 'An oha load testing guide for QA teams: use the live TUI, fixed QPS, latency correction, JSON output, and CI checks without false confidence.',
  date: '2026-09-28',
  category: 'Performance',
  content: `
# oha: Fast HTTP Load Testing with a Live TUI

oha is an actively maintained Rust HTTP load generator with a real-time terminal UI. The latest official GitHub release I verified is v1.16.0, released on August 23, 2026. The current README still describes oha as a small program that sends load to a web application and shows a live TUI inspired by hey, powered by tokio and ratatui. It is not discontinued, not renamed, and not a SaaS product hiding a local tool behind a signup.

For QA engineers, \`oha load testing\` is best when you need a fast local answer while watching latency, throughput, and errors move during the run. It also has a CI path: use \`--no-tui\`, \`--output-format json\`, fixed request counts or durations, and a parser that fails on real regressions. The trick is to respect what oha measures. It is excellent for HTTP endpoint pressure, cache behavior, API smoke load, and quick regression checks. It is not a replacement for a full journey runner or production telemetry.

This guide focuses on verified CLI behavior: \`-n\`, \`-c\`, \`-z\`, \`-q\`, \`--latency-correction\`, \`-m\`, \`-H\`, \`-d\`, \`-D\`, \`--http2\`, \`--output-format json\`, the live TUI, install options, and the v1.16.0 \`--worker-threads\` flag. For adjacent HTTP load tools, compare the workflow with [Vegeta HTTP Load Testing Guide](/blog/vegeta-http-load-testing-guide) and [k6 Load Testing p95/p99 Guide](/blog/k6-load-testing-p95-p99-guide).

## Verified oha Snapshot For 2026

The official README lists cargo, Homebrew, winget, Arch Linux, Debian via Azlux's repository, X-CMD, release binaries, and the official container image at ghcr.io/hatoo/oha. It also says oha defaults to text summary output, can print JSON summary output with \`--output-format json\`, can print CSV per-request lines, and can run faster with \`--no-tui\` when neither \`-q\` nor \`--burst-delay\` is set.

| Capability | Verified option | QA use |
| --- | --- | --- |
| Request count | \`-n <N_REQUESTS>\` | Reproducible smoke and regression checks. |
| Concurrent connections | \`-c <N_CONNECTIONS>\` | Pressure connection pools and server worker limits. |
| Duration | \`-z <DURATION>\` | Time-boxed local and CI load windows. |
| Overall QPS limit | \`-q <QUERY_PER_SECOND>\` | Offered-load tests and latency correction. |
| Latency correction | \`--latency-correction\` | Avoid optimistic results under fixed QPS, ignored if \`-q\` is not set. |
| Method and headers | \`-m\`, \`-H\` | Exercise API verbs, auth, trace IDs, and content negotiation. |
| Body data | \`-d\`, \`-D\`, \`-Z\`, \`-F\` | Send strings, files, line-by-line bodies, or multipart data. |
| HTTP versions | \`--http-version\`, \`--http2\` | Force HTTP/2 or other supported versions. |
| Machine output | \`--output-format json\` | CI gates and trend ingestion. |
| Runtime threads | \`--worker-threads\` | Set tokio OS thread count when host defaults are misleading. |

The \`-q\` detail is easy to miss: oha says its \`-q\` differs from hey because it sets overall queries per second rather than per worker. That is good for QA gates because the command says exactly how much load the service should receive, not how much each worker should try to send.

## Install It In A Way Your Team Can Repeat

For local work, Homebrew or Cargo is convenient. For CI, pin a version in the image or install script. The README says cargo builds on stable Rust and requires both \`make\` and \`cmake\` prerequisites for cargo installation. It also documents optional native TLS, VSOCK support, and experimental HTTP/3 support behind feature flags. HTTP/3 remains experimental because it depends on the experimental H3 library, so do not make it the first gate for ordinary HTTP APIs.

\`\`\`bash
brew install oha
oha --version
\`\`\`

\`\`\`bash
cargo install oha --version 1.16.0
oha --version
\`\`\`

\`\`\`bash
docker run --rm -it --network=host ghcr.io/hatoo/oha:latest https://example.com
\`\`\`

For locked-down QA runners, prefer a container image or a prebuilt release binary stored in your internal artifact registry. A load test should fail because the service regressed, not because a public package index had a bad minute. If an AI coding agent adds oha to a repo, ask it to add a verification command and document whether the team uses Homebrew, Cargo, winget, or the container path.

## Start With A Human TUI Run

oha's live TUI is the reason many engineers reach for it before heavier test frameworks. During a run, the operator can see throughput, latency, and failures move instead of waiting for a final report. That is useful during incident reproduction, local API tuning, and pre-merge checks where the endpoint is still changing. Use this mode to learn the shape of the endpoint, then turn the same scenario into a non-interactive CI command.

\`\`\`bash
oha -n 2000 -c 50 https://api.example.test/health
\`\`\`

\`\`\`bash
oha -z 2m -c 40 -q 200 --latency-correction https://api.example.test/search?q=smoke
\`\`\`

The first command asks oha to run a fixed number of requests with 50 concurrent connections. The second asks for a two-minute run capped at 200 QPS, with latency correction enabled. The README states that latency correction is ignored if \`-q\` is not set, so do not cargo-cult the flag into uncapped tests and assume it changed the measurement.

| Local question | Better oha shape | Why |
| --- | --- | --- |
| Can this endpoint survive a burst? | Higher \`-c\`, fixed \`-n\` | Finds connection and worker bottlenecks quickly. |
| What is p95 at expected traffic? | \`-q\` plus \`--latency-correction\` | Measures against a planned arrival rate. |
| Does latency drift over time? | \`-z 10m\`, moderate \`-c\` | Watches warming, queues, and leaks. |
| Does HTTP/2 behave differently? | \`--http2\` | Forces HTTP/2 path where supported. |
| Does keep-alive hide reality? | \`--disable-keepalive\` | Simulates clients that do not reuse connections. |

What people get wrong is using one uncapped \`-n 100000 -c 500\` command as a universal truth. That mostly answers how hard your client can hammer one URL from one host. It may not answer how the system behaves at the expected arrival rate, under user-like connection reuse, or through the same HTTP version used by production clients.

## Model Requests, Headers, And Bodies Explicitly

oha exposes practical HTTP controls: \`-m, --method\`, \`-H\` for headers, \`-A\` for Accept, \`-T\` for Content-Type, \`-d\` for a body string, \`-D\` for a body file, \`-Z\` for request bodies read line by line from a file, and \`-F\` for multipart form data. It also supports basic auth, AWS credentials and SigV4 parameters, proxy settings, custom Host header, certificates, client certs, invalid-cert acceptance with \`--insecure\`, Unix sockets for non-HTTPS URLs, and \`--connect-to\` for DNS and port overrides.

\`\`\`json
{
  "query": "wireless keyboard",
  "filters": {
    "inStock": true,
    "shippingCountry": "US"
  },
  "pageSize": 20
}
\`\`\`

\`\`\`bash
oha -z 90s \\
  -c 30 \\
  -q 120 \\
  --latency-correction \\
  -m POST \\
  -H "authorization: Bearer test-token" \\
  -H "x-test-scenario: search-load" \\
  -T "application/json" \\
  -D ./payloads/search.json \\
  https://api.example.test/v1/search
\`\`\`

That command is specific enough for code review. It names the method, content type, authorization strategy, test scenario header, payload file, rate, concurrency, duration, and endpoint. If an agent changes it, the diff says something meaningful. If the run fails, the triage starts from a known scenario rather than a mysterious one-liner pasted from terminal history.

For line-by-line request bodies, \`-Z\` is useful when you want each request to use one line from a file. For URL variety, the README documents \`--urls-from-file\`, which reads one URL per line and chooses randomly, and \`--rand-regex-url\`, which generates URLs using rand_regex with dot disabled. It also notes a limitation: dynamic scheme, host, and port with keep-alive do not work well. Keep generated URL tests separate from baseline tests so you can tell whether a regression is caused by route mix or service behavior.

## Fixed QPS And Latency Correction

Coordinated omission is the load-testing trap where a client stops sending scheduled requests while the server is stalled, then reports a happier latency distribution than users experienced. oha's README recommends \`--latency-correction\` with \`-q\` to avoid that problem, and the help text says the flag is ignored if \`-q\` is not set. In practice, that means latency correction belongs to fixed-rate experiments.

| Experiment | Use \`-q\`? | Use \`--latency-correction\`? | Pass condition |
| --- | --- | --- | --- |
| Max throughput probe | No | No | Identify saturation point, do not use as user SLO proof. |
| Expected traffic gate | Yes | Yes | p95, p99, and error rate stay under service thresholds. |
| Burst simulation | Maybe, or use burst flags | Only if \`-q\` is set | Queue recovery is visible after burst. |
| Soak test | Yes for arrival-rate soak | Yes | No drift in latency, errors, or resource use. |

\`\`\`bash
oha -z 5m \\
  -c 80 \\
  -q 400 \\
  --latency-correction \\
  --disable-keepalive \\
  --output-format json \\
  -o ./artifacts/search-oha.json \\
  https://api.example.test/v1/search?q=keyboard
\`\`\`

Disabling keep-alive is not always correct, but it is worth testing. The README suggests \`--disable-keepalive\` for more realistic conditions in cases where users are not repeatedly querying the same URL on the same connection. For API clients, the reverse may be true: a mobile app or backend service may reuse connections aggressively. Run both when the answer matters, label the artifacts, and avoid mixing their thresholds.

## Make JSON Output Useful In CI

The official README says \`--output-format json\` prints a JSON summary and points to \`schema.json\` for the schema. It also supports \`--output-format csv\`, where each request is printed as a CSV line, and \`quiet\` for minimal output. For CI gates, JSON is the right default. Use \`--no-tui\` to remove the live interface, write the output to a file with \`-o\`, and parse only fields you have confirmed in your current oha version.

\`\`\`bash
mkdir -p artifacts
oha -z 2m \\
  -c 40 \\
  -q 180 \\
  --latency-correction \\
  --no-tui \\
  --output-format json \\
  -o ./artifacts/home-oha.json \\
  https://app.example.test/
\`\`\`

\`\`\`js
#!/usr/bin/env node
import fs from 'node:fs';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('Usage: node check-oha-report.mjs <report.json>');
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
// Field names follow oha's published schema.json: summary.total is a duration in seconds,
// so the request count comes from statusCodeDistribution, and p95 comes from the CI-friendly
// metrics.latency_ms block, which is already in milliseconds.
const statusCodeDistribution = report.statusCodeDistribution ?? {};
const successful = Number(report.summary?.successRate ?? 0);
const p95 = Number(report.metrics?.latency_ms?.p95);
const total = Object.values(statusCodeDistribution).reduce((sum, count) => sum + Number(count), 0);
const serverErrors = Object.entries(statusCodeDistribution)
  .filter(([code]) => Number(code) >= 500)
  .reduce((sum, [, count]) => sum + Number(count), 0);

if (total < 1000) {
  throw new Error(\`Too few completed HTTP requests: \${total}\`);
}

if (serverErrors > 0) {
  throw new Error(\`HTTP 5xx responses observed: \${serverErrors}\`);
}

if (!Number.isFinite(p95) || p95 <= 0) {
  throw new Error('Missing positive p95 latency from oha report');
}

if (p95 > 250) {
  throw new Error(\`p95 latency exceeded 250 ms: \${p95}\`);
}

console.log(\`oha gate passed: total=\${total}, p95=\${p95}, successRate=\${successful}\`);
\`\`\`

The field names come from the \`schema.json\` file in the oha repository, so pin the oha version you parse. The defensive checks are intentional: if oha changes a field, the gate should fail and force a parser update. Silent defaults are dangerous. A missing p95 is not a passing p95.

## GitHub Actions Pattern For Endpoint Gates

Keep CI load checks narrow. A pull request gate should not try to discover total site capacity. It should catch obvious regressions in a controlled path. Nightly or pre-release jobs can run longer duration tests with higher traffic and richer artifacts. The sample below downloads the pinned v1.16.0 Linux binary from the GitHub release. Many teams prefer a performance-test container with oha already pinned so the workflow is not downloading tools during every PR.

\`\`\`yaml
name: http-performance

on:
  pull_request:
  workflow_dispatch:

jobs:
  oha:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Install oha 1.16.0
        run: |
          mkdir -p "$HOME/.local/bin"
          curl -fsSL -o "$HOME/.local/bin/oha" https://github.com/hatoo/oha/releases/download/v1.16.0/oha-linux-amd64
          chmod +x "$HOME/.local/bin/oha"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"

      - name: Verify oha
        run: oha --version

      - name: Start application
        run: ./scripts/start-app.sh

      - name: Wait for HTTP readiness
        run: ./scripts/wait-for-http.sh http://127.0.0.1:8080/health

      - name: Run oha
        run: |
          mkdir -p artifacts
          oha -z 90s \\
            -c 30 \\
            -q 150 \\
            --latency-correction \\
            --no-tui \\
            --output-format json \\
            -o ./artifacts/oha-home.json \\
            http://127.0.0.1:8080/

      - name: Gate report
        run: node ./scripts/check-oha-report.mjs ./artifacts/oha-home.json

      - uses: actions/upload-artifact@v7
        with:
          name: oha-reports-\${{ github.run_id }}
          path: artifacts/
\`\`\`

For agent-generated workflows, review three things. First, the service readiness step must prove the server is ready before oha starts. Second, the report gate must assert side effects and output fields, not only process status. Third, the thresholds must be tied to the service under test. A login page, a search endpoint, and a static health route should not share one arbitrary p95.

## HTTP/2, Redirects, TLS, And Connection Semantics

oha can force HTTP/2 with \`--http2\`, which is shorthand for \`--http-version=2\`. The help text lists available HTTP versions as 0.9, 1.0, 1.1, 2, and 3, with HTTP/3 requiring an experimental build feature. It also notes that redirects are not supported for HTTP/2, and that \`--disable-keepalive\` is not supported for HTTP/2. Those details matter when you compare reports. A change from HTTP/1.1 to HTTP/2 can change parallelism and connection reuse, not just protocol labels.

| Area | oha option | Trap |
| --- | --- | --- |
| HTTP version | \`--http2\` or \`--http-version 2\` | Comparing HTTP/1.1 and HTTP/2 as if only code changed. |
| Redirects | \`-r, --redirect\` | Default redirect limit is zero in current docs, so redirected pages may look like failures. |
| Keep-alive | \`--disable-keepalive\` | Not supported for HTTP/2, and realism depends on client type. |
| TLS validation | \`--cacert\`, \`--cert\`, \`--key\`, \`--insecure\` | Using \`--insecure\` can hide cert failures that users see. |
| DNS override | \`--connect-to\` | Multiple mappings for the same host and port are chosen randomly. |

\`\`\`bash
oha -z 3m \\
  -c 25 \\
  -q 100 \\
  --http2 \\
  --latency-correction \\
  -H "accept: application/json" \\
  https://api.example.test/v1/catalog
\`\`\`

If an endpoint behaves differently under HTTP/2, do not immediately blame the application handler. Check load balancer settings, upstream protocol support, stream limits, redirect behavior, response compression, and whether the target is actually negotiating what you asked for. oha's \`--debug\` flag performs a single request and dumps the request and response, which is useful before running a longer test.

## Failure Mode: The TUI Looks Fine, CI Fails

A realistic failure mode goes like this: locally, the TUI run looks clean. In CI, the JSON gate fails with p95 over threshold and a few 5xx responses. The team suspects a flaky runner. The actual cause is that the local test used no fixed QPS, reused a warm connection, and hit a nearby dev service. CI used \`-q\`, latency correction, no TUI, a fresh app process, and a lower CPU allocation. The commands looked similar in a chat transcript but measured different systems.

Diagnosis workflow:

1. Compare the full commands, not just endpoint and concurrency.
2. Confirm \`-q\`, \`--latency-correction\`, keep-alive, HTTP version, and redirect settings.
3. Run \`--debug\` once in CI to verify target, headers, response code, and protocol.
4. Record CPU and network limits for the runner.
5. Re-run locally with \`--no-tui\` and the same JSON output path to remove interface differences.

The fix is usually not raising thresholds. It is making the local reproduction match CI or splitting the checks into local exploration and CI regression gates. oha makes both easy, but the team has to label which mode a command represents.

## When oha Is Not Enough

oha is intentionally small. Use it when a single URL or a controlled list of URLs can answer the question. Reach for a scenario framework when you need login setup, correlated data, browser execution, multi-step user journeys, or checks that depend on response bodies across steps. Use service metrics when you need to attribute slowdowns to database queries, thread pools, caches, or queue depth.

That boundary is healthy. A quick oha command can tell you a release candidate became slower at \`GET /catalog\`. A deeper framework can tell you the checkout journey degraded after inventory reservation. Observability can tell you Redis latency spiked during the same window. The best QA workflow does not force one tool to explain every layer.

## Frequently Asked Questions

### Is oha only useful because of the live TUI?

No. The live TUI is excellent for fast local feedback, but oha also supports non-interactive runs with \`--no-tui\`, file output through \`-o\`, and machine-readable JSON through \`--output-format json\`. Use the TUI to understand an endpoint while developing or debugging. Use JSON output for CI gates, artifacts, and trend ingestion. The two modes should share the same core parameters so local findings can become repeatable checks.

### When should I use latency correction in oha?

Use \`--latency-correction\` when you also set \`-q\` for a fixed overall query rate. The oha help text says latency correction is ignored if \`-q\` is not set. It is meant to reduce coordinated omission, where a stalled server causes the client to send fewer scheduled requests and report overly optimistic latency. For uncapped throughput probes, leave it out and describe the run as a capacity exploration rather than an SLO-style user experience proof.

### Should I disable keep-alive for realistic testing?

Sometimes. The README suggests \`--disable-keepalive\` for more realistic conditions when users do not repeatedly query the same URL with a reused connection. But backend services, mobile apps, and browsers often reuse connections. Test both modes when it matters, and label the artifacts clearly. Also remember that disabling keep-alive is not supported for HTTP/2 in the documented options, so protocol choice can limit the connection model you are testing.

### Can oha replace k6, Playwright, or API integration tests?

No. oha is great for fast HTTP endpoint pressure and simple URL mixes. It does not model full browser behavior, multi-step business workflows, or complex data correlation by itself. Use it to answer focused questions: throughput, latency, status distribution, protocol behavior, and quick regression checks. Keep k6 or similar scenario tools for journeys and richer checks, Playwright for browser behavior, and integration tests for correctness across service boundaries.
`,
};
