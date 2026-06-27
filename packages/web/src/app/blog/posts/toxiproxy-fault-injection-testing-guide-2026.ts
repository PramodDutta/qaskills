import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Toxiproxy Fault Injection: Simulate Network Failures in Tests (2026)",
  description: "A 2026 guide to Toxiproxy fault injection: proxy your dependencies, inject latency, bandwidth, timeout and down toxics, and assert resilience in your tests.",
  date: "2026-06-26",
  category: "Performance",
  content: `# Toxiproxy Fault Injection: Simulate Network Failures in Tests (2026)

Toxiproxy is Shopify's open-source TCP proxy for simulating network failures in tests. You point your app at a Toxiproxy listener instead of the real dependency, then inject **toxics** — latency, limited bandwidth, dropped connections, timeouts — and assert that your retries, timeouts, and circuit breakers behave. It runs as a Go binary (\`toxiproxy-server\`) controlled by an HTTP API on port \`8474\`, a CLI, or a client library in Go, Ruby, Python, or Node. A first fault is one call: add a \`latency\` toxic and your service sees a slow database. This guide covers setup, every toxic, test integration, and CI.

Every command, flag, toxic name, and API field below is real and matches Toxiproxy's actual interface. Where attributes differ between toxic types, the canonical reference is the project README and \`toxiproxy-cli toxic add --help\` — run it for your installed version rather than guessing.

## What Toxiproxy Actually Does

Most production outages are *partial* network failures — a database that responds in 8 seconds instead of 8 milliseconds, a connection that resets mid-stream, an API that accepts bytes but never replies. Unit tests almost never exercise these paths because the dependency is either mocked away or healthy. Toxiproxy fills that gap by sitting **between your application and a real (or fake) dependency** and corrupting the TCP stream on demand.

The model has three moving parts:

1. **The server (\`toxiproxy-server\`)** — a daemon that opens proxy listeners and owns an HTTP control API, by default on \`localhost:8474\`.
2. **A proxy** — a named tuple of \`listen\` (where your app connects) and \`upstream\` (the real dependency). Your app connects to the listener; Toxiproxy forwards bytes to upstream.
3. **Toxics** — the actual faults applied to a proxy's \`upstream\` or \`downstream\` stream. Toxics are added and removed at runtime via the API, so a test can enable a fault, exercise a code path, then remove it — no restart.

Because Toxiproxy is a real TCP proxy and not a mock, it works with *any* protocol that runs over TCP: PostgreSQL, MySQL, Redis, HTTP, gRPC, Kafka, AMQP. Your application code is unchanged; only the host and port it connects to point at the proxy.

## Installing and Running Toxiproxy

Toxiproxy ships as a server binary plus a CLI. Grab a release, or use a package manager / Docker.

\`\`\`bash
# macOS (Homebrew) — installs both server and CLI
brew install toxiproxy

# Linux: download the release binaries from GitHub
# (Shopify/toxiproxy releases) then:
chmod +x toxiproxy-server toxiproxy-cli

# Start the server (HTTP API on :8474, proxies bind as you create them)
toxiproxy-server
\`\`\`

For CI and local stacks, the official Docker image is usually simpler — expose the API port plus whatever proxy ports you intend to create:

\`\`\`yaml
# docker-compose.yml
services:
  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:2.12.0
    ports:
      - "8474:8474"   # control API
      - "5433:5433"   # proxied Postgres listener (example)
\`\`\`

With the server up, the CLI talks to it over the API. List proxies (empty at first) to confirm connectivity:

\`\`\`bash
toxiproxy-cli list
\`\`\`

If you run the server on a non-default address, point the CLI at it with \`--host\` (or the \`TOXIPROXY_URL\` environment variable):

\`\`\`bash
toxiproxy-cli --host http://toxiproxy:8474 list
\`\`\`

## Creating Your First Proxy

A proxy maps a local listener to a real upstream. Suppose your app normally connects to Postgres on \`db:5432\`. Create a proxy that listens on \`5433\` and forwards there:

\`\`\`bash
toxiproxy-cli create -l 127.0.0.1:5433 -u db:5432 postgres
\`\`\`

\`-l\` (\`--listen\`) is where your app connects; \`-u\` (\`--upstream\`) is the real dependency; the final argument is the proxy **name** you'll reference when adding toxics. Now change your app's database config to point at \`127.0.0.1:5433\` instead of \`db:5432\`. With no toxics, the proxy is transparent — traffic flows normally and your tests pass exactly as before. That "healthy passthrough" baseline is important: it proves the proxy itself isn't the cause of any failure you later inject.

The equivalent over the raw HTTP API is a single POST:

\`\`\`bash
curl -s -X POST http://localhost:8474/proxies \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "postgres",
    "listen": "127.0.0.1:5433",
    "upstream": "db:5432",
    "enabled": true
  }'
\`\`\`

Setting \`enabled: false\` (or running \`toxiproxy-cli toggle postgres\`) drops the listener entirely — the **cleanest way to simulate a dependency being completely down**, since new connections are refused.

## The Toxic Catalog

A toxic is a named fault attached to a proxy, applied to either the \`upstream\` stream (bytes flowing from app to dependency) or the \`downstream\` stream (dependency back to app). Each toxic type takes its own **attributes**. These are the real built-in types and their key attributes:

| Toxic type | What it does | Key attributes |
|---|---|---|
| \`latency\` | Adds delay to each packet | \`latency\` (ms), \`jitter\` (ms) |
| \`bandwidth\` | Caps throughput | \`rate\` (KB/s) |
| \`slow_close\` | Delays the TCP connection close | \`delay\` (ms) |
| \`timeout\` | Stops all data, then closes after a delay (\`0\` = wait forever) | \`timeout\` (ms) |
| \`reset_peer\` | Sends a TCP RST after an optional delay | \`timeout\` (ms) |
| \`slicer\` | Splits data into small chunks with optional delay | \`average_size\`, \`size_variation\`, \`delay\` |
| \`limit_data\` | Closes the connection after N bytes pass | \`bytes\` |

Two attributes apply to *every* toxic. \`stream\` chooses \`upstream\` or \`downstream\` (default \`downstream\`). \`toxicity\` is a probability from \`0.0\` to \`1.0\` that the toxic applies to any given connection — \`toxicity: 0.5\` corrupts roughly half of connections, which is invaluable for testing partial, intermittent failure rather than a clean all-or-nothing break.

## Injecting Latency, Bandwidth, and Timeouts

The most realistic fault for distributed systems is **latency**, because slow is harder to handle than dead. Add 1 second of delay (with 100 ms jitter) to the downstream of the \`postgres\` proxy:

\`\`\`bash
toxiproxy-cli toxic add postgres \\
  -t latency -a latency=1000 -a jitter=100
\`\`\`

\`-t\` is the toxic type and each \`-a key=value\` sets an attribute. Toxiproxy auto-names the toxic (e.g. \`latency_downstream\`); pass \`-n my_latency\` to name it yourself so you can remove it precisely later. Every query your app issues now takes about a second longer — exactly the condition that reveals whether your statement timeouts and connection-pool settings are sane.

**Bandwidth** throttling simulates a congested or saturated link. Cap the downstream to 16 KB/s:

\`\`\`bash
toxiproxy-cli toxic add postgres -t bandwidth -a rate=16
\`\`\`

The **timeout** toxic is the brutal one: it stops all data on the stream and, after \`timeout\` milliseconds, closes the connection — and \`timeout=0\` means *never* close, leaving the socket open but silent forever. That black-hole behaviour is the single best test of whether your client has its own read timeout:

\`\`\`bash
# Stop responding entirely; never close the socket
toxiproxy-cli toxic add postgres -t timeout -a timeout=0
\`\`\`

If your application hangs indefinitely on that, you have a missing timeout — a real production-incident bug, found in a controlled test. Inspect and tear down toxics with:

\`\`\`bash
toxiproxy-cli inspect postgres          # show the proxy + its toxics
toxiproxy-cli toxic remove postgres -n latency_downstream
\`\`\`

The same operations over HTTP — add a toxic by POSTing to a proxy's \`/toxics\` collection:

\`\`\`bash
curl -s -X POST http://localhost:8474/proxies/postgres/toxics \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "db_latency",
    "type": "latency",
    "stream": "downstream",
    "toxicity": 1.0,
    "attributes": { "latency": 1000, "jitter": 100 }
  }'
\`\`\`

The JSON \`type\` and \`attributes\` map one-to-one onto the CLI's \`-t\` and \`-a\` flags, so a fault you prototype on the CLI lifts directly into a library call or a \`curl\` in CI.

## Driving Toxiproxy from a Test Suite

The real payoff is asserting resilience *inside automated tests*. The recommended pattern is to create proxies once at startup, then add and remove toxics around each test using a client library so faults never leak between cases. Here is the Go client (\`github.com/Shopify/toxiproxy/v2/client\`):

\`\`\`go
package resilience

import (
    "testing"
    "time"

    toxiproxy "github.com/Shopify/toxiproxy/v2/client"
)

func TestQueryRespectsTimeoutUnderLatency(t *testing.T) {
    tp := toxiproxy.NewClient("http://localhost:8474")

    proxy, err := tp.CreateProxy("postgres", "127.0.0.1:5433", "db:5432")
    if err != nil {
        t.Fatalf("create proxy: %v", err)
    }
    defer proxy.Delete()

    // Inject 3s of downstream latency (toxicity 1.0 = every connection).
    _, err = proxy.AddToxic("slow_db", "latency", "downstream", 1.0,
        toxiproxy.Attributes{"latency": 3000})
    if err != nil {
        t.Fatal(err)
    }

    start := time.Now()
    err = runQueryThrough("127.0.0.1:5433") // your app code, 2s client timeout
    if err == nil {
        t.Fatal("expected a timeout error under 3s latency")
    }
    if elapsed := time.Since(start); elapsed > 2500*time.Millisecond {
        t.Fatalf("client did not enforce its 2s timeout (took %v)", elapsed)
    }
}
\`\`\`

The test does three things every Toxiproxy test should: it scopes the proxy with \`defer proxy.Delete()\` so state never leaks, it injects a *specific* fault, and it asserts a concrete property — the client gave up at its own timeout rather than waiting for the dependency. The Ruby (\`toxiproxy\` gem), Python (\`toxiproxy-python\`), and Node (\`toxiproxy-node-toxiproxy\`) clients expose the same \`create_proxy\` / \`add_toxic\` shape, so the structure is identical across languages.

For test isolation in larger suites, two API helpers matter. \`POST /reset\` removes **all** toxics from every proxy and re-enables any that were disabled — the perfect global teardown between tests. And \`POST /populate\` creates a whole set of proxies from a JSON array in one idempotent call, ideal for a suite-wide setup hook:

\`\`\`bash
# Re-create the full proxy topology idempotently
curl -s -X POST http://localhost:8474/populate \\
  -H "Content-Type: application/json" \\
  -d '[{"name":"postgres","listen":"127.0.0.1:5433","upstream":"db:5432"},
       {"name":"redis","listen":"127.0.0.1:6380","upstream":"cache:6379"}]'

# Between tests: wipe every toxic, restore enabled proxies
curl -s -X POST http://localhost:8474/reset
\`\`\`

A clean teardown is what makes these tests reliable — a stray \`timeout\` toxic left on a proxy will mysteriously hang the *next* test, so call \`/reset\` (or delete proxies) unconditionally. If you build dependency-level integration tests with ephemeral containers, the same proxy-in-front pattern slots in neatly alongside the approach in the [Testcontainers integration testing guide](/blog/testcontainers-docker-integration-testing).

## Simulating a Dependency Outage

There are two distinct "outage" shapes, and they test different code paths. The first is a **connection refused** — the dependency is gone and the OS rejects the connect immediately. Toggle the proxy off:

\`\`\`bash
toxiproxy-cli toggle postgres     # disables the listener; new connects refused
\`\`\`

A healthy client treats this as a fast, retryable error and trips a circuit breaker. The second, nastier shape is a **hung connection** — the socket opens but no bytes ever return, which a \`timeout=0\` toxic models. Many clients handle connection-refused gracefully but hang forever on the silent socket, so test *both*:

\`\`\`bash
# Outage shape A: refused connections
toxiproxy-cli toggle postgres

# Outage shape B: accepted-but-silent (the dangerous one)
toxiproxy-cli toggle postgres      # re-enable the listener
toxiproxy-cli toxic add postgres -t timeout -a timeout=0
\`\`\`

Verifying that a blackholed dependency produces a *bounded* failure — a tripped breaker and a fallback, not a thread pool full of hanging connections — is the same resilience property chaos engineering targets at the infrastructure level. The [chaos engineering and resilience testing guide](/blog/chaos-engineering-resilience-testing) covers the hypothesis-and-abort-criteria discipline that should wrap around any fault-injection run, whether the fault is a Toxiproxy toxic or a host-level attack.

## Wiring Fault Injection into CI

Treat resilience like any other test stage: stand up Toxiproxy and the dependency, run your suite (which adds/removes toxics per test), and fail the build if a resilience assertion breaks. A GitHub Actions job using the service container looks like this:

\`\`\`yaml
name: resilience-tests
on: [push, pull_request]

jobs:
  fault-injection:
    runs-on: ubuntu-latest
    services:
      toxiproxy:
        image: ghcr.io/shopify/toxiproxy:2.12.0
        ports:
          - 8474:8474
          - 5433:5433
      db:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
    env:
      TOXIPROXY_URL: http://localhost:8474
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.23' }
      - name: Run resilience suite (tests manage their own toxics)
        run: go test ./resilience/... -run Test -count=1 -v
\`\`\`

The tests own the toxics, so the workflow stays generic: it only guarantees Toxiproxy and the dependency are reachable. Because the suite exercises real TCP behaviour — timeouts, retries, breaker thresholds — through the proxy, it catches resilience regressions that a mock-based unit test structurally cannot. To know whether an injected latency actually breached a target, you also need baseline percentiles; see the [p95 and p99 percentiles guide](/blog/performance-test-percentiles-p95-p99-guide) for measuring the steady state your toxics perturb. And because Toxiproxy injects faults at the *connection* level while load testing drives *traffic*, the two pair well — the [k6 vs JMeter comparison](/compare/k6-vs-jmeter) covers picking a load generator to run alongside fault injection.

## A Practical First-Week Plan

You don't need a full chaos program to get value — start with one dependency and one toxic.

1. **Run the server** locally (\`toxiproxy-server\`) and confirm \`toxiproxy-cli list\` works.
2. **Proxy one dependency** — create a proxy in front of your database or cache, repoint the app, confirm tests still pass with zero toxics.
3. **Inject latency** — add a 1-second \`latency\` toxic and watch a slow query surface timeout behaviour.
4. **Inject a timeout** — add \`timeout=0\` and find any client that hangs forever (fix the missing read timeout).
5. **Automate one test** — write a single library-driven test that adds a toxic, asserts a bounded failure, and tears down with \`/reset\`.
6. **Move it to CI** — run that test as a service-container job so resilience is checked on every push.

Each step expands coverage only after the previous one is green. For agent-driven workflows that bundle fault injection, integration, and resilience checks into a coding assistant, browse the [QA skills directory](/skills).

## Frequently Asked Questions

### How is Toxiproxy different from a mock or a stub?

A mock replaces the dependency with canned in-process responses, so it never exercises real TCP behaviour — connection handling, read timeouts, retries, or partial reads. Toxiproxy is a real TCP proxy that forwards to a real (or containerized) dependency and corrupts the *stream*, so your actual networking and pooling code runs under failure. Use mocks for fast unit tests of business logic; use Toxiproxy when the thing you need to test *is* the network resilience.

### What is the difference between the \`timeout\` and \`down\` behaviours?

There is no toxic literally named \`down\` — a fully "down" dependency is simulated by disabling the proxy (\`toxiproxy-cli toggle\` or \`enabled: false\`), which refuses new connections so clients get an immediate connection-refused error. The \`timeout\` toxic is different and more dangerous: it accepts the connection but stops all data, and with \`timeout=0\` it never closes the socket, leaving the client hanging silently forever. Test both, because many clients handle refused connections gracefully but hang on the silent socket.

### Does Toxiproxy work with HTTP, gRPC, or only databases?

It works with any protocol that runs over TCP, because it operates at the byte-stream level and never inspects the payload. That includes PostgreSQL, MySQL, Redis, HTTP/HTTPS, gRPC (HTTP/2 over TCP), Kafka, and AMQP. The one caveat is that toxics like \`latency\` and \`bandwidth\` act on raw TCP bytes, so for a multiplexed protocol like HTTP/2 the delay applies to the connection rather than to an individual logical request.

### How do I make sure toxics don't leak between tests?

Always tear down explicitly: delete the proxy at the end of a test (\`defer proxy.Delete()\` in Go, or the equivalent), or call the \`POST /reset\` endpoint, which strips every toxic from every proxy and re-enables any disabled ones. A stray \`timeout\` or \`latency\` toxic left behind will silently corrupt the next test and produce confusing, order-dependent failures. The safest pattern is a global teardown hook that hits \`/reset\` unconditionally after each test.

### Can I apply a fault to only some connections instead of all of them?

Yes — every toxic accepts a \`toxicity\` value between \`0.0\` and \`1.0\` that is the probability the toxic applies to any given connection. Setting \`toxicity: 0.3\` corrupts roughly 30% of connections and leaves the rest healthy, which models intermittent, partial failure far more realistically than an all-or-nothing fault. This is especially useful for testing retry logic, since a retry should often succeed on a fresh, un-toxified connection.

### Can I run Toxiproxy in production for chaos experiments?

Toxiproxy is designed primarily for development and test environments, and that's where the vast majority of teams run it — in front of dependencies during integration tests and local development. It *can* sit in a production path, but doing so means every request traverses an extra proxy hop and an accidental toxic could cause a real outage, so it demands the same blast-radius discipline as any production chaos work. For production-grade, infrastructure-level fault injection with enforced halt and blast-radius controls, dedicated chaos platforms are a better fit; keep Toxiproxy for the application-and-dependency layer where its per-connection precision shines.
`,
};
