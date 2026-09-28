import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'ghz: gRPC Load Testing and Benchmarking Guide',
  description: 'A ghz grpc guide for QA teams: choose proto, protoset, or reflection, shape load schedules, export reports, and gate CI regressions safely in pipelines.',
  date: '2026-09-28',
  category: 'Performance',
  content: `
# ghz: gRPC Load Testing and Benchmarking Guide

ghz is an actively maintained gRPC benchmarking and load-testing tool. The latest official GitHub release I verified is v0.121.0, released in December 2025, and the current README still points users to ghz.sh for the CLI documentation. The short answer for \`ghz grpc\` work is this: use ghz when you need protocol-aware load against unary, server streaming, client streaming, or bidirectional streaming RPCs, and when you want to drive requests from \`.proto\`, protoset, or server reflection rather than pretending gRPC is just HTTP with a different port.

For QA and test-automation engineers, ghz is strongest as a repeatable engineering tool, not as a one-off benchmark screenshot. You can pin the binary, keep inputs beside your API contracts, run fixed request counts or duration-based tests, ramp RPS or concurrency, export JSON or HTML, and let CI fail only when the regression is meaningful. That is a better fit for agent-assisted work in Claude Code, Cursor, and Copilot than asking an agent to invent load scripts from memory.

One status note matters up front: the ghz CLI is the core path. ghz.sh still describes a complementary web application as beta for saving, tracking, viewing, and analyzing test results. Treat \`ghz-web\` as optional reporting infrastructure, not as a requirement for reliable command-line performance gates. If you need broader API context before load, read [gRPC API Testing Complete Guide 2026](/blog/grpc-api-testing-complete-guide-2026). If you need a close comparison for HTTP and gRPC-capable infrastructure tests, pair this with [Fortio Load Testing Guide](/blog/fortio-load-testing-guide).

## Verified Tool Snapshot For QA Teams

The official ghz README and options reference confirm the flags most teams use daily: \`--proto\`, \`--protoset\`, reflection fallback, \`--call\`, \`-d\` and \`--data-file\`, \`-c\` and \`--concurrency\`, \`-n\` and \`--total\`, \`-r\` and \`--rps\`, \`-z\` and \`--duration\`, \`--insecure\`, \`-O\` output formats, streaming controls, connection controls, and schedule options for load and concurrency. The docs also note that if neither \`--proto\` nor \`--protoset\` is provided, ghz attempts server reflection.

| Decision | Verified ghz option | QA implication |
| --- | --- | --- |
| Load a source \`.proto\` | \`--proto\` with \`-i, --import-paths\` | Best for local contract repos and generated import trees. |
| Load compiled descriptors | \`--protoset\` | Best for CI artifacts where imports should already be resolved. |
| Use server reflection | Omit \`--proto\` and \`--protoset\` | Fast for dev environments, fragile when reflection is disabled in staging. |
| Pick the RPC | \`--call package.Service.Method\` or \`package.Service/Method\` | Keeps test intent exact and agent-editable. |
| Send JSON payloads | \`-d, --data\` or \`-D, --data-file\` | Lets QA vary realistic request bodies without recompiling clients. |
| Control workers | \`-c, --concurrency\` | Measures saturation behavior and connection sharing. |
| Control amount | \`-n, --total\` or \`-z, --duration\` | Use counts for reproducibility, durations for soak windows. |
| Control rate | \`-r, --rps\` and \`--load-schedule\` | Separates offered load from worker count. |
| Export reports | \`-O summary,csv,json,pretty,html,influx-summary,influx-details,prometheus\` | Use JSON for gates, HTML for human review. |

The tool also exposes \`--connections\`, \`--connect-timeout\`, \`--keepalive\`, \`--skipFirst\`, \`--count-errors\`, \`--metadata\`, \`--metadata-file\`, \`--reflect-metadata\`, \`--max-recv-message-size\`, \`--max-send-message-size\`, \`--enable-compression\`, \`--lb-strategy\`, and debug logging. Those options are not decoration. They are often the difference between a test that exercises one warm channel and a test that resembles production clients.

## Install ghz Without Hiding The Version

The official README lists several install paths: Homebrew, downloading release binaries, building from source, \`go install github.com/bojand/ghz/cmd/ghz@latest\` with Go 1.23 or newer, and a Docker build command that outputs the binary. In team repos, avoid an unpinned \`@latest\` in CI. Pinning the version makes performance history interpretable, especially when a future tool release changes output fields, TLS behavior, or dependency versions.

\`\`\`bash
# Local macOS install for a developer workstation.
brew install ghz
ghz --version
\`\`\`

\`\`\`bash
# Reproducible Go install for a CI image that already has Go 1.23+.
go install github.com/bojand/ghz/cmd/ghz@v0.121.0
ghz --version
\`\`\`

For teams that publish ready-made QA skills from qaskills.sh, keep the ghz version and the target service contract in the skill metadata or README. The useful automation is not just \`run ghz\`; it is \`run this exact ghz version against this exact method with this payload policy and these gates\`.

## Choose Proto, Protoset, Or Reflection Deliberately

The most common ghz mistake is letting reflection be the default everywhere because it worked on a laptop. Reflection is convenient, but many production-like environments disable it. A protoset is usually the most CI-friendly artifact because it freezes the transitive descriptor graph produced by \`protoc\`. A source \`.proto\` is best when engineers are actively changing contracts and want readable diffs.

| Input mode | When to use it | Failure mode to expect | Agent instruction that helps |
| --- | --- | --- | --- |
| \`--proto\` | Local contract repo, readable imports, fast iteration | Missing include path for imported proto files | Ask the agent to inspect \`import\` lines and add \`--import-paths\`. |
| \`--protoset\` | CI, release candidates, generated contract bundles | Bundle missing imports or stale artifact | Regenerate protoset in the build and archive it with reports. |
| Reflection | Dev server, exploratory testing, no local contract | Reflection disabled or auth missing on reflection call | Add \`--reflect-metadata\` if reflection needs metadata. |

\`\`\`bash
protoc \\
  --proto_path=./proto \\
  --include_imports \\
  --descriptor_set_out=./artifacts/orders.protoset \\
  ./proto/orders/v1/orders.proto
\`\`\`

\`\`\`bash
ghz --insecure \\
  --protoset ./artifacts/orders.protoset \\
  --call orders.v1.OrderService.GetOrder \\
  -d '{"orderId":"ORD-123456"}' \\
  -c 20 \\
  -n 2000 \\
  localhost:50051
\`\`\`

For TLS services, do not copy \`--insecure\` into staging by habit. The ghz docs define \`--insecure\` as plaintext and insecure connection. For TLS with a private CA, use \`--cacert\`; for mutual TLS, add \`--cert\` and \`--key\`; for self-signed hostname situations, \`--cname\` can override the server name used during certificate validation. \`--skipTLS\` exists, but using it in a regression gate hides certificate and hostname problems that users may hit before application code even runs.

## Build Request Data That Looks Like Traffic

ghz accepts call data as stringified JSON through \`-d\`, reads JSON from a file with \`-D\`, reads request content from stdin when \`-d @\` is used, and can use binary protobuf data with \`-b\` or \`-B\`. For unary calls, a single JSON object is reused. An array of objects is sent round-robin. For streaming calls, the JSON array describes the messages in a stream, with separate controls for interval, duration, count, and dynamic message generation.

| Scenario | Data shape | Recommended ghz option |
| --- | --- | --- |
| Stable smoke load | One JSON object | \`-d '{"orderId":"ORD-123456"}'\` |
| Customer mix | Array of JSON objects | \`-D ./data/orders-round-robin.json\` |
| Large payload realism | Generated JSON file or protobuf binary | \`-D\` for readable data, \`-B\` for exact binary data |
| Client streaming | JSON array of stream messages | \`--stream-call-count\`, \`--stream-interval\`, \`-D\` |
| Metadata dependent auth | Metadata JSON string or file | \`-m\` or \`-M\` |

\`\`\`json
[
  { "orderId": "ORD-100001", "includeHistory": false },
  { "orderId": "ORD-100002", "includeHistory": true },
  { "orderId": "ORD-100003", "includeHistory": false }
]
\`\`\`

\`\`\`bash
ghz --proto ./proto/orders/v1/orders.proto \\
  --call orders.v1.OrderService.GetOrder \\
  --cacert ./certs/staging-ca.pem \\
  -D ./data/orders-round-robin.json \\
  -M ./data/staging-metadata.json \\
  -c 40 \\
  -n 8000 \\
  -O json \\
  -o ./artifacts/ghz-orders.json \\
  staging-grpc.example.test:443
\`\`\`

What people get wrong is randomizing everything before they can explain baseline behavior. Start with deterministic request bodies, prove the service and measurement path, then add variability. If a coding agent proposes generated payloads, require it to commit the seed, the schema, and the exact generated artifact used by CI. Otherwise yesterday's regression may be today's different input mix.

## Shape Load Separately From Concurrency

ghz gives you two related but different levers. \`--concurrency\` controls worker goroutines, while \`--rps\` controls offered request rate. The docs state that total RPS is distributed among workers. If you set \`-c 200\` and leave \`--rps\` at zero, you are asking for as much throughput as those workers can produce. If you set \`--rps 200\`, you are asking for a rate-limited test, and concurrency needs to be high enough that workers can actually maintain that rate.

The load scheduler supports \`const\`, \`step\`, and \`line\`. Step schedules adjust RPS by a fixed amount every step duration until an end rate or max duration is reached. Line schedules adjust each second using the configured slope. Concurrency has a similar scheduler with \`--concurrency-schedule\`, \`--concurrency-start\`, \`--concurrency-end\`, \`--concurrency-step\`, \`--concurrency-step-duration\`, and \`--concurrency-max-duration\`.

\`\`\`bash
# Capacity probe: fixed workers, no explicit RPS cap.
ghz --insecure \\
  --protoset ./artifacts/orders.protoset \\
  --call orders.v1.OrderService.GetOrder \\
  -D ./data/orders-round-robin.json \\
  -c 80 \\
  -n 20000 \\
  -O html \\
  -o ./artifacts/orders-capacity.html \\
  localhost:50051
\`\`\`

\`\`\`bash
# Controlled ramp: raise offered load from 50 RPS to 250 RPS.
ghz --insecure \\
  --protoset ./artifacts/orders.protoset \\
  --call orders.v1.OrderService.GetOrder \\
  -D ./data/orders-round-robin.json \\
  -c 60 \\
  -n 30000 \\
  --load-schedule=step \\
  --load-start=50 \\
  --load-step=25 \\
  --load-end=250 \\
  --load-step-duration=30s \\
  -O json \\
  -o ./artifacts/orders-ramp.json \\
  localhost:50051
\`\`\`

Use \`--duration\` for soak checks where time matters more than exact count. The docs say that when duration is specified, \`-n\` is ignored. If you need count respected but do not want a hung run, use \`--max-duration\`. For duration tests, decide how to treat in-flight work with \`--duration-stop\`: \`close\`, \`wait\`, or \`ignore\`. A service with long-running RPCs can look much worse or much better depending on that choice, so record it in the test name and report.

## Read ghz Output Like A Test Engineer

The summary output includes count, total duration, slowest, fastest, average, requests per second, histogram, latency distribution, status distribution, and error distribution. The docs clarify that count includes successful and failed requests, and requests per second is count divided by total ghz run duration. By default, latency stats are calculated from OK responses unless \`--count-errors\` is enabled. That default is useful for separating service latency from failures, but it can hide the user impact of fast errors.

| Output format | Flag | Best use |
| --- | --- | --- |
| Human summary | default or \`-O summary\` | Local diagnosis and quick paste into incident notes. |
| Pretty JSON | \`-O pretty\` | Human-readable artifact when reviewing field names. |
| JSON | \`-O json\` | CI gates and trend ingestion. |
| CSV | \`-O csv\` | Per-request analysis in spreadsheets or notebooks. |
| HTML | \`-O html\` | Shareable report for release review. |
| Prometheus | \`-O prometheus\` | Scrape-style summary export. |
| Influx line protocol | \`-O influx-summary\`, \`-O influx-details\` | Time-series pipelines already using InfluxDB. |

\`\`\`js
#!/usr/bin/env node
import fs from 'node:fs';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('Usage: node check-ghz-report.mjs <report.json>');
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const latency = report.latencyDistribution ?? [];
const status = report.statusCodeDistribution ?? {};
const p95 = latency.find((row) => row.percentage === 95);
const ok = status.OK ?? 0;
const total = report.count ?? 0;
const errorCount = Math.max(0, total - ok);

if (!p95 || typeof p95.latency !== 'number') {
  throw new Error('Missing p95 latency in ghz JSON report');
}

if (total < 1000) {
  throw new Error(\`Too few completed RPCs: \${total}\`);
}

if (errorCount > 0) {
  throw new Error(\`gRPC errors were returned: \${errorCount}\`);
}

if (p95.latency > 120_000_000) {
  throw new Error(\`p95 latency exceeded 120 ms: \${p95.latency} ns\`);
}

console.log(\`ghz gate passed: total=\${total}, p95Ns=\${p95.latency}\`);
\`\`\`

The exact JSON field names can evolve, so first archive one current sample and make the gate fail closed when required fields are missing. Do not write a parser that silently treats missing \`p95\` as zero. That mistake makes CI green precisely when the output format or run failed.

## CI Integration That Produces Useful Artifacts

A CI load test should be boring. Start the service, wait for readiness, run ghz with pinned inputs, export JSON and HTML, run a small gate over JSON, then upload artifacts. Keep thresholds local to the service, not global across the company. A cache API and a payment API rarely deserve the same p95 threshold.

\`\`\`yaml
name: grpc-performance

on:
  pull_request:
  workflow_dispatch:

jobs:
  ghz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Install ghz 0.121.0
        run: |
          curl -fsSL https://github.com/bojand/ghz/releases/download/v0.121.0/ghz-linux-x86_64.tar.gz | tar -xz -C "$RUNNER_TEMP"
          echo "$RUNNER_TEMP" >> "$GITHUB_PATH"

      - name: Verify ghz
        run: ghz --version

      - name: Start service
        run: ./scripts/start-orders-grpc.sh

      - name: Wait for readiness
        run: ./scripts/wait-for-grpc-ready.sh localhost:50051

      - name: Run ghz JSON report
        run: |
          mkdir -p artifacts
          ghz --insecure \\
            --protoset ./artifacts/orders.protoset \\
            --call orders.v1.OrderService.GetOrder \\
            -D ./data/orders-round-robin.json \\
            -c 40 \\
            -n 5000 \\
            --skipFirst 100 \\
            -O json \\
            -o ./artifacts/orders-ghz.json \\
            localhost:50051

      - name: Gate p95 and errors
        run: node ./scripts/check-ghz-report.mjs ./artifacts/orders-ghz.json

      - uses: actions/upload-artifact@v7
        with:
          name: ghz-reports-\${{ github.run_id }}
          path: artifacts/
\`\`\`

This example assumes ghz is already present on the runner image or installed in an earlier internal setup step. In a real repo, make that installation explicit, usually by baking ghz into the performance-test container or by using the pinned Go install command in a setup script. Do not hide downloads inside the test command, because a network failure then looks like a service performance failure.

## Failure Mode: Good p95, Bad User Experience

A realistic failure looks like this: ghz reports a stable p95, the summary shows high requests per second, and the release candidate passes the latency gate. Then staging users report intermittent \`Unavailable\` errors. The root cause is that the test used default latency stats that excluded non-OK responses, and the gate checked p95 without checking status distribution. Fast failures made latency look healthy.

Diagnosis workflow:

1. Re-run with \`-O pretty\` and inspect \`statusCodeDistribution\` and \`errorDistribution\`.
2. Decide whether the user-impact gate should use \`--count-errors\`.
3. Add a hard error budget check before latency comparison.
4. Confirm the target is not rate-limiting the client identity.
5. Capture debug logs with \`--debug\` for a short run only, since debug output can be noisy.

The deeper lesson is that load tests are assertions, not charts. If a run can produce 15 percent \`Unavailable\` and still pass, your assertion is wrong. If an AI coding agent edits the gate script, review for side effects: it should assert report presence, status distribution, enough completed calls, and the latency threshold. It should not only check process exit status.

## Streaming RPCs Need Their Own Model

Unary examples are easy to reason about because one request produces one response. Streaming calls add a second clock. ghz exposes \`--stream-interval\`, \`--stream-call-duration\`, \`--stream-call-count\`, and \`--stream-dynamic-messages\`. For client and bidirectional streaming, count controls how many messages the client sends before closing. For server streaming, count controls how many messages are received before cancellation, and the docs note that cancellation can produce a cancelled error.

\`\`\`bash
ghz --insecure \\
  --proto ./proto/chat/v1/chat.proto \\
  --call chat.v1.ChatService.StreamEvents \\
  -D ./data/chat-events.json \\
  --stream-call-count=20 \\
  --stream-interval=100ms \\
  -c 25 \\
  -n 1000 \\
  -O json \\
  -o ./artifacts/chat-stream.json \\
  localhost:50051
\`\`\`

For streaming services, write down what one logical user means. Is one ghz worker one connected user? Is one stream call one session? Are messages evenly spaced or bursty? Without that model, raising \`-c\` may accidentally test connection fan-out while your real production risk is messages per active stream.

## When ghz Is The Wrong First Tool

ghz is excellent when the system boundary is gRPC. It is not the best first tool for browser journeys, mixed HTTP pages, websocket-heavy flows, or tracing business workflows across multiple protocols. It also does not replace service profiling, database load analysis, or queue backpressure tests. A ghz regression tells you a method changed behavior under a specific offered load. It does not automatically explain which downstream dependency caused the regression.

Use ghz early when a team owns a gRPC method with a known contract and wants repeatable feedback. Use a broader load platform when the question is user journey throughput across HTTP, gRPC, queues, and third-party calls. Use production telemetry when the question is capacity planning under real traffic shape. Those are complementary layers, and the healthiest QA strategy names which layer a test covers.

## Frequently Asked Questions

### Does ghz require a proto file?

No. ghz can use a source \`.proto\` file with \`--proto\`, a compiled descriptor bundle with \`--protoset\`, or server reflection when neither is supplied. For CI, a protoset is often the most stable choice because imports are already resolved. Reflection is convenient for exploration, but many production-like servers disable it or require metadata. If reflection needs authentication metadata, use the reflection-specific metadata option rather than assuming the normal request metadata is enough.

### Should I use request count or duration for CI?

Use \`-n, --total\` for small regression gates where reproducibility matters, and use \`-z, --duration\` for soak or burn-in tests where time under load matters. Remember that ghz ignores \`-n\` when duration is specified. If you need the count respected but want protection from a hung run, use \`--max-duration\`. For duration runs, document \`--duration-stop\` because closing, waiting, or ignoring in-flight requests changes how long RPCs appear in the report.

### Why does my ghz test pass while users still see errors?

Check the status and error distributions first. ghz latency statistics normally focus on OK responses unless you enable \`--count-errors\`, so fast failures can leave p95 looking fine. A strong CI gate checks completed count, status distribution, error count, and latency distribution. Also confirm that your payloads, metadata, TLS settings, and connection count resemble the clients that are failing. A load test with one happy-path ID can miss cache misses, authorization branches, and rate limits.

### Is ghz-web required for useful ghz reporting?

No. The CLI can export summary, CSV, JSON, pretty JSON, HTML, Prometheus, and Influx line protocol formats directly. ghz.sh describes the web application as a complementary beta for saving, tracking, viewing, and analyzing results. That can help teams that want a shared report UI, but it should not block a reliable CI workflow. Start with JSON gates and archived HTML reports, then add a web layer only when result history and team access justify the extra service.
`,
};
