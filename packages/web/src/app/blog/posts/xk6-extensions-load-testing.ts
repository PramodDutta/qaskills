import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'xk6 Extensions: Extend k6 for gRPC, Kafka and SQL Load Tests',
  description:
    'Use xk6 to build a custom k6 binary with Go extensions for SQL, Kafka and Prometheus, write extension-backed load tests, and package them in CI.',
  date: '2026-07-05',
  category: 'Guide',
  content: `
# xk6 Extensions: Extend k6 for gRPC, Kafka and SQL Load Tests

k6 is one of the most popular open-source load testing tools in the QA and SRE world, and for good reason. You write test scripts in plain JavaScript, but the engine that actually drives traffic is written in Go. That split gives you the best of both worlds: an ergonomic scripting layer that any tester can read, backed by a highly concurrent runtime that can push tens of thousands of virtual users (VUs) from a single machine. In practical terms, k6 can sustain roughly 30,000 to 50,000 VUs on about 500 MB of RAM, which is an order of magnitude leaner than thread-per-user tools like JMeter.

The catch is that the core k6 binary only speaks a handful of protocols out of the box: HTTP/1.1, HTTP/2, WebSocket, gRPC, and a few utility modules. The moment your system under test involves a message queue, a relational database, a cache, or a custom binary protocol, core k6 has no idea how to talk to it. That is exactly the gap that xk6 fills. xk6 is a command-line builder that compiles a bespoke k6 binary with additional Go modules baked in, exposing new JavaScript APIs to your test scripts.

This guide walks through everything you need to run protocol-rich load tests with xk6: what the tool is, how to install it, how to build a custom binary, which extensions matter, how to write tests that use them, how to package the result for CI, and how to author your own extension when nothing off-the-shelf fits. If you are new to load testing in general, start with our [load testing beginners guide](/blog/load-testing-beginners-guide) and the [k6 vs JMeter comparison](/blog/k6-vs-jmeter-performance-testing) before diving into extensions.

## What k6 Is and Where It Stops

k6 is a Go-based load generator with a JavaScript scripting front end powered by an embedded ES2015+ runtime (goja). You describe your scenario in a default-exported function, k6 clones that function across many goroutines, and each goroutine becomes a virtual user. Because the concurrency lives in Go and not in the JavaScript engine, memory per VU stays tiny.

A minimal k6 script looks like this:

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://test.k6.io');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
  });
  sleep(1);
}
\`\`\`

Run it with \`k6 run script.js\` and you get percentile latencies, throughput, and pass/fail thresholds. This is enough for classic web load testing. But \`k6/http\` cannot open a Postgres connection, cannot produce a Kafka message, and cannot read from Redis. The core team deliberately keeps the base binary small and pushes everything protocol-specific into extensions. That design decision is what makes xk6 necessary.

## Why xk6 Exists

xk6 is a build tool, not a runtime. It uses Go modules to compile a new k6 executable that statically links extra Go packages. Each of those packages registers either a new JavaScript module (a JS extension, the kind you \`import\` in a script) or a new output (an output extension that ships metrics somewhere). Because the extension is compiled into the binary, there is no plugin loading at runtime and no performance penalty beyond the extension code itself.

The two extension flavors are:

| Extension type | Registered via | What it does | Example |
|---|---|---|---|
| JS module | \`modules.Register\` | Adds an importable API to scripts | xk6-sql, xk6-kafka, xk6-redis |
| Output | \`output.RegisterExtension\` | Streams metrics to a backend | xk6-output-prometheus-remote |

You reach for xk6 whenever the protocol or sink you need is not in core. The result is a single self-contained binary you can commit to an artifact registry, drop into a Docker image, and run identically on a laptop or in CI.

## Installing xk6

xk6 ships as a Go program, so you need a Go toolchain (1.21 or newer is a safe baseline) and Git installed. Install the builder with:

\`\`\`bash
go install go.k6.io/xk6/cmd/xk6@latest
\`\`\`

This drops an \`xk6\` binary into \`$(go env GOPATH)/bin\`. Make sure that directory is on your \`PATH\`:

\`\`\`bash
export PATH="$PATH:$(go env GOPATH)/bin"
xk6 version
\`\`\`

If you would rather not install Go at all, Grafana ships an official builder image. You can run the whole build inside Docker:

\`\`\`bash
docker run --rm -v "$PWD:/output" grafana/xk6 build \\
  --with github.com/grafana/xk6-sql@latest \\
  --output /output/k6
\`\`\`

The Docker route is handy for CI because it pins the builder version and needs no local Go setup.

## Building a Custom k6 Binary

The core command is \`xk6 build\`. You pass the k6 version you want as the base and a list of \`--with\` flags naming each extension module. Here is a build that bundles SQL support plus the Postgres driver:

\`\`\`bash
xk6 build v0.52.0 \\
  --with github.com/grafana/xk6-sql@latest \\
  --with github.com/grafana/xk6-sql-driver-postgres@latest \\
  --output ./k6
\`\`\`

A few things worth knowing:

- The first positional argument (\`v0.52.0\`) is the k6 core version. Pin it so builds are reproducible.
- Each \`--with\` names a Go module path and an optional version after \`@\`. Without a version it defaults to \`latest\`.
- You can point \`--with\` at a local checkout with \`--with github.com/you/ext=../ext\` to test an extension you are developing.
- The \`--output\` flag controls the resulting binary name.

Verify the extensions are compiled in:

\`\`\`bash
./k6 version
# k6 v0.52.0 ... (with github.com/grafana/xk6-sql v0.4.0, ...)
\`\`\`

The version line lists every bundled extension, which is your proof the build worked. From here on, run tests with your custom \`./k6\` binary rather than the system-installed \`k6\`.

## Popular xk6 Extensions Worth Knowing

The ecosystem is large. These are the extensions QA and performance teams reach for most often:

| Extension | Import / role | Use case |
|---|---|---|
| xk6-sql | \`import sql from 'k6/x/sql'\` | Load test and seed Postgres, MySQL, SQLite, ClickHouse |
| xk6-kafka | \`import { Writer } from 'k6/x/kafka'\` | Produce and consume Kafka messages under load |
| xk6-redis | \`import redis from 'k6/x/redis'\` | Exercise Redis caches and rate limiters |
| xk6-disruptor | \`import { ... } from 'k6/x/disruptor'\` | Inject latency and faults for reliability testing |
| xk6-output-prometheus-remote | output backend | Stream live metrics to Prometheus / Grafana |
| xk6-mllib | \`import ... from 'k6/x/mllib'\` | Statistical analysis of results inside the test |

Two important updates worth flagging. First, gRPC used to require a separate extension but is now part of k6 core under \`k6/net/grpc\`, so you no longer build a custom binary just to hit gRPC services. Second, browser automation, once the \`xk6-browser\` extension, is also built into core k6 as \`k6/browser\`. Both are examples of extensions graduating into the base tool, which is the intended lifecycle. The fault injection story pairs naturally with our [chaos engineering guide](/blog/chaos-engineering-resilience-testing) if you want to combine load and resilience testing.

## Writing a Test That Uses the SQL Extension

Once you have a binary built with xk6-sql and a Postgres driver, you can open a connection, run a query, and assert on the results, all inside a normal k6 scenario. This example seeds a table in \`setup\`, hammers a read query with 20 VUs, and validates row shape:

\`\`\`javascript
import sql from 'k6/x/sql';
import driver from 'k6/x/sql/driver/postgres';
import { check } from 'k6';

const db = sql.open(driver, 'postgres://user:pass@localhost:5432/appdb?sslmode=disable');

export const options = {
  vus: 20,
  duration: '1m',
  thresholds: {
    checks: ['rate>0.99'],
    iteration_duration: ['p(95)<200'],
  },
};

export function setup() {
  db.exec(\`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      status TEXT NOT NULL
    );
  \`);
  db.exec("INSERT INTO orders (status) VALUES ('open'), ('shipped') ON CONFLICT DO NOTHING;");
}

export default function () {
  const rows = db.query('SELECT id, status FROM orders WHERE status = $1;', 'open');
  check(rows, {
    'at least one open order': (r) => r.length > 0,
    'status matches filter': (r) => r.every((row) => row.status === 'open'),
  });
}

export function teardown() {
  db.close();
}
\`\`\`

Run it with your custom binary:

\`\`\`bash
./k6 run sql-test.js
\`\`\`

The \`setup\` and \`teardown\` functions run once per test, not per VU, which is exactly where you want connection setup and cleanup. Each of the 20 VUs shares the pooled connection opened at module scope. For deeper database testing patterns beyond load, see our [database testing automation guide](/blog/database-testing-automation-guide).

## Load Testing Kafka with xk6-kafka

Message queues are a classic blind spot for HTTP-only load tools. With xk6-kafka you can produce a controlled stream of messages and measure broker throughput and consumer lag under pressure. Build the binary first:

\`\`\`bash
xk6 build v0.52.0 --with github.com/mostafa/xk6-kafka@latest --output ./k6
\`\`\`

Then a producer test that writes JSON messages to a topic:

\`\`\`javascript
import { Writer, SchemaRegistry, SCHEMA_TYPE_STRING } from 'k6/x/kafka';
import { check } from 'k6';

const writer = new Writer({
  brokers: ['localhost:9092'],
  topic: 'orders',
});

const registry = new SchemaRegistry();

export const options = {
  scenarios: {
    produce: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
    },
  },
};

export default function () {
  const messages = [
    {
      key: registry.serialize({ data: \`k-\${__VU}-\${__ITER}\`, schemaType: SCHEMA_TYPE_STRING }),
      value: registry.serialize({
        data: JSON.stringify({ vu: __VU, iter: __ITER, ts: Date.now() }),
        schemaType: SCHEMA_TYPE_STRING,
      }),
    },
  ];
  const err = writer.produce({ messages });
  check(err, { 'message produced': (e) => e === undefined || e === null });
}

export function teardown() {
  writer.close();
}
\`\`\`

The \`constant-arrival-rate\` executor is the right choice for throughput testing because it pins a target rate (1000 messages per second here) regardless of how fast individual iterations complete, which is how you find the point where the broker starts falling behind. The \`__VU\` and \`__ITER\` built-ins let each message carry a unique key so you can trace it downstream.

## Streaming Metrics to Prometheus in CI

By default k6 prints a summary at the end of a run. For continuous performance testing you want the time series in Prometheus so Grafana dashboards and alerts can watch trends across builds. The \`xk6-output-prometheus-remote\` extension pushes metrics over the Prometheus remote-write protocol. Build it in:

\`\`\`bash
xk6 build v0.52.0 \\
  --with github.com/grafana/xk6-output-prometheus-remote@latest \\
  --output ./k6
\`\`\`

Then run with the output flag pointed at your remote-write endpoint:

\`\`\`bash
K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9090/api/v1/write \\
  ./k6 run --out experimental-prometheus-rw script.js
\`\`\`

Every k6 metric (\`http_req_duration\`, \`vus\`, \`iterations\`, custom metrics) lands in Prometheus with labels for the test name and scenario, so you can compare a p95 latency trend release over release. This is the backbone of a performance regression gate in a pipeline. If you are wiring this into GitHub Actions, our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers the surrounding job structure.

## Packaging the Custom Binary in Docker for CI

The trap with xk6 is that your test scripts now depend on a specific custom binary, not the stock \`k6\` image. If a teammate or a CI runner uses plain \`k6\`, the extension imports fail. The clean fix is a multi-stage Dockerfile that builds the binary and ships only the runtime layer:

\`\`\`dockerfile
# Stage 1: build the custom k6 binary
FROM golang:1.22-bookworm AS builder
RUN go install go.k6.io/xk6/cmd/xk6@latest
RUN xk6 build v0.52.0 \\
    --with github.com/grafana/xk6-sql@latest \\
    --with github.com/grafana/xk6-sql-driver-postgres@latest \\
    --with github.com/mostafa/xk6-kafka@latest \\
    --output /k6

# Stage 2: minimal runtime
FROM debian:bookworm-slim
COPY --from=builder /k6 /usr/bin/k6
COPY ./tests /tests
ENTRYPOINT ["k6"]
CMD ["run", "/tests/sql-test.js"]
\`\`\`

Build and run it:

\`\`\`bash
docker build -t myorg/k6-custom:0.52.0 .
docker run --rm --network host myorg/k6-custom:0.52.0
\`\`\`

Tag the image with the k6 version plus your extension set and push it to your registry. Now every CI run pulls the same binary, extension versions are frozen, and there is zero chance of a "works on my machine" extension mismatch. Pinning every \`@\` version rather than \`@latest\` in the Dockerfile is the difference between reproducible and flaky builds.

## Writing Your Own xk6 Extension

When no extension covers your protocol, you write one. An xk6 JS extension is a Go package that implements the \`modules.Module\` interface and registers itself. Here is a minimal skeleton that exposes a \`compare\` function to scripts:

\`\`\`go
package mycompare

import (
	"go.k6.io/k6/js/modules"
)

// init registers the module under the import path k6/x/mycompare.
func init() {
	modules.Register("k6/x/mycompare", new(RootModule))
}

type RootModule struct{}

type ModuleInstance struct {
	vu modules.VU
}

// NewModuleInstance is called once per VU.
func (*RootModule) NewModuleInstance(vu modules.VU) modules.Instance {
	return &ModuleInstance{vu: vu}
}

// Exports declares what the JS side can import.
func (mi *ModuleInstance) Exports() modules.Exports {
	return modules.Exports{
		Named: map[string]interface{}{
			"compare": mi.Compare,
		},
	}
}

// Compare is the function JS scripts call.
func (mi *ModuleInstance) Compare(a, b string) bool {
	return a == b
}
\`\`\`

Build it against local source and use it from a script:

\`\`\`bash
xk6 build v0.52.0 --with github.com/you/xk6-mycompare=. --output ./k6
\`\`\`

\`\`\`javascript
import { compare } from 'k6/x/mycompare';
import { check } from 'k6';

export default function () {
  check(null, { 'strings equal': () => compare('ping', 'ping') === true });
}
\`\`\`

The pattern scales: replace \`Compare\` with a method that opens a socket, speaks your binary protocol, and returns latency, and you have a load-testing extension for a protocol nobody else supports. Output extensions follow the same idea but implement \`output.Output\` and register with \`output.RegisterExtension\`.

## Thresholds, Checks, and Result Assertions

Extensions give you the ability to talk to new systems, but thresholds and checks are what turn a load test into a pass/fail quality gate. A \`check\` records a boolean per iteration and never fails the run; a \`threshold\` aborts or fails the run when a metric crosses a line. Combine them:

\`\`\`javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    // abort the whole run early if latency is catastrophic
    'http_req_duration{scenario:default}': [{ threshold: 'p(95)<1000', abortOnFail: true }],
  },
};
\`\`\`

In CI, k6 exits with a non-zero code when any threshold fails, which is exactly what your pipeline needs to block a merge. Wire that exit code into your job and a performance regression stops a bad release the same way a failing unit test does.

## Frequently Asked Questions

### What is xk6 and how is it different from k6?

k6 is the load testing tool you run; xk6 is the builder that compiles a custom version of it. xk6 statically links extra Go modules (extensions) into a new k6 binary so your JavaScript tests can import protocols like SQL, Kafka, or Redis that core k6 does not support. You only need xk6 at build time, not when running tests.

### How do I install xk6?

Install a Go toolchain (1.21+), then run \`go install go.k6.io/xk6/cmd/xk6@latest\` and add \`$(go env GOPATH)/bin\` to your PATH. Alternatively, skip installing Go entirely and use the official \`grafana/xk6\` Docker image, which is the preferred approach for CI because it pins the builder version and needs no local setup.

### Do I still need an extension for gRPC in k6?

No. gRPC support moved into k6 core and is available as the \`k6/net/grpc\` module, so you can load test gRPC services with the stock k6 binary. The same graduation happened to browser testing, which is now \`k6/browser\` in core rather than the old xk6-browser extension. Always check whether a protocol is already in core before building a custom binary.

### How do I build a k6 binary with multiple extensions?

Pass one \`--with\` flag per extension to a single \`xk6 build\` command, for example \`xk6 build v0.52.0 --with github.com/grafana/xk6-sql@latest --with github.com/mostafa/xk6-kafka@latest --output ./k6\`. Pin each extension version after the \`@\` symbol so the build is reproducible, then confirm they compiled in with \`./k6 version\`.

### Can I use extension imports with the stock k6 Docker image?

No. Extension imports like \`k6/x/sql\` only exist in a binary you built with xk6. If a runner uses the stock image, the import fails at parse time. Package your custom binary in your own Docker image with a multi-stage build, tag it with the k6 and extension versions, and use that image everywhere so every run has the same extensions available.

### How many virtual users can k6 handle?

A single k6 instance comfortably drives 30,000 to 50,000 VUs on roughly 500 MB of RAM because concurrency lives in Go goroutines rather than OS threads. Extensions add their own memory cost depending on connections and buffers, so a Kafka or SQL test uses more per VU than a pure HTTP test. For traffic beyond a single machine, k6 supports distributed execution via k6 Operator on Kubernetes.

### How do I write my own xk6 extension?

Create a Go package that implements the \`modules.Module\` interface, register it in \`init()\` with \`modules.Register("k6/x/yourname", ...)\`, and expose functions through the \`Exports\` method. Build it with \`xk6 build --with github.com/you/xk6-yourname=.\` pointing at your local source, then import \`k6/x/yourname\` from a test script. Output extensions follow the same pattern using the \`output.Output\` interface.

## Conclusion

xk6 turns k6 from an HTTP load tester into a protocol-agnostic performance testing platform. The workflow is consistent no matter which extension you need: install the builder, run \`xk6 build\` with your \`--with\` flags, verify the extension list, and package the resulting binary in Docker so every CI run is reproducible. Whether you are load testing a Postgres-backed API, measuring Kafka throughput, injecting faults with xk6-disruptor, or streaming metrics to Prometheus for a regression gate, the extension system keeps your JavaScript tests clean while the Go runtime does the heavy lifting. And when nothing off-the-shelf fits, a small Go module gives you a first-class API in your scripts.

Ready to level up your performance testing practice? Browse the load testing, k6, and performance skills on [QASkills.sh](/skills) to install ready-made SKILL.md files that teach your AI coding agent how to write, build, and run xk6-powered tests correctly the first time.
`,
};
