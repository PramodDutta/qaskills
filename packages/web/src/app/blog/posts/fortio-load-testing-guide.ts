import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Fortio Load Testing Guide for HTTP and gRPC Benchmarks',
  description: 'Learn fortio load testing for HTTP and gRPC benchmarks: flags, percentiles, CI gates, reports, and failure diagnosis your QA team can trust.',
  date: '2026-09-24',
  category: 'Performance',
  content: `
# Fortio Load Testing Guide for HTTP and gRPC Benchmarks

Fortio load testing is a sharp choice when you need a repeatable HTTP, HTTP/2, TCP, UDP, or gRPC benchmark with explicit request pacing, latency histograms, JSON output, and a small operational footprint. It started as Istio's load testing tool, later became its own project, and the official repository currently describes it as both a command line tool and an embeddable Go library. As of the official GitHub releases page checked on September 24, 2026, the latest Fortio release is v1.75.3.

For QA and test automation engineers, Fortio is most useful when you want to answer a narrow performance question cleanly: can this endpoint hold 250 requests per second for ten minutes, what happens to p99 when concurrency rises from 4 to 32, does the gRPC health or ping path degrade before HTTP, and did the new build change latency distribution rather than only average latency. It is less useful when you need full user journey scripting, browser behavior, or complex data correlation, where k6, Gatling, or JMeter may fit better.

This guide focuses on the practical Fortio workflow: installing it, choosing safe flags, measuring HTTP and gRPC, saving JSON, turning percentiles into CI gates, diagnosing common false conclusions, and deciding when to move to another load testing tool. If you are comparing broader ecosystem options, pair this with [k6 vs JMeter 2026](/blog/k6-vs-jmeter-2026). If your immediate question is how to read tail latency thresholds across performance suites, keep [k6 p95 p99 load testing guide](/blog/k6-load-testing-p95-p99-guide) nearby too.

## The Benchmark Shape Fortio Is Built For

Fortio's core idea is controlled load generation. You tell it how many connections to use, how much QPS to target, how long to run, which percentiles to calculate, and where to write results. The official README says Fortio runs at a specified QPS, records latency histograms, calculates percentiles, and can run for a duration, a fixed number of calls, or until interrupted. That bias matters. Fortio is not trying to simulate every behavior of a shopper, editor, or call center user. It is trying to make one transport-level question observable.

That makes it especially useful for service owners who need a reproducible smoke benchmark before a release, a quick service mesh comparison, or an agent-assisted investigation. Claude Code, Cursor, or Copilot can generate wrappers and parsers around Fortio, but the measurement itself remains an external binary with simple output. The AI agent does not need to understand the whole application to run a careful benchmark. It needs a target, budget, thresholds, and a result file.

| Use Fortio when | Consider another tool when | Reason |
|---|---|---|
| You need fixed-QPS HTTP or gRPC probes | You need full browser transactions | Fortio measures protocol calls, not UI rendering |
| You want compact JSON artifacts | You need rich distributed scenarios | Fortio's output is simple and scriptable |
| You are testing service mesh or sidecar changes | You need hundreds of business steps | Fortio came from the Istio ecosystem and stays close to service behavior |
| You need quick CI gates | You need long soak orchestration with teams of scenarios | Fortio is easy to run in CI, but not a scenario management platform |
| You want embeddable Go load logic | You need a JavaScript or JVM DSL | Fortio also exposes reusable Go packages |

The first thing people get wrong is treating max throughput and fixed-rate benchmarks as the same experiment. Fortio supports both. With \`-qps 0\`, it runs with no wait between calls, so the result is a maximum throughput style test. With \`-qps 200\`, it tries to generate 200 queries per second across the configured connections. Those answer different questions. Max throughput asks where the system bends. Fixed QPS asks whether the system meets a known load target with acceptable latency and error rate.

## Installing And Pinning Fortio

The official installation options are Docker, \`go install fortio.org/fortio@latest\`, release binaries, Debian or RPM packages, Homebrew, and Windows ZIP assets. For repeatable CI, prefer a pinned Docker image or a release asset tied to the version you reviewed. For local exploration, Homebrew or \`go install\` is convenient.

\`\`\`bash
# Local macOS install for exploration
brew install fortio
fortio version

# Go install, useful on developer workstations that already manage Go
go install fortio.org/fortio@latest
\${HOME}/go/bin/fortio version

# Containerized smoke run
docker run --rm fortio/fortio version
\`\`\`

For project automation, capture the version in the job log. Fortio has both \`version\` and \`buildinfo\` commands, and the README says \`buildinfo\` prints full build information. That is helpful when someone compares a failed run on a release branch with a passing run on a developer laptop.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

FORTIO_BIN="\${FORTIO_BIN:-fortio}"

"\${FORTIO_BIN}" version
"\${FORTIO_BIN}" buildinfo
\`\`\`

Pinning matters because performance tools can change default behavior, dependency versions, and supported flags over time. The goal is not to freeze forever. The goal is to upgrade intentionally, rerun a baseline, and update thresholds when the measurement tool changes rather than when the application changes.

| Install path | Good for | Pinning advice |
|---|---|---|
| \`docker run fortio/fortio\` | CI jobs and disposable runners | Use a specific tag when a benchmark gates releases |
| Release tarball, deb, or rpm | Long-lived build agents | Store the version in runner setup docs |
| \`brew install fortio\` | Individual macOS users | Fine for exploration, risky for hard baselines |
| \`go install fortio.org/fortio@latest\` | Go-heavy teams | Pin with a version in scripts when reproducibility matters |
| Windows ZIP | Manual Windows validation | Record \`fortio.exe version\` in test notes |

## A Minimal HTTP Benchmark That Still Means Something

A useful Fortio benchmark has a target, duration, concurrency, QPS model, percentiles, and output file. The flags most QA engineers reach for first are \`-qps\`, \`-c\`, \`-t\`, \`-n\`, \`-p\`, \`-json\`, \`-a\`, \`-H\`, \`-payload\`, \`-payload-file\`, \`-content-type\`, \`-h2\`, \`-uniform\`, and \`-nocatchup\`. The official README lists \`-qps rate\` as total queries per second across connections, \`-c\` as number of connections, \`-t\` as duration, \`-n\` as exact number of calls, \`-p\` as the percentile list, and \`-json\` as JSON output.

\`\`\`bash
fortio load \\
  -qps 50 \\
  -c 4 \\
  -t 2m \\
  -p "50,75,90,95,99,99.9" \\
  -json results/catalog-50qps.json \\
  https://api.example.test/catalog
\`\`\`

That command answers a concrete question: with four concurrent connections and 50 total requests per second for two minutes, what does the latency distribution look like? It does not prove the endpoint can handle Black Friday traffic. It does give you a baseline that can be repeated on the next build.

Use \`-n\` when you need an exact number of calls, often for a controlled reproducibility check or a tiny endpoint smoke. Use \`-t\` for most load tests because time under pressure matters. A service that passes 500 calls in 3 seconds may still leak memory, exhaust pools, or trigger retry storms after 10 minutes.

\`\`\`bash
# Exact-call benchmark
fortio load \\
  -qps 25 \\
  -c 2 \\
  -n 500 \\
  -json results/profile-500calls.json \\
  https://api.example.test/profile/123

# Sustained fixed-rate benchmark
fortio load \\
  -qps 25 \\
  -c 2 \\
  -t 10m \\
  -json results/profile-10m.json \\
  https://api.example.test/profile/123
\`\`\`

For POST requests, provide a payload and content type. Fortio switches to POST when payload-related flags are used, and the official README documents \`-payload\`, \`-payload-file\`, and \`-content-type\`.

\`\`\`bash
fortio load \\
  -qps 20 \\
  -c 4 \\
  -t 3m \\
  -content-type "application/json" \\
  -payload-file ./fixtures/search-request.json \\
  -H "Authorization: Bearer \${PERF_TOKEN}" \\
  -json results/search-post.json \\
  https://api.example.test/search
\`\`\`

Notice that this is still one request shape. If your test needs login, token refresh, a search, a cart update, and checkout with dynamic IDs, Fortio can still hit endpoints, but a scenario DSL may be more honest. Do not hide a complex workflow behind a single static payload unless that is the specific server behavior you want to isolate.

## Fixed QPS, Max QPS, Uniform Pacing, And Catch-Up

Fortio's \`-qps\` flag is easy to read and easy to misuse. A fixed target such as \`-qps 100\` means Fortio attempts to send 100 requests per second across all configured connections. A value of \`0\` means no wait, max QPS. The official docs describe \`-qps 0\` as no wait or max QPS. Use that for capacity exploration, not for a release gate unless your gate is explicitly about saturation.

\`\`\`bash
# Capacity exploration, intentionally drives as fast as configured connections allow
fortio load \\
  -qps 0 \\
  -c 16 \\
  -t 1m \\
  -json results/catalog-max-16c.json \\
  https://api.example.test/catalog
\`\`\`

With fixed-rate tests, the most valuable newer flags for realistic pacing are \`-uniform\` and \`-nocatchup\`. The official FAQ recommends \`-uniform\` to spread requests in time across connections and \`-nocatchup\` for long runs to avoid exceeding the target QPS when the service recovers from latency spikes. Without that distinction, a run that experiences a pause can try to catch up, causing extra pressure right after the system was already struggling.

\`\`\`bash
fortio load \\
  -qps 200 \\
  -c 20 \\
  -t 15m \\
  -uniform \\
  -nocatchup \\
  -p "50,90,95,99,99.9" \\
  -json results/checkout-200qps-uniform.json \\
  https://api.example.test/checkout/quote
\`\`\`

| Question | Suggested flags | Interpretation |
|---|---|---|
| Can the endpoint meet a known traffic target? | \`-qps 150 -uniform -nocatchup -t 10m\` | Use actual QPS, errors, and p95 or p99 as gate inputs |
| What is the rough ceiling from this runner? | \`-qps 0 -c 32 -t 2m\` | Capacity probe, not a user-like traffic model |
| Does more concurrency improve throughput? | Repeat \`-qps 0\` with \`-c 1,4,16,64\` | Watch client saturation and server errors |
| Did tail latency regress at the same offered load? | Same \`-qps\`, \`-c\`, \`-t\`, \`-p\`, environment | Compare percentile JSON across builds |
| Is the load generator falling behind? | Compare requested QPS and actual QPS | Low actual QPS means the offered load was not achieved |

The failure mode here is subtle: a team raises \`-c\` until actual QPS reaches the target, then declares the service healthy because p50 still looks good. Meanwhile, p99 has tripled and errors have moved from HTTP 200 to HTTP 503. Fixed-rate performance gates should check actual QPS, error rate, and tail latency together. One number is not enough.

## Reading Fortio Percentiles Without Lying To Yourself

Fortio calculates latency percentiles from its histogram. The default percentile list in the official help includes \`50,75,90,99,99.9\`, and you can override it with \`-p\`. For release gates, add p95 if your organization uses it, and keep p99 or p99.9 when tail latency matters to users or upstream services.

Do not compare p99 from a 200-request run with p99 from a 200,000-request run as if they have the same confidence. Percentiles need enough samples to describe the tail. A short smoke can catch catastrophic failure, but it cannot characterize rare outliers. If the run is small, say it is a smoke. If it is a benchmark, give it enough traffic and duration to produce a meaningful distribution.

\`\`\`bash
fortio load \\
  -qps 100 \\
  -c 10 \\
  -t 20m \\
  -p "50,75,90,95,99,99.9" \\
  -json results/orders-100qps-20m.json \\
  https://api.example.test/orders/recent
\`\`\`

| Metric | What it tells you | What it can hide |
|---|---|---|
| Average latency | General center of gravity | A tiny number of terrible requests |
| p50 | Median user experience | Tail pain and retry triggers |
| p95 | Common service-level objective threshold | Rare but severe stalls |
| p99 | Tail behavior for high-volume paths | Meaningless if sample size is too small |
| Actual QPS | Whether Fortio achieved offered load | Good QPS with bad errors is still failure |
| Error count/status distribution | Whether calls succeeded | A low error rate can still be unacceptable on payments or auth |

AI agents are good at turning JSON into dashboards or comments, but give them a policy. For example: "fail if actual QPS is below 98 percent of requested QPS, if p99 exceeds 800 ms, or if non-2xx responses exceed 0.5 percent." Without explicit policy, agents tend to summarize instead of judge.

## Saving JSON And Building A CI Gate

Fortio can write JSON with \`-json filename\`, and the README notes that \`-a\` automatically saves JSON with a generated filename. In CI, use explicit filenames so later steps can parse them and upload artifacts with stable names. Artifact names in GitHub Actions cannot contain \`/\`, so keep the artifact name simple and put the directory in \`path\`.

\`\`\`yaml
name: fortio-performance

on:
  workflow_dispatch:
  pull_request:
    branches: [main]

jobs:
  fortio:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Run Fortio benchmark
        run: |
          mkdir -p results
          docker run --rm \\
            -v "\${PWD}/results:/results" \\
            fortio/fortio:1.75.3 \\
            load -qps 50 -c 4 -t 2m -p "50,95,99" \\
            -json /results/catalog.json \\
            "\${PERF_TARGET_URL}/catalog"
        env:
          PERF_TARGET_URL: \${{ secrets.PERF_TARGET_URL }}

      - name: Evaluate Fortio JSON
        run: node scripts/check-fortio-result.mjs results/catalog.json

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: fortio-results
          path: results
\`\`\`

The parser should be deliberately defensive because output structure can vary by Fortio version and protocol mode. Avoid fake precision. If a field is missing, fail with a diagnostic rather than treating it as zero. The exact JSON shape should be inspected from the result files your pinned version emits.

\`\`\`javascript
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  throw new Error('Usage: node scripts/check-fortio-result.mjs <fortio-result.json>');
}

const result = JSON.parse(fs.readFileSync(file, 'utf8'));
const durationHistogram = result.DurationHistogram || result.durationHistogram;

if (!durationHistogram) {
  throw new Error('Fortio result does not include a duration histogram');
}

const actualQps = Number(result.ActualQPS ?? result.actualQPS ?? 0);
const requestedQps = Number(result.RequestedQPS ?? result.requestedQPS ?? 0);

if (requestedQps > 0 && actualQps < requestedQps * 0.98) {
  throw new Error(\`Actual QPS \${actualQps} is below 98% of requested QPS \${requestedQps}\`);
}

const percentiles = durationHistogram.Percentiles || durationHistogram.percentiles || [];
const p99 = percentiles.find((entry) => Number(entry.Percentile ?? entry.percentile) === 99);

if (!p99) {
  throw new Error('Fortio result does not include p99. Add -p "50,95,99" to the run.');
}

const p99Seconds = Number(p99.Value ?? p99.value);
if (p99Seconds > 0.8) {
  throw new Error(\`p99 \${p99Seconds}s exceeded the 0.8s budget\`);
}

console.log(\`Fortio gate passed: actualQps=\${actualQps}, p99=\${p99Seconds}s\`);
\`\`\`

The what-people-get-wrong insight for CI is this: a status-only gate is not a performance gate. A Fortio process can exit successfully while the service got much slower than your product can tolerate. Conversely, a failed run with a good diagnosis is useful. Save JSON, save logs, and preserve the exact command. Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the skill should still leave auditable Fortio artifacts behind.

## HTTP/2 And gRPC Benchmarks

Fortio supports HTTP/2 attempts with \`-h2\`, and the official flag help says \`-h2\` attempts HTTP/2.0 or h2 instead of HTTP/1.1 for both TLS and h2c. The README also notes that \`-h2\` implies the standard client. That can change client-side overhead, so do not compare HTTP/1.1 and HTTP/2 runs without acknowledging that both protocol and client path changed.

\`\`\`bash
fortio load \\
  -h2 \\
  -qps 100 \\
  -c 8 \\
  -t 5m \\
  -json results/catalog-h2.json \\
  https://api.example.test/catalog
\`\`\`

For gRPC, Fortio has \`-grpc\`, \`-ping\`, \`-health\`, \`-grpc-method\`, \`-grpc-ping-delay\`, \`-grpc-port\`, and \`-s\` for streams per gRPC connection. The official command help says \`-grpc\` uses gRPC health by default and \`-ping\` uses ping instead. It also documents \`-grpc-method\` for a fully qualified gRPC method when reflection is enabled.

\`\`\`bash
# gRPC health style load against a service endpoint
fortio load \\
  -grpc \\
  -qps 100 \\
  -c 8 \\
  -t 5m \\
  -json results/grpc-health.json \\
  grpc.example.test:443

# gRPC ping mode with multiple streams per connection
fortio load \\
  -grpc \\
  -ping \\
  -s 4 \\
  -qps 200 \\
  -c 10 \\
  -t 5m \\
  -json results/grpc-ping.json \\
  grpc.example.test:443
\`\`\`

Use gRPC ping to validate the transport and Fortio server behavior. Use health checks to measure the health endpoint. Use \`-grpc-method\` only when the method is available through reflection and the call shape fits Fortio's support. If you need rich protobuf payload generation, streaming application workflows, or per-message assertions, Fortio may be the wrong layer for that test.

## Fortio Server, Web UI, Reports, And Local Lab Work

The \`server\` command starts Fortio's HTTP echo server, gRPC ping server, web UI, report support, and other test helpers. The official README says the default HTTP echo server port is \`8080\`, the gRPC server port is \`8079\`, and the UI is available at \`http://localhost:8080/fortio/\` after starting the server. This is useful for local lab work and for teams that want a lightweight place to run and compare results.

\`\`\`bash
docker run --rm \\
  -p 8080:8080 \\
  -p 8079:8079 \\
  fortio/fortio:1.75.3 server

# In another terminal
fortio load \\
  -qps 20 \\
  -c 2 \\
  -t 30s \\
  -json local-echo.json \\
  http://localhost:8080/echo
\`\`\`

If you save JSON results, \`fortio report\` can browse and graph those result files. The command is handy for human review after a run, but CI should still parse the machine-readable JSON. Humans are good at noticing odd distributions. Machines are better at applying the same threshold every time.

\`\`\`bash
mkdir -p fortio-results
fortio load -qps 25 -c 4 -t 1m -json fortio-results/baseline.json https://api.example.test/ready
fortio load -qps 25 -c 4 -t 1m -json fortio-results/candidate.json https://api.example.test/ready
fortio report -data-dir fortio-results
\`\`\`

One practical pattern is to run Fortio against its own echo endpoint first to detect runner constraints. If the runner cannot generate stable QPS against localhost, it will not produce trustworthy numbers against a remote service. That does not mean the remote service is fast or slow. It means your load generator is not a stable measuring instrument.

## Diagnosing A Realistic Fortio Failure

Imagine a pull request changes catalog caching. The Fortio CI job targets \`-qps 100 -c 10 -t 5m\`. The process exits normally, but your parser fails because actual QPS is 83 and p99 is 2.7 seconds. The easy but wrong conclusion is "the endpoint is slow." A better diagnosis works in layers.

First, check whether the runner was CPU or network bound. If Fortio cannot generate the requested load, actual QPS falls. Second, check status codes. A rise in 503 or 429 points to server rejection or rate limiting, not pure latency. Third, compare p50 and p99. If p50 is stable and p99 explodes, you may have lock contention, cache stampedes, connection pool starvation, or a minority dependency path. Fourth, rerun a short lower-QPS test. If p99 is still bad at low load, the regression is likely not only capacity.

\`\`\`bash
# Reproduce at the failed target
fortio load -qps 100 -c 10 -t 5m -p "50,95,99" -json reproduce-100qps.json https://api.example.test/catalog

# Step down the offered load
fortio load -qps 25 -c 5 -t 3m -p "50,95,99" -json reproduce-25qps.json https://api.example.test/catalog

# Explore whether connections are the limiter
fortio load -qps 0 -c 1 -t 1m -json max-1c.json https://api.example.test/catalog
fortio load -qps 0 -c 16 -t 1m -json max-16c.json https://api.example.test/catalog
\`\`\`

The key is to avoid laundering uncertainty through a single Fortio command. Fortio is precise about what it measured. You still need engineering judgment about why the measurement changed.

## Choosing Fortio Versus k6, JMeter, Gatling, And Plain Probes

Fortio belongs in a QA toolbox, not as the only tool in it. It is strongest when the benchmark should be small, explicit, and close to the service. It is weaker when the benchmark needs advanced scenario authoring, complex user data, browser-level validation, or organization-wide performance reporting.

| Tooling path | Best fit | Tradeoff |
|---|---|---|
| Fortio | Targeted HTTP, HTTP/2, gRPC, service mesh, JSON-gated CI | Limited scenario modeling |
| k6 | JavaScript-authored API journeys, thresholds, cloud or OSS workflows | More moving parts for tiny probes |
| JMeter | Legacy protocol coverage, GUI test plans, enterprise familiarity | Heavier to review and version cleanly |
| Gatling | Code-centric high-scale simulations | JVM stack and DSL learning curve |
| Plain curl probes | Availability checks and simple smoke tests | No latency distribution or load model |

An AI coding agent can help you migrate the edges. Ask it to create a Fortio smoke for a new endpoint, generate a Node parser, or turn a repeated command into a GitHub Actions workflow. Ask it to move to k6 when the test starts needing correlation, datasets, staged scenarios, and business-level checks. The agent should not decide that every performance question requires a large framework.

## Frequently Asked Questions

### Is Fortio good for release gating?

Yes, if the gate is narrow and explicit. Fortio is a good release gate for "this endpoint must hold this QPS with this p99 and this error budget." It is not enough for "the checkout experience is fast" unless checkout is represented by a single endpoint and static payload, which is rarely true. Save JSON, pin the Fortio version, check actual QPS, and fail on latency plus errors rather than process status alone.

### Should I use qps 0 in CI?

Usually no. \`-qps 0\` is a max-throughput probe because Fortio does not wait between calls. It is useful for capacity exploration or comparing infrastructure changes under saturation. CI gates are usually clearer with fixed QPS, \`-uniform\`, and \`-nocatchup\`, because they ask whether the service handles a known traffic target. Use max-throughput runs as a separate job with labels that make the experiment obvious.

### How do I benchmark gRPC with Fortio?

Start with \`fortio load -grpc\` against the service host and port. By default, Fortio uses gRPC health-style load testing, and \`-ping\` switches to ping mode. Use \`-s\` to set streams per gRPC connection when that reflects your transport question. For application-specific RPCs, \`-grpc-method\` requires a fully qualified method and reflection support, so verify your service exposes what Fortio needs before building a CI gate around it.

### Why does actual QPS differ from requested QPS?

Actual QPS can fall below requested QPS when the target is slow, the runner is saturated, network latency is high, connection settings are too low, timeouts occur, or Fortio is catching up after delays. Treat the gap as a diagnostic signal. Compare runner CPU, error rates, p50 versus p99, and a lower-QPS rerun. A result that never achieved the offered load cannot prove the service met that load.
`,
};
