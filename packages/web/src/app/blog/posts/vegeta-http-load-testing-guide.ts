import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vegeta HTTP Load Testing Guide with Examples',
  description: 'Use vegeta load testing with constant-rate attacks, p95 and p99 checks, CI gates, target files, and Go harnesses QA teams can trust safely in CI.',
  date: '2026-09-24',
  category: 'Performance',
  content: `
# Vegeta HTTP Load Testing Guide with Examples

Vegeta is an HTTP load testing tool and Go library built around one strong idea: drive a constant request rate and measure what the service does under that pressure. That makes vegeta load testing especially useful when QA engineers need to answer "can this endpoint sustain 200 requests per second for 10 minutes without p95 crossing 300 ms?" rather than "how many virtual users did we create?"

The official repository currently shows v12.13.0 as the latest release, and the README documents the CLI commands \`attack\`, \`report\`, \`plot\`, and \`encode\`. The key attack flags QA engineers use most are \`-rate\`, \`-duration\`, \`-targets\`, \`-format\`, \`-workers\`, \`-max-workers\`, and \`-timeout\`. The project is also a Go library through \`github.com/tsenart/vegeta/v12/lib\`, where \`vegeta.NewAttacker\`, \`vegeta.Rate\`, and \`vegeta.Metrics\` let you embed attacks in custom harnesses.

Use Vegeta when you want small, scriptable, UNIX-friendly load tests for HTTP services. Use a heavier scenario tool when you need browser behavior, complex user journeys, built-in cloud orchestration, or rich protocol coverage. A QA team can pair this guide with [k6 p95 and p99 load testing](/blog/k6-load-testing-p95-p99-guide) for JavaScript scenarios, or with [JMeter vs k6 vs Gatling in 2026](/blog/jmeter-vs-k6-vs-gatling-2026) when choosing a broader performance stack.

## Vegeta's Model: Rate First, Users Second

Vegeta is an open-model load generator. You tell it how many requests per time unit to issue, and it attempts to keep that rate. That is different from a closed model where a fixed number of virtual users loop through actions and wait for responses before sending the next request. In an open model, slow responses do not automatically reduce arrivals. If the system gets slower, pressure can accumulate and expose queueing behavior quickly.

That is why Vegeta is excellent for API capacity questions. If production traffic sends 120 checkout quote requests per second at peak, a constant 120/s attack asks the same arrival-rate question directly. If p99 explodes after four minutes, the result points to saturation, garbage collection, lock contention, database connection exhaustion, or a dependency bottleneck. It does not hide behind fewer user loops completing.

The README also documents that \`-rate=0\` or \`-rate=infinity\` sends requests as fast as possible. That mode can model a fixed set of concurrent workers when combined with \`-max-workers\`, but it is easy to misuse. For release gates, prefer explicit rates such as \`50/s\`, \`300/min\`, or \`1000/10s\`.

| Load model | How arrivals happen | What it answers | Common QA mistake |
|---|---|---|---|
| Open constant rate | Requests arrive at a configured rate | Can the service absorb this demand? | Setting an arbitrary rate with no production basis |
| Closed users | Each user waits for a response before next action | How do users experience a journey? | Treating user count as equivalent to requests per second |
| Max-rate blast | Generator sends as fast as it can | Where does either generator or service break? | Using it as a release gate without bounds |
| Step schedule | Rate changes between phases | Where does degradation begin? | Forgetting warmup and cooldown data separation |

## Install and Pin the Tool

The README lists precompiled executables, Homebrew, MacPorts, Arch Linux, FreeBSD packages, and source builds. For local QA work on macOS, Homebrew is the simplest. For CI, prefer a pinned release artifact or an internal tool image so the same Vegeta binary is used across branches.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

vegeta -version

printf 'GET https://example.com/\\n' |
  vegeta attack -rate=5/s -duration=10s |
  tee results.bin |
  vegeta report -type=text
\`\`\`

The smoke command above does two things. It proves the binary is on \`PATH\`, and it demonstrates Vegeta's pipe-oriented workflow: generate or read targets, attack, save raw binary results, and report from the same stream. In real projects, keep the raw \`results.bin\` file at least for failed CI runs. It lets you regenerate text, JSON, histogram, and plot output without rerunning the test.

| Install path | Good for | Risk | Recommendation |
|---|---|---|---|
| Homebrew or package manager | Developer laptops | Version drift across machines | Good for exploration |
| GitHub release binary | CI and repeatable scripts | Manual update process | Best default for QA pipelines |
| Source build | Tool contributors or patched forks | Build environment differences | Use only when needed |
| Container image | Shared runners and ephemeral CI | Image maintenance | Best for platform teams |

## Targets in HTTP Format

The default \`-format\` is \`http\`. A target file in this format is close to plain HTTP request text, but the README notes it does not support inline HTTP bodies. Bodies are referenced from files using \`@\`. Blank lines separate requests. Lines starting with \`#\` are ignored.

\`\`\`http
# smoke checkout read path
GET https://shop.example.test/api/products/sku-1001
Authorization: Bearer qa-token
X-Test-Run: vegeta-guide

# create a quote with a JSON body loaded from disk
POST https://shop.example.test/api/quotes
Content-Type: application/json
Authorization: Bearer qa-token
@quote-request.json
\`\`\`

\`\`\`json
{
  "sku": "sku-1001",
  "quantity": 2,
  "postalCode": "94105"
}
\`\`\`

Run that file with a clear rate, duration, timeout, and output path. Do not rely on defaults in CI, because defaults can be reasonable for demos and wrong for your system.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

vegeta attack -targets=targets.http -format=http -rate=25/s -duration=3m -timeout=5s -workers=20 -max-workers=200 -output=results.bin

vegeta report -type=text results.bin
vegeta report -type='hist[0,50ms,100ms,200ms,500ms,1s]' results.bin
vegeta plot -title='checkout quote 25 rps' results.bin > plot.html
\`\`\`

The \`-workers\` flag controls the initial worker count. The README states Vegeta can increase workers to sustain the requested rate unless doing so would exceed \`-max-workers\`. This matters when responses slow down. If \`-max-workers\` is too low, Vegeta may fail to sustain rate. If it is unbounded during an infinity-rate attack, the generator can consume too many resources.

## JSON Targets for Dynamic APIs

The \`json\` target format is often better for AI-generated or data-driven test inputs. Each target is one JSON object per line. The method and URL fields are required, and if a body is present the README says it must be base64 encoded. Headers are represented as arrays of strings.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

jq -ncM --arg token "qa-token" 'range(1; 6) as $id | {method: "POST", url: "https://shop.example.test/api/quotes", header: {"Authorization": ["Bearer " + $token], "Content-Type": ["application/json"]}, body: ({sku: ("sku-" + ($id | tostring)), quantity: 1, postalCode: "94105"} | @base64)}' > targets.jsonl

vegeta attack -format=json -targets=targets.jsonl -rate=10/s -duration=30s > results.bin
vegeta report -type=json results.bin > metrics.json
\`\`\`

This sample is intentionally finite. Generated target streams can be infinite, and Vegeta supports lazy reading with \`-lazy\`, but QA gates should start with a test size that humans can inspect. Once the body structure is stable, increase the rate and duration separately so you know whether failures came from arrival rate, data shape, or test length.

| Target format | Strength | Limitation | Use it when |
|---|---|---|---|
| \`http\` | Easy to read and review | Body must be referenced from a file | Small endpoint sets and hand-written smoke tests |
| \`json\` | Easy to generate programmatically | Body must be base64 encoded | Large input matrices or generated payloads |
| stdin pipe | Composes with shell tools | Harder to preserve exact target set | Exploratory one-liners |
| checked-in file | Reviewable and repeatable | Needs test data hygiene | Release gates and regression tests |

## Reports QA Can Defend

Vegeta's text report includes total requests, achieved request rate, throughput, duration, latency percentiles, byte counts, success ratio, status-code counts, and error set. The README defines success as responses without errors and with status codes between 200 and 400, non-inclusive. That means a 302 redirect can be counted successful depending on redirect handling, but a 400 validation response is not.

The JSON report is better for automated gates. The README says duration-like fields are in nanoseconds. Latency keys include \`50th\`, \`90th\`, \`95th\`, and \`99th\`. Parse them as numbers and compare to nanosecond thresholds. Do not compare formatted strings from the text report in CI.

\`\`\`javascript
import fs from 'node:fs';

const metrics = JSON.parse(fs.readFileSync('metrics.json', 'utf8'));

const p95Ms = metrics.latencies['95th'] / 1_000_000;
const p99Ms = metrics.latencies['99th'] / 1_000_000;
const success = metrics.success;

if (success < 0.995) {
  throw new Error(\`success ratio \${success} is below 0.995\`);
}

if (p95Ms > 300) {
  throw new Error(\`p95 \${p95Ms.toFixed(1)} ms is above 300 ms\`);
}

if (p99Ms > 750) {
  throw new Error(\`p99 \${p99Ms.toFixed(1)} ms is above 750 ms\`);
}

console.log(JSON.stringify({ p95Ms, p99Ms, success }, null, 2));
\`\`\`

The script asserts both availability and latency. That combination avoids a vacuous performance gate where p95 looks good only because many slow requests failed early. Add endpoint-specific side-effect checks outside Vegeta when the load test mutates state. For example, if a quote endpoint writes audit rows, query the audit count after the run and verify it matches the number of successful requests you expected.

## CI Gate With Current Actions

A CI job should separate the attack from the gate. First produce \`results.bin\`. Then produce \`metrics.json\`. Then run a small parser that fails with an explicit message. Upload artifacts with names that do not contain slashes.

\`\`\`yaml
name: api-load-gate

on:
  workflow_dispatch:
  pull_request:
    paths:
      - 'api/**'
      - 'performance/**'

jobs:
  vegeta:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22

      - name: Install Vegeta
        run: |
          curl -sSL https://github.com/tsenart/vegeta/releases/download/v12.13.0/vegeta_12.13.0_linux_amd64.tar.gz -o vegeta.tar.gz
          tar -xzf vegeta.tar.gz vegeta
          sudo mv vegeta /usr/local/bin/vegeta
          vegeta -version

      - name: Run quote API attack
        run: |
          vegeta attack -targets=performance/targets.http -rate=50/s -duration=2m -timeout=5s > results.bin
          vegeta report -type=json results.bin > metrics.json
          node performance/assert-vegeta-metrics.mjs

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: vegeta-results-\${{ github.run_id }}
          path: |
            results.bin
            metrics.json
\`\`\`

There are three audit details in that workflow. It uses current major versions for the core GitHub Actions. It pins Vegeta to a concrete release instead of "latest." It names the artifact with hyphens, not a path-like string. These details feel small until they are the reason a performance gate fails before it measures anything.

## Go Library Harness

The Go package documentation exposes Vegeta as a library. \`NewAttacker\` returns an attacker with options, \`Attack\` consumes a targeter, a pacer, duration, and attack name, and \`Metrics\` accumulates results. \`Rate\` is a type alias for \`ConstantPacer\`, so the familiar constant-rate model is available in code.

\`\`\`go
package main

import (
	"fmt"
	"net/http"
	"time"

	vegeta "github.com/tsenart/vegeta/v12/lib"
)

func main() {
	targeter := vegeta.NewStaticTargeter(vegeta.Target{
		Method: "GET",
		URL:    "https://example.com/",
		Header: http.Header{
			"User-Agent": []string{"qa-vegeta-harness"},
		},
	})

	rate := vegeta.Rate{Freq: 10, Per: time.Second}
	duration := 15 * time.Second
	attacker := vegeta.NewAttacker(
		vegeta.Timeout(5*time.Second),
		vegeta.Workers(10),
		vegeta.MaxWorkers(100),
	)

	var metrics vegeta.Metrics
	for result := range attacker.Attack(targeter, rate, duration, "example-home") {
		metrics.Add(result)
	}
	metrics.Close()

	fmt.Printf("requests=%d success=%.4f p95=%s p99=%s\\n",
		metrics.Requests,
		metrics.Success,
		metrics.Latencies.P95,
		metrics.Latencies.P99,
	)

	if metrics.Success < 0.99 {
		panic("success ratio below 0.99")
	}
	if metrics.Latencies.P95 > 250*time.Millisecond {
		panic("p95 above 250ms")
	}
}
\`\`\`

Use the library when the target list is naturally produced by Go code, when you need custom result handling, or when the performance test is part of a larger system verification harness. Use the CLI when a checked-in target file and JSON report are enough. The CLI is easier for mixed QA teams to review, and the library is easier for platform teams to integrate deeply.

## Diagnosing Saturated Workers

A realistic Vegeta failure often looks like a product regression but starts in the generator. Suppose a CI run at \`500/s\` shows p99 above two seconds and many status code \`0\` results. The text report's error set includes connection timeouts. Before filing a backend bug, compare requested rate, achieved rate, local CPU, open file limits, and worker behavior.

The README says the actual runtime can be longer than \`-duration\` because Vegeta waits for delayed responses. It also says workers can increase to sustain rate until \`-max-workers\` is reached. If your generator machine is starved, you may see low achieved rate, high client-side errors, and misleading latency. That is not proof the service is healthy or unhealthy. It is proof the experiment is underspecified.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

ulimit -n

for rate in 100/s 200/s 400/s; do
  safe_name=\${rate//\\//-}
  vegeta attack -targets=targets.http -rate="\${rate}" -duration=90s -timeout=5s -workers=50 -max-workers=1000 -name="quote-\${safe_name}" > "results-\${safe_name}.bin"

  vegeta report -type=json "results-\${safe_name}.bin" > "metrics-\${safe_name}.json"
  vegeta report -type=text "results-\${safe_name}.bin"
done
\`\`\`

Diagnose in this order. First, check whether the achieved request rate is close to the requested rate. Second, inspect \`Status Codes\`, especially code \`0\`, which the README associates with requests that failed to be sent. Third, examine the error set. Fourth, compare server-side metrics such as CPU, DB pool wait time, queue depth, and upstream errors. Only then decide whether to tune Vegeta, scale the generator, distribute the attack, or file a product issue.

| Symptom | Likely cause | Evidence | Next move |
|---|---|---|---|
| Achieved rate below requested rate | Generator cannot keep up or max workers capped | Text report rate, CPU, worker limit | Increase generator capacity or reduce rate |
| Many status code \`0\` results | Client-side send failures | Error set has dial or timeout errors | Check network, DNS, ulimit, timeout |
| Success low with many 500s | Application failure | Status-code histogram and server logs | File backend defect with correlation ids |
| p95 good but p99 terrible | Tail latency or queueing | JSON percentiles and plot | Inspect dependency saturation |
| Throughput far below request rate | Low successful completion rate | Text report throughput vs rate | Fix errors before trusting latency |

## Vegeta vs k6, JMeter, and Gatling

Vegeta is intentionally compact. It is not trying to be a full performance lab. That is good when you want a reviewable target file and a pipeline gate. It is less good when a test journey needs login correlation, browser-level resources, multi-step user state, or built-in dashboards.

| Tool | Sweet spot | Script shape | When Vegeta wins |
|---|---|---|---|
| Vegeta | Constant-rate HTTP endpoint tests | Targets plus CLI flags, or Go library | Fast API gates and simple reproducible attacks |
| k6 | Scripted API scenarios and thresholds | JavaScript modules | Complex flows with richer checks |
| JMeter | Broad protocol support and GUI history | Test plans | Legacy teams and non-HTTP protocols |
| Gatling | High-throughput scenario simulation | Scala, Java, or JS DSLs | Large engineered performance suites |

The right pattern in many QA organizations is not one winner. Use Vegeta for small endpoint budgets in pull requests and nightly smoke load. Use k6 or Gatling for multi-step flows. Keep JMeter where existing protocol support or organizational knowledge is valuable. What matters is that p95, p99, success ratio, and side effects are comparable across tools.

## What People Get Wrong

The first mistake is treating \`-rate\` like a user count. It is not. \`-rate=100/s\` means Vegeta tries to issue 100 requests per second. Depending on latency, that may require a small or large amount of concurrency. If stakeholders ask for "500 users," translate that into observed arrival rates or choose a closed-user tool.

The second mistake is gating only on latency. A service that rejects half the requests quickly can show excellent p95. Always gate on success ratio and status distribution before latency. For mutating endpoints, add a post-run assertion that proves side effects happened exactly once where expected.

The third mistake is forgetting target realism. A single cached GET endpoint at 1000/s does not validate checkout, auth, personalization, or database writes. Split target files by intent: cacheable reads, authenticated reads, idempotent writes, and expensive writes. Different endpoints deserve different rates and thresholds.

## Operating Checklist

Before adding Vegeta to CI, answer a short set of questions. What production signal justifies this rate? Which endpoint or endpoint mix is represented? Are credentials safe and scoped? Is test data isolated? What success ratio is acceptable? Which latency percentile is the release blocker? What server dashboard should be opened when the gate fails?

Keep raw results for failed runs, JSON for automation, text for quick human reading, histograms for threshold discussions, and plots for time-shaped regressions. If the plot shows latency rising throughout the run, suspect a leak, queue, compaction, cache churn, or downstream limit. If latency spikes in bands, suspect batch jobs, garbage collection, or shared CI infrastructure.

Finally, keep the test boring. A Vegeta gate should be small enough that a QA engineer can read the target file, rate, duration, thresholds, and failure message in one review. The more ceremony you add, the more likely the team ignores the result when it matters.

## Frequently Asked Questions

### Is Vegeta still maintained?

Yes. The official GitHub releases page and Go package index show v12.13.0 published on October 31, 2025, and the repository README documents current CLI flags and library APIs. As with any open-source load tool, pin the version in CI and review release notes before upgrading. That gives QA stable baselines and avoids surprise changes in reports, target parsing, or transport behavior.

### Does Vegeta avoid coordinated omission?

The README lists avoiding coordinated omission as a feature, and the constant-rate attack model is the reason. Vegeta schedules arrivals according to the requested rate instead of waiting for each virtual user loop to finish before creating more work. That makes it better at revealing latency under overload. You still need to choose realistic rates, keep the generator healthy, and interpret client-side errors separately from server-side failures.

### Should I use \`-rate=0\` for stress testing?

Use it carefully. The README says \`-rate=0\` or \`infinity\` sends requests as fast as possible and warns that very high \`-max-workers\` can consume too many resources and crash Vegeta. For release gates, use explicit rates based on production or capacity goals. Save infinity mode for controlled experiments where the generator machine, network, and blast radius are understood.

### Can Vegeta test authenticated APIs?

Yes. Put static headers in an \`http\` target file, generate JSON targets with authorization headers, or add global headers with repeated \`-header\` flags. The hard part is token lifecycle. Do not use personal tokens in checked-in target files. Prefer scoped test credentials, short-lived tokens created before the run, or a target generator that reads a CI secret and emits temporary headers without printing them to logs.
`,
};
