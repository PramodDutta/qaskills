import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "gRPC API Testing: ghz, grpcurl & Contract Testing (2026)",
  description: "A practical 2026 gRPC API testing guide: call services with grpcurl, load test with ghz, catch breaking .proto changes with Buf, and probe health checks.",
  date: "2026-06-26",
  category: "API Testing",
  content: `# gRPC API Testing: ghz, grpcurl & Contract Testing (2026)

gRPC API testing means exercising a Protocol Buffers service over HTTP/2 the same way you would a REST API — except the payloads are binary, the contract lives in \`.proto\` files, and \`curl\` cannot natively speak the wire format. The practical toolkit is three commands: **\`grpcurl\`** to call methods and inspect services, **\`ghz\`** to load test them and report percentile latency, and **\`buf breaking\`** to fail CI when a schema change would break existing clients. This guide wires all three together, with every flag verified against the real tools.

A note before the commands: gRPC has four call types — **unary**, **server streaming**, **client streaming**, and **bidirectional streaming** — and your testing approach changes for each. Most of what follows targets unary calls because they dominate real services, but the streaming notes matter the moment you test a chat, telemetry, or sync API.

## Why gRPC Needs Its Own Test Tooling

A REST endpoint speaks JSON over HTTP/1.1, so any HTTP client can poke it. gRPC serializes messages with Protocol Buffers over HTTP/2 multiplexed streams, which means a generic client cannot read or write the body without the schema. You have two ways to give a tool that schema:

| Mechanism | How it works | When to use |
|---|---|---|
| **Server reflection** | The server exposes a \`grpc.reflection.v1.ServerReflection\` service that describes its own methods at runtime | Local dev, debugging, when reflection is enabled |
| **\`.proto\` files** | You point the tool at the source \`.proto\` definitions directly | CI, production, when reflection is disabled for security |

Reflection is the ergonomic path — no files to manage — but it is commonly turned off in production because it lets anyone enumerate your API surface. Good test setups support both: reflection locally, explicit \`.proto\` imports in the pipeline. The rest of this guide shows each flag in both modes.

## Calling gRPC Methods with grpcurl

\`grpcurl\` is the \`curl\` of gRPC. Install it with Go or a package manager:

\`\`\`bash
# Go 1.21+
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# macOS
brew install grpcurl
\`\`\`

The most important flag is \`-plaintext\`. gRPC defaults to TLS, so against a local server with no certificate you must pass \`-plaintext\` or every call fails with a transport error. Start by listing services via reflection:

\`\`\`bash
# Enumerate services the server exposes (reflection must be on)
grpcurl -plaintext localhost:50051 list

# List methods on one service
grpcurl -plaintext localhost:50051 list routeguide.RouteGuide

# Show the full message schema for a method
grpcurl -plaintext localhost:50051 describe routeguide.RouteGuide.GetFeature
\`\`\`

### Sending a request

The \`-d\` flag carries the request message as JSON; \`grpcurl\` transcodes it to Protocol Buffers for you. The method is addressed as \`package.Service/Method\`:

\`\`\`bash
grpcurl -plaintext \\
  -d '{"latitude": 409146138, "longitude": -746188906}' \\
  localhost:50051 routeguide.RouteGuide/GetFeature
\`\`\`

To read the request body from stdin (handy in scripts and CI), pass \`-d @\`:

\`\`\`bash
echo '{"latitude": 409146138, "longitude": -746188906}' | \\
  grpcurl -plaintext -d @ localhost:50051 routeguide.RouteGuide/GetFeature
\`\`\`

When reflection is disabled, supply the schema yourself with \`-import-path\` (the proto root) and \`-proto\` (the entry file):

\`\`\`bash
grpcurl -plaintext \\
  -import-path ./proto \\
  -proto routeguide.proto \\
  -d '{"latitude": 409146138, "longitude": -746188906}' \\
  localhost:50051 routeguide.RouteGuide/GetFeature
\`\`\`

### Metadata, TLS, and defaults

gRPC metadata is the equivalent of HTTP headers — that is where auth tokens go. Pass them with \`-H\`. For a real TLS endpoint, drop \`-plaintext\`; add \`-insecure\` only when you must skip certificate verification against a self-signed cert.

\`\`\`bash
# Authenticated call over TLS
grpcurl \\
  -H 'authorization: Bearer eyJhbGci...' \\
  -d '{"id": "42"}' \\
  api.example.com:443 user.UserService/GetUser

# Include fields left at their proto3 default (0, "", false) in the response
grpcurl -plaintext -emit-defaults \\
  -d '{"id": "42"}' \\
  localhost:50051 user.UserService/GetUser
\`\`\`

\`-emit-defaults\` matters for assertions: proto3 omits default-valued fields from JSON output by default, so a field that is legitimately \`0\` or \`""\` simply vanishes. If your test asserts on its presence, add \`-emit-defaults\` or your check will be brittle — the same defensive habit you bring to JSON-shape assertions in any API suite.

## Load Testing gRPC with ghz

\`ghz\` is a dedicated gRPC benchmarking tool — think of it as the gRPC counterpart to a REST load tester. It opens HTTP/2 connections, fires a configurable number of requests at a target concurrency or rate, and reports a latency distribution with percentiles.

\`\`\`bash
# Go install
go install github.com/bojand/ghz/cmd/ghz@latest

# macOS
brew install ghz
\`\`\`

A basic run mirrors \`grpcurl\`'s addressing, but the flags differ. \`--insecure\` is the \`ghz\` equivalent of \`-plaintext\`:

\`\`\`bash
ghz --insecure \\
  --proto ./proto/routeguide.proto \\
  --call routeguide.RouteGuide.GetFeature \\
  -d '{"latitude": 409146138, "longitude": -746188906}' \\
  -n 2000 \\
  -c 50 \\
  localhost:50051
\`\`\`

The two knobs that define the test:

- **\`-n\`** — total number of requests to send (here, 2000).
- **\`-c\`** — number of concurrent workers (here, 50 in flight at once).

To hold a steady throughput instead of firing as fast as possible, use a rate limit and/or a duration:

\`\`\`bash
ghz --insecure \\
  --proto ./proto/routeguide.proto \\
  --call routeguide.RouteGuide.GetFeature \\
  -d '{"latitude": 409146138, "longitude": -746188906}' \\
  --rps 500 \\
  -z 30s \\
  localhost:50051
\`\`\`

| Flag | Meaning |
|---|---|
| \`-n\` | Total requests (mutually useful with \`-c\`) |
| \`-c\` | Concurrent workers |
| \`--rps\` | Cap requests per second (constant-rate load) |
| \`-z\` | Run for a fixed duration, e.g. \`30s\`, \`5m\` |
| \`--connections\` | Number of HTTP/2 connections to spread workers across |
| \`-m\` | Request metadata as JSON (auth headers, etc.) |

### Reading the ghz report

By default \`ghz\` prints a summary to the terminal: total count, requests/sec, and a latency distribution including the 95th and 99th percentiles. **Read the tail, not the average** — a healthy mean with a 99th percentile in the seconds means a slice of users are timing out. To capture a shareable artifact, render an HTML report:

\`\`\`bash
ghz --insecure \\
  --proto ./proto/routeguide.proto \\
  --call routeguide.RouteGuide.GetFeature \\
  -d '{"latitude": 409146138, "longitude": -746188906}' \\
  -n 5000 -c 50 \\
  -O html -o report.html \\
  localhost:50051
\`\`\`

\`-O\` sets the output format (\`html\`, \`json\`, \`csv\`, \`summary\`) and \`-o\` the destination file. The JSON format is the one to feed a CI gate — parse \`average\`, \`fastest\`, \`slowest\`, and the \`latencyDistribution\` array, and fail the build when p99 crosses your budget. The percentile discipline is identical to HTTP load testing: pick a tail target like p99, gate on it, and treat the average as a comfort number rather than a pass/fail signal.

### Varying the payload

Hammering one identical request rarely reflects production. \`ghz\` can read a data file or stream distinct messages with \`--data-file\`:

\`\`\`bash
# requests.json is a JSON array; ghz cycles through the entries
ghz --insecure \\
  --proto ./proto/user.proto \\
  --call user.UserService.GetUser \\
  --data-file ./requests.json \\
  -n 1000 -c 20 \\
  localhost:50051
\`\`\`

This exercises cache misses, different code paths, and varied response sizes instead of letting a single hot key sit in cache and flatter your numbers.

## Contract Testing gRPC with Buf

The \`.proto\` file *is* the contract between server and client. The highest-leverage gRPC test is not a request at all — it is catching a schema change that would break deployed clients before it ships. Protocol Buffers has explicit wire-compatibility rules (you may add fields; you must never reuse a field number or change a field's type), and **Buf** enforces them mechanically.

\`\`\`bash
# Install the buf CLI
brew install bufbuild/buf/buf
# or: go install github.com/bufbuild/buf/cmd/buf@latest
\`\`\`

Two commands cover linting and breaking-change detection. \`buf lint\` enforces style and correctness rules on the schema itself:

\`\`\`bash
buf lint
\`\`\`

\`buf breaking\` compares your current \`.proto\` files against a baseline — typically \`main\` — and exits non-zero if the change is wire-incompatible:

\`\`\`bash
# Compare working tree against the main branch on Git
buf breaking --against '.git#branch=main'

# Compare against a published module in the Buf Schema Registry
buf breaking --against 'buf.build/acme/petstore'
\`\`\`

A minimal \`buf.yaml\` configures which rule categories run. \`WIRE_JSON\` catches anything that breaks either the binary or JSON encoding — the safest default for a public API:

\`\`\`yaml
version: v2
breaking:
  use:
    - WIRE_JSON
lint:
  use:
    - STANDARD
\`\`\`

Wire this into CI and a pull request that renumbers a field, deletes a method, or changes \`int32\` to \`string\` fails immediately. That is true consumer-safety contract testing for gRPC: the producer cannot merge an incompatible schema. For provider/consumer contract testing of the *behavior* (not just the schema) across services, the broker-based approach in the [Pact contract testing guide](/blog/pact-contract-testing-complete-guide-2026) and the [Pact vs Spring Cloud Contract comparison](/compare/pact-vs-spring-cloud-contract) extend the idea beyond schema compatibility.

## Testing Streaming RPCs

Unary calls are request/response, but three of gRPC's four call types stream. \`grpcurl\` handles each with the same \`-d\` flag — you just provide the right shape of input.

- **Server streaming** (one request, many responses): send a single JSON object; \`grpcurl\` prints each streamed message as it arrives.
- **Client streaming** (many requests, one response): pass a JSON array, or stream newline-delimited JSON objects via \`-d @\` on stdin.
- **Bidirectional**: feed newline-delimited messages on stdin with \`-d @\`; responses interleave.

\`\`\`bash
# Client-streaming: each line is one message in the stream
printf '%s\\n' \\
  '{"latitude": 1, "longitude": 1}' \\
  '{"latitude": 2, "longitude": 2}' \\
  '{"latitude": 3, "longitude": 3}' | \\
  grpcurl -plaintext -d @ localhost:50051 routeguide.RouteGuide/RecordRoute
\`\`\`

For load testing streams, \`ghz\` supports streaming calls too, but interpret the results carefully: a "request" in a streaming benchmark is a full stream open/close cycle, so the latency numbers measure stream lifetime, not per-message round trips. Treat streaming load tests as their own category rather than comparing their numbers to unary runs.

## Probing gRPC Health Checks

Kubernetes, Envoy, and load balancers determine whether a gRPC service is ready using the standard **gRPC Health Checking Protocol** (\`grpc.health.v1.Health\`), which exposes a \`Check\` method returning \`SERVING\`, \`NOT_SERVING\`, or \`UNKNOWN\`. Your tests should verify this endpoint, because if it lies, traffic gets routed to a broken pod.

Call it with \`grpcurl\` like any other method:

\`\`\`bash
# Overall server health
grpcurl -plaintext localhost:50051 grpc.health.v1.Health/Check

# Health of one named service
grpcurl -plaintext \\
  -d '{"service": "routeguide.RouteGuide"}' \\
  localhost:50051 grpc.health.v1.Health/Check
\`\`\`

For container readiness probes, the purpose-built \`grpc_health_probe\` binary returns the right process exit code for an orchestrator:

\`\`\`bash
grpc_health_probe -addr=localhost:50051
# exit 0 => SERVING, non-zero => unhealthy
\`\`\`

Note that modern Kubernetes ships a native gRPC liveness/readiness probe, so new clusters often skip the standalone binary — but the underlying \`grpc.health.v1.Health\` service is the same contract either way, and a health-check assertion belongs in every gRPC smoke test.

## A Layered gRPC Testing Strategy

No single command covers correctness, performance, and contract safety. Layer them so each catches what the others miss:

| Layer | Tool | Catches |
|---|---|---|
| Schema / contract gate | \`buf lint\` + \`buf breaking\` | Wire-incompatible \`.proto\` changes before merge |
| Functional / smoke | \`grpcurl\` | Wrong responses, auth failures, broken methods |
| Health & readiness | \`grpcurl\` / \`grpc_health_probe\` | Services reporting healthy while broken |
| Load & latency | \`ghz\` | Tail-latency regressions under concurrency |

Run \`buf breaking\` on every pull request as a hard gate, scripted \`grpcurl\` calls as a post-deploy smoke suite, and \`ghz\` against a staging build to protect p99 before release. The schema gate is the cheapest and highest-value of the four — it turns "we broke a downstream client" from a production incident into a failed CI check. Browse the [QA skills directory](/skills) for ready-made gRPC, contract-testing, and load-testing skills you can drop straight into an AI coding agent's workflow.

## Frequently Asked Questions

### Why doesn't curl work for testing gRPC?

\`curl\` speaks HTTP and can open an HTTP/2 connection, but it has no idea how to serialize a Protocol Buffers message or read one back — the gRPC body is length-prefixed binary framed on top of HTTP/2, not text. You need a tool that understands the \`.proto\` schema to encode the request and decode the response. \`grpcurl\` is purpose-built for exactly that and keeps a curl-like command-line feel.

### What is the difference between grpcurl and ghz?

\`grpcurl\` is for single, interactive calls — debugging, smoke tests, and inspecting a service's methods and message shapes. \`ghz\` is for load and performance testing: it fires thousands of requests at a target concurrency or rate and reports a latency distribution with p95/p99. Use \`grpcurl\` to confirm a method works correctly, then \`ghz\` to confirm it stays fast under pressure.

### How do I test gRPC when server reflection is disabled?

Point your tool at the \`.proto\` source files directly instead of relying on the server to describe itself. With \`grpcurl\` use \`-import-path\` for the proto root plus \`-proto\` for the entry file; with \`ghz\` use \`--proto\` and \`--call\`. This is the normal mode in CI and against production, where reflection is usually turned off so attackers cannot enumerate your API surface.

### How do I catch breaking changes in a .proto file?

Run \`buf breaking --against\` with a baseline — typically the \`main\` branch or a module in the Buf Schema Registry — in CI. Buf knows the Protocol Buffers wire-compatibility rules (you may add fields, but never reuse a field number or change a type) and exits non-zero when a change would break deployed clients. Combined with \`buf lint\`, it turns schema safety into an automated pull-request gate.

### Can I load test gRPC streaming methods with ghz?

Yes, \`ghz\` supports server-streaming, client-streaming, and bidirectional calls, but read the numbers differently. In a streaming benchmark each counted "request" is a complete stream open-to-close cycle, so the reported latency reflects stream lifetime rather than per-message round-trip time. Keep streaming load results in their own bucket and do not compare them directly to unary RPC latency.

### Should I test the gRPC health check endpoint?

Absolutely — orchestrators like Kubernetes and proxies like Envoy route traffic based on the \`grpc.health.v1.Health/Check\` response, so a health check that wrongly reports \`SERVING\` sends users to a broken instance. Add an assertion that \`Check\` returns \`SERVING\` to your smoke suite, using \`grpcurl\` for ad hoc verification or \`grpc_health_probe\` when you need a process exit code for a container probe.
`,
};
