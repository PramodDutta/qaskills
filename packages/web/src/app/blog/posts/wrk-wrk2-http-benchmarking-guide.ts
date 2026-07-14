import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'wrk and wrk2 HTTP Benchmarking Complete Guide for 2026',
  description:
    'Master wrk and wrk2 for HTTP microbenchmarks. Cover command flags, Lua scripts, coordinated omission, HDR histograms, and how wrk fits with k6 and JMeter.',
  date: '2026-05-10',
  category: 'Performance',
  content: `
# wrk and wrk2 HTTP Benchmarking Complete Guide for 2026

wrk is a C-based HTTP benchmarking tool that focuses on one thing: maximum throughput against a single endpoint. It is not a load testing tool in the user-journey sense. It does not parameterize from CSVs, it does not chain requests, it does not produce HTML reports. What it does do is generate hundreds of thousands of requests per second from a single laptop, with tighter timing accuracy than almost any other tool. For engineers working on hot paths, microservice performance, or proving that the load balancer can sustain a given RPS, wrk is the right tool.

wrk2, a fork by Gil Tene of Azul Systems, adds two essential features for production use: a steady arrival rate (open model) and HDR histogram output. Together wrk and wrk2 are the standard benchmarking pair for SREs and performance engineers who care about tail latencies and coordinated omission. This guide covers both in 2026. We walk through installation, command flags, Lua scripts, the coordinated omission problem and why wrk2 solves it, HDR histograms, and how to integrate wrk results into larger performance reports. For broader tooling see [k6 vs JMeter](/blog/k6-vs-jmeter-2026) and the [skills directory](/skills).

## Why wrk and wrk2

Three reasons SREs reach for wrk:

1. **Maximum throughput in a single binary.** wrk can saturate a 10 Gbps NIC from a laptop. No other load tool gets this close to wire speed.
2. **Tight timing.** wrk's event-loop architecture has minimal scheduling jitter. Latencies it measures are close to physical reality.
3. **Easy to script.** Lua extensions hook into request generation and response handling for custom scenarios.

The trade-off is that wrk does only HTTP and does only one endpoint per run. For complex user journeys use k6 or Locust. For microbenchmarks, capacity tests, and "how many RPS can this single endpoint sustain" questions, wrk is unmatched.

| Tool | Use Case | Peak Single-Machine RPS |
|---|---|---|
| wrk | Maximum throughput | 500k+ |
| wrk2 | Constant arrival rate plus HDR | 200k+ |
| k6 | User journeys plus thresholds | 30k-40k |
| Locust | Python user journeys | 5k-10k per worker |
| JMeter | Multi-protocol enterprise | 5k-8k |

## Installing wrk and wrk2

Both tools require building from source on Linux and macOS. They are not in default Ubuntu apt repos in 2026, but Homebrew packages exist for macOS.

\`\`\`bash
# macOS
brew install wrk

# Ubuntu/Debian build from source
sudo apt install build-essential libssl-dev git
git clone https://github.com/wg/wrk.git
cd wrk
make
sudo mv wrk /usr/local/bin/

# wrk2 (similar build)
git clone https://github.com/giltene/wrk2.git
cd wrk2
make
sudo mv wrk /usr/local/bin/wrk2
\`\`\`

Verify both:

\`\`\`bash
wrk --version
wrk2 --version
\`\`\`

## Your First Benchmark

The simplest wrk invocation hits an endpoint with N threads, M open connections, for T seconds.

\`\`\`bash
wrk -t12 -c400 -d30s --latency https://api.example.com/health
\`\`\`

Flags:
- \`-t12\`: 12 threads (typically one per CPU core)
- \`-c400\`: 400 concurrent open connections
- \`-d30s\`: 30 seconds duration
- \`--latency\`: print latency distribution

Output:

\`\`\`
Running 30s test @ https://api.example.com/health
  12 threads and 400 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    14.32ms   28.78ms 1.78s    96.45%
    Req/Sec    2.42k     312.89   3.78k    78.23%
  Latency Distribution
     50%   10.43ms
     75%   16.21ms
     90%   25.87ms
     99%  124.34ms
  870234 requests in 30.00s, 142.32MB read
Requests/sec:  29008.34
Transfer/sec:      4.74MB
\`\`\`

This is the canonical wrk output. The latency distribution at the bottom is what most engineers care about for tail latency analysis.

## Thread and Connection Tuning

The thread count should typically match physical CPU cores or be slightly less. Each thread runs an independent event loop. Too few threads means a single core is overloaded; too many means context switching overhead.

Connections are distributed across threads. With \`-t12 -c400\`, each thread maintains ~33 open connections. For high-throughput tests against a load balancer, you typically want enough connections to keep all backend pools busy. The rule of thumb: more connections than expected concurrent requests, but not so many that they overwhelm the client OS.

\`\`\`bash
# Light load
wrk -t4 -c50 -d30s URL

# Standard
wrk -t12 -c400 -d60s URL

# Heavy
wrk -t24 -c2000 -d120s URL
\`\`\`

Watch \`netstat\` or \`ss\` during the run to confirm connections are stable. If the kernel runs out of ephemeral ports you will see ECONNREFUSED errors. Tune \`net.ipv4.ip_local_port_range\` if needed.

## Lua Scripting

wrk's killer feature is Lua scripting. Hook into request and response lifecycles to customize.

\`\`\`lua
-- script.lua

-- Called once per worker before benchmark starts
init = function(args)
  local r = {}
  for i, v in ipairs(args) do
    r[i] = v
  end
  print("Init with args:", table.concat(r, ","))
end

-- Called for each request
request = function()
  local headers = { ["Authorization"] = "Bearer " .. os.getenv("TOKEN") }
  local body = '{"sku":"ABC-' .. math.random(1, 1000) .. '"}'
  return wrk.format("POST", "/cart", headers, body)
end

-- Called after each response
response = function(status, headers, body)
  if status ~= 200 then
    print("Got non-200:", status, body)
  end
end

-- Called once when benchmark ends
done = function(summary, latency, requests)
  print("Total requests:", summary.requests)
  print("p99 latency:", latency:percentile(99))
end
\`\`\`

Run with \`-s\`:

\`\`\`bash
wrk -t12 -c400 -d30s -s script.lua --latency https://api.example.com/
\`\`\`

The script generates POST requests with random SKUs and a custom Authorization header. The Lua API gives you complete control over what each request looks like.

| Hook | When | Use Case |
|---|---|---|
| setup(thread) | Per-thread init | Per-thread state |
| init(args) | Per-thread, before benchmark | Read args, seed RNG |
| request() | Per request | Vary payload |
| response(s, h, b) | Per response | Count errors, capture |
| done(summary, latency, requests) | End of run | Custom output |

## Coordinated Omission

The reason wrk2 exists. Standard wrk operates in closed-loop mode: when a request finishes, it sends another. If the server slows down, wrk sends fewer requests, and the latencies wrk reports are not what real users would see. The latencies measured don't include the time the request would have spent waiting in a queue if there had been queuing. This is Gil Tene's "coordinated omission" problem.

wrk2 fixes it. You specify a target rate with \`-R\`, and wrk2 generates requests at that constant rate regardless of server response time. If the server slows, requests pile up, and the latencies wrk2 reports include the queueing time. This is what your real users experience.

\`\`\`bash
# Standard wrk: pace by completion time (broken for tail latency)
wrk -t12 -c400 -d30s URL

# wrk2: constant 10,000 RPS regardless of response time (correct)
wrk2 -t12 -c400 -d30s -R10000 URL
\`\`\`

If you publish tail latency numbers without using wrk2 (or another open-loop tool), your numbers are systematically too good. Production traffic does not slow down because the server slowed down; it keeps arriving.

## HDR Histograms

wrk2 outputs HDR histograms (High Dynamic Range histograms) instead of just percentiles. HDR histograms are accurate across many orders of magnitude of latency without losing resolution at the tail.

\`\`\`bash
wrk2 -t12 -c400 -d30s -R10000 --latency URL > result.txt

# Detailed latency distribution
Latency Distribution (HdrHistogram - Recorded Latency)
50.000%   12.34ms
75.000%   23.45ms
90.000%   45.67ms
99.000%  142.34ms
99.900%  543.21ms
99.990%  1.34s
99.999%  4.56s
\`\`\`

These detailed percentiles are essential for SLO work. If your SLO says "99.9% of requests faster than 500 ms", you need 99.9th percentile measured accurately. wrk2's HDR histogram delivers that.

For analysis you can also export raw HDR histogram data and merge across runs with the HdrHistogram tools.

## Real Examples

A few useful patterns we apply at qaskills.sh:

\`\`\`bash
# 1. Baseline capacity probe: how much can it take?
wrk2 -t12 -c1000 -d120s -R100000 https://api.example.com/health

# 2. SLO validation: does it meet p99 < 500ms at expected load?
wrk2 -t12 -c400 -d300s -R5000 --latency https://api.example.com/search

# 3. Tail latency comparison after deploy
wrk2 -t12 -c400 -d60s -R5000 --latency https://canary.example.com/ > canary.txt
wrk2 -t12 -c400 -d60s -R5000 --latency https://prod.example.com/ > prod.txt
diff canary.txt prod.txt
\`\`\`

These commands replace days of manual capacity planning with minutes of wall time per test.

## Custom Scenarios with Lua

For non-trivial scenarios where vanilla wrk is too limited but a full k6 script is overkill, Lua bridges the gap.

\`\`\`lua
-- multi-endpoint.lua
local counter = 0
local paths = {"/api/products", "/api/categories", "/api/search?q=laptop"}

request = function()
  counter = counter + 1
  local path = paths[counter % #paths + 1]
  return wrk.format("GET", path)
end

response = function(status, headers, body)
  if status >= 500 then
    print("5xx error on", wrk.path)
  end
end
\`\`\`

The script rotates through three paths in round-robin. Most production wrk benchmarks have a Lua script of 20-50 lines.

## Comparison with k6

When to choose wrk over k6 and vice versa:

| Scenario | Use wrk | Use k6 |
|---|---|---|
| Max throughput single endpoint | Yes | No |
| User journey with login plus cart | No | Yes |
| HDR histogram tail latency | Yes (wrk2) | k6 has limited HDR |
| Threshold-based CI pass/fail | Awkward | Native |
| Distributed cloud runs | No | Yes (k6 Cloud) |
| Lua scripting | Yes | No (k6 uses JS) |
| WebSocket | Limited | Yes |

For one-shot capacity tests, wrk or wrk2. For ongoing CI-integrated load tests with multiple scenarios and thresholds, k6.

## Integrating into Reports

wrk output is plain text. To incorporate into broader perf reports, parse the output:

\`\`\`bash
#!/bin/bash
# wrk-to-csv.sh
OUTPUT=$(wrk2 -t12 -c400 -d60s -R5000 --latency $1 2>&1)

P50=$(echo "$OUTPUT" | grep -oP '50\\.000%\\s+\\K[\\d.]+(?=ms)')
P99=$(echo "$OUTPUT" | grep -oP '99\\.000%\\s+\\K[\\d.]+(?=ms)')
P999=$(echo "$OUTPUT" | grep -oP '99\\.900%\\s+\\K[\\d.]+(?=ms)')
RPS=$(echo "$OUTPUT" | grep -oP 'Requests/sec:\\s+\\K[\\d.]+')

echo "url,p50,p99,p999,rps"
echo "$1,$P50,$P99,$P999,$RPS"
\`\`\`

Push the CSV into your performance database. Compare runs across releases to track regressions.

## Common Mistakes

Five mistakes we see repeatedly:

1. **Using standard wrk instead of wrk2 for SLO work.** Tail latencies are wrong due to coordinated omission. Always use wrk2 for SLO validation.
2. **Not enough connections.** \`-c50\` against a service expecting thousands of concurrent connections doesn't test what you think. Match \`-c\` to expected real load.
3. **Running wrk on the same machine as the server.** Client and server compete for CPU. Run from a separate machine, ideally in the same VPC.
4. **Forgetting \`--latency\`.** Without it you get only mean and stdev, not percentiles.
5. **No warm-up.** First N seconds of any benchmark include cold starts, JIT compilation, cache misses. Run for 60+ seconds or use a warm-up phase.

## Conclusion

wrk and wrk2 are the right tools for single-endpoint throughput benchmarks and tail latency analysis. They are not a replacement for k6 or Locust for user-journey load testing, but they complement those tools by answering the "how fast can it go" and "what does the tail look like" questions with exceptional precision.

If you are doing performance work in 2026, install both and reach for them whenever a question is single-endpoint focused. Read [k6 vs JMeter](/blog/k6-vs-jmeter-2026) for tool comparisons and browse the [skills directory](/skills) for load testing AI agent skills.
`,
};
