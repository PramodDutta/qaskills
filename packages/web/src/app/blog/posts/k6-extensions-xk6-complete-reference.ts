import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Extensions xk6 Complete Reference for 2026',
  description:
    'Master xk6 extensions to add custom protocols, output formats, and Go-native logic to k6. Cover build commands, popular extensions, and writing your own extension end to end.',
  date: '2026-05-02',
  category: 'Performance',
  content: `
# k6 Extensions xk6 Complete Reference for 2026

k6 ships with first-class support for HTTP, WebSocket, gRPC, and browser tests, but real production load testing often needs more. You want to consume from Kafka. You want to push metrics to Datadog and Honeycomb in the same run. You want to encrypt payloads with libsodium. You want to read AWS Cognito tokens. None of those ship in the k6 binary by default and none ever will because the maintainers keep the core small. The answer is xk6, k6's official extension framework. With xk6 you compile a custom k6 binary that bundles whatever Go-native extensions your team needs.

This reference covers xk6 end-to-end in 2026. We explain the architecture, walk through the build command, catalogue the most useful extensions for SDETs and SREs, and finish with a complete tutorial for writing your own extension. We also cover packaging custom binaries for CI, what works in Grafana Cloud k6 versus self-hosted, and how to test extensions before shipping them. If you are still picking between performance tools, read [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing) and browse the [skills directory](/skills).

## What xk6 Actually Is

xk6 is a thin wrapper around the Go module system. When you run \`xk6 build\` it generates a small Go program that imports the official k6 binary plus whatever extensions you specified, compiles them together, and produces a single statically linked binary. The result is a drop-in replacement for the official \`k6\` binary that exposes the extensions to your scripts.

There are two extension types. Output extensions register a new output target with k6. The built-in JSON, CSV, and InfluxDB outputs are themselves implemented as extensions. Output extensions usually consume metrics as they stream out and forward them to a third-party system. JavaScript extensions register a new JavaScript module that your test script can import. The built-in \`k6/http\` and \`k6/ws\` modules are also extensions internally. JS extensions expose Go-native logic via a JavaScript API, which gives you native-speed performance for things that would be expensive in pure JS.

| Extension Type | What It Adds | Examples |
|---|---|---|
| Output | Custom metric sinks | Datadog, Honeycomb, NewRelic, Prometheus RW |
| JavaScript | Custom protocols and helpers | Kafka, NATS, ZeroMQ, SQL, Redis |
| JavaScript | Crypto and codecs | libsodium, brotli, MQTT |
| Both | Cloud-specific helpers | AWS, GCP, Azure SDK wrappers |

## Installing xk6

xk6 is a Go binary. Install it from the GitHub releases or via \`go install\`:

\`\`\`bash
# Via go install (recommended; matches your local Go toolchain)
go install go.k6.io/xk6/cmd/xk6@latest

# Verify
xk6 version

# Pre-built Docker image (for CI use)
docker pull grafana/xk6:latest
\`\`\`

You need Go 1.21 or newer in 2026. xk6 itself doesn't require root, but the resulting k6 binary will be in your current directory.

## Building a Custom k6

The simplest build command takes a list of extensions. Here is an example that adds Kafka output, Datadog output, and the SQL JavaScript module:

\`\`\`bash
xk6 build v0.49.0 \\
  --with github.com/grafana/xk6-output-kafka@v0.7.0 \\
  --with github.com/szkiba/xk6-output-datadog@v0.2.1 \\
  --with github.com/grafana/xk6-sql@v0.4.0

# Produces ./k6 in current directory
./k6 version
\`\`\`

The first positional argument is the k6 version. You should pin it to a release. The \`--with\` flag is repeatable and each value is a Go module path with optional version. If you omit the version, the latest tagged release is used.

A common practice is to commit a Dockerfile in the repo that builds the team's custom k6 binary so anyone can reproduce it deterministically:

\`\`\`dockerfile
FROM grafana/xk6:0.10 AS builder
WORKDIR /build
RUN xk6 build v0.49.0 \\
  --with github.com/grafana/xk6-output-kafka@v0.7.0 \\
  --with github.com/szkiba/xk6-output-datadog@v0.2.1 \\
  --with github.com/grafana/xk6-sql@v0.4.0 \\
  --with github.com/grafana/xk6-browser@v1.6.0

FROM debian:bookworm-slim
COPY --from=builder /build/k6 /usr/local/bin/k6
ENTRYPOINT ["k6"]
\`\`\`

Publish this image to your container registry. CI jobs pull it and invoke \`k6 run\` against your scripts. The pattern matches how Jenkins agents standardize toolchains and avoids "works on my machine" complaints.

## Popular Output Extensions

Output extensions push metrics into systems your team already operates. The most useful ones for production teams in 2026:

\`\`\`bash
# Push to Datadog
./k6 run --out 'datadog=http://localhost:8125' script.js

# Push to Prometheus Remote Write
./k6 run --out 'experimental-prometheus-rw' script.js

# Push to Kafka
./k6 run --out 'kafka=brokers=localhost:9092&topic=k6-metrics' script.js

# Push to InfluxDB v2
./k6 run --out 'influxdb=http://localhost:8086/k6' script.js

# Push to a Loki endpoint as logs
./k6 run --out 'loki=http://localhost:3100/loki/api/v1/push' script.js
\`\`\`

The Prometheus Remote Write output ships in core k6 as experimental in 2026 and is the most popular way to feed metrics to Grafana since you can reuse the same data source as your application metrics.

| Output | Use Case | Cost Profile |
|---|---|---|
| InfluxDB | Time-series dashboards | Self-hosted |
| Prometheus RW | Standard Grafana stacks | Self-hosted |
| Datadog | Existing Datadog SaaS | SaaS billing |
| Kafka | Stream into custom analytics | Self-hosted |
| Honeycomb | High-cardinality event data | SaaS billing |
| StatsD | Legacy monitoring | Self-hosted |
| CSV | One-off analysis | Free |

## Popular JavaScript Extensions

JavaScript extensions add new protocols and helpers. The ones that show up in real projects:

\`\`\`javascript
import sql from 'k6/x/sql';
import driver from 'k6/x/sql/driver/postgres';
import kafka from 'k6/x/kafka';
import redis from 'k6/x/redis';
import { SignerV4 } from 'k6/x/aws';

const db = sql.open(driver, __ENV.DB_URL);

export default function () {
  // Native SQL queries during load
  const rows = sql.query(db, 'SELECT id FROM users LIMIT 10');

  // Produce to Kafka
  const writer = new kafka.Writer({
    brokers: ['kafka:9092'],
    topic: 'orders',
  });
  writer.produce({
    messages: [{ key: 'k1', value: JSON.stringify({ id: 1 }) }],
  });
  writer.close();

  // Read from Redis
  const r = new redis.Client({ socket: { host: 'redis', port: 6379 } });
  const value = r.get('cached:key');

  // Sign an AWS request
  const signer = new SignerV4({ region: 'us-east-1', service: 's3' });
  const signed = signer.sign({ method: 'GET', endpoint: 'https://example.s3.amazonaws.com' });
}
\`\`\`

xk6-sql is the most common because most load tests need to seed or verify state in a database. xk6-kafka covers the increasing number of teams whose architecture is event-driven and where producing messages at scale is the actual interesting load. xk6-redis matters when your hot path is cache-dependent and you want to validate cache behavior under load.

## Browser Tests via xk6-browser

xk6-browser used to be an extension and was merged into k6 core in 2023. In 2026 it ships as \`k6/browser\` in the official binary. You no longer need to xk6 build to get browser tests. If you maintain old test scripts that import \`k6/x/browser\` you should update them to \`k6/browser\` and remove the \`xk6-browser\` from your build command. The performance characteristics are the same.

## Writing Your Own Extension

Sometimes no extension exists for what you need. Maybe you have a proprietary binary protocol, or a SOAP service that uses non-standard XML signing, or a queue system like IBM MQ that doesn't have a community extension. Writing one is straightforward if you know basic Go.

Start with the official extension template repo. It generates a Go project with the right module structure and a CI workflow.

\`\`\`bash
# Clone the template
git clone https://github.com/grafana/xk6-example my-extension
cd my-extension
go mod init github.com/myorg/xk6-custom-protocol
\`\`\`

A minimal JS extension exposes a Go struct with methods callable from JS:

\`\`\`go
package customprotocol

import (
    "context"
    "encoding/json"
    "go.k6.io/k6/js/modules"
)

func init() {
    modules.Register("k6/x/custom", new(RootModule))
}

type (
    RootModule  struct{}
    ModuleInstance struct{ vu modules.VU }
)

func (*RootModule) NewModuleInstance(vu modules.VU) modules.Instance {
    return &ModuleInstance{vu: vu}
}

func (mi *ModuleInstance) Exports() modules.Exports {
    return modules.Exports{
        Named: map[string]interface{}{
            "encode": mi.Encode,
            "decode": mi.Decode,
        },
    }
}

type Message struct {
    Type string \`json:"type"\`
    Body []byte \`json:"body"\`
}

func (mi *ModuleInstance) Encode(msg Message) ([]byte, error) {
    return json.Marshal(msg)
}

func (mi *ModuleInstance) Decode(payload []byte) (*Message, error) {
    msg := &Message{}
    err := json.Unmarshal(payload, msg)
    return msg, err
}
\`\`\`

Build and use:

\`\`\`bash
xk6 build v0.49.0 --with github.com/myorg/xk6-custom-protocol=.
\`\`\`

The trailing \`=.\` says use the local directory instead of fetching from GitHub. This is how you develop iteratively. The resulting \`./k6\` binary supports your script's \`import custom from 'k6/x/custom'\`.

| Step | What You Do | Where It Lives |
|---|---|---|
| 1. Module registration | Call \`modules.Register\` in init | extension/module.go |
| 2. Define exports | List functions or structs in Exports() | extension/module.go |
| 3. Implement methods | Receive args, return values | extension/module.go |
| 4. Build with xk6 | Local path or git path | local dev |
| 5. Push tags | Tag a semver release | GitHub |
| 6. Publish image | Build container with binary | CR |

## Output Extension Pattern

An output extension differs from a JS extension. It implements the \`output.Output\` interface, which has lifecycle hooks for start, stop, and consuming metric samples. Here is a sketched implementation that sends metrics to a custom HTTP endpoint:

\`\`\`go
package customoutput

import (
    "bytes"
    "encoding/json"
    "net/http"
    "go.k6.io/k6/metrics"
    "go.k6.io/k6/output"
)

func init() {
    output.RegisterExtension("custom-http", New)
}

type Output struct {
    out output.Params
    url string
}

func New(params output.Params) (output.Output, error) {
    return &Output{out: params, url: params.ConfigArgument}, nil
}

func (o *Output) Description() string { return "custom-http" }
func (o *Output) Start() error        { return nil }
func (o *Output) Stop() error         { return nil }

func (o *Output) AddMetricSamples(samples []metrics.SampleContainer) {
    body, _ := json.Marshal(samples)
    http.Post(o.url, "application/json", bytes.NewReader(body))
}
\`\`\`

In production you batch and buffer, handle retries, and add backpressure. The interface is intentionally minimal so you can build whatever shipping logic you need. Output extensions are the right answer when you want test metrics in a system that has no community integration yet.

## Cloud vs Self-Hosted Compatibility

Grafana Cloud k6 in 2026 supports a curated list of extensions. The list includes most outputs (Prometheus RW, Datadog, etc.) and many JS extensions (xk6-sql, xk6-kafka, xk6-redis) but excludes anything not yet validated. If you need an arbitrary extension your only option is self-hosted. For most production teams the curated list covers their needs; the exception is teams with proprietary protocols who tend to self-host anyway.

When you build a custom binary for use in Grafana Cloud k6, you upload it through a custom binary feature reserved for higher-tier plans. The platform then runs your binary on its load generators. This unlocks any extension you want at the cost of platform support: any extension-specific bug is your team's to debug.

## CI Integration

The typical CI pattern bundles xk6 build into the pipeline so every PR can change extensions and the next test run picks them up automatically:

\`\`\`yaml
name: Load Tests with Custom Extensions

on:
  pull_request:
    branches: [main]

jobs:
  build-and-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build k6 with extensions
        uses: grafana/setup-k6-action@v1
        with:
          k6-version: v0.49.0
          xk6-extensions: |
            github.com/grafana/xk6-output-prometheus-remote@v0.4.0
            github.com/grafana/xk6-sql@v0.4.0
            github.com/grafana/xk6-kafka@v0.21.0

      - name: Run load test
        env:
          K6_PROMETHEUS_RW_SERVER_URL: \${{ secrets.PROM_URL }}
          DB_URL: \${{ secrets.DB_URL }}
          KAFKA_BROKERS: \${{ secrets.KAFKA }}
        run: |
          k6 run \\
            --out experimental-prometheus-rw \\
            --tag commit=\${{ github.sha }} \\
            tests/load/checkout.js
\`\`\`

For larger orgs, prefer to build the custom binary once nightly into a container image and reference that image in all CI jobs. This trades a small amount of staleness for a large CI speedup (no xk6 build per job).

## Testing Extensions

Extensions are Go code. Test them with \`go test\`. The xk6 example template ships with a test harness that boots an in-process k6 runtime and runs a JS snippet against your extension:

\`\`\`go
package customprotocol

import (
    "testing"
    "go.k6.io/k6/js/modulestest"
)

func TestEncode(t *testing.T) {
    ts := modulestest.NewRuntime(t)
    m := &ModuleInstance{vu: ts.VU}
    out, err := m.Encode(Message{Type: "hello", Body: []byte("world")})
    if err != nil {
        t.Fatal(err)
    }
    if string(out) == "" {
        t.Fatal("expected non-empty output")
    }
}
\`\`\`

For output extensions you typically spin up a mock HTTP server in the test, run the output, and assert that the right payloads arrived.

## Versioning and Dependency Hell

Each xk6 extension declares a Go module dependency on k6 itself. When the k6 core changes its internal API, the extension must be updated. In practice this means: pin your k6 version, pin every extension to a version known to work with that k6 version, and when you bump k6, regression-test every extension. The community publishes a compatibility matrix at the xk6 GitHub repo. Read it before bumping.

A version mismatch fails at xk6 build time with a Go compile error. It's loud, not silent. But the error message often points at internal symbol mismatches that take time to interpret. The fastest fix is usually to downgrade either the extension or k6 to a known-good pair, then file an issue against the extension maintainer.

## Conclusion

xk6 is what makes k6 the right tool for teams who need more than HTTP. You write a tiny Go module, build a custom binary, and your test scripts get native-speed access to whatever protocol or system you need. For most teams the curated list of extensions covers their needs out of the box, but the option to write your own is the safety net that keeps k6 viable as your architecture evolves.

Next steps: look at the [skills directory](/skills) for ready-to-use k6 and xk6 skills tuned for Claude and Cursor, and read [k6 Cloud guide](/blog/k6-cloud-grafana-cloud-complete-guide) for distributed runs once your extension setup is solid. Pick one missing protocol in your stack, write a 50-line extension, and put it through CI within the week.
`,
};
