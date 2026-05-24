import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Locust Python Load Testing Complete Guide for 2026',
  description:
    'Master Locust 2.x in 2026 for Python teams. Cover HttpUser, FastHttpUser, distributed runs, thresholds, Web UI, K8s deployment, and CI integration patterns.',
  date: '2026-05-06',
  category: 'Performance',
  content: `
# Locust Python Load Testing Complete Guide for 2026

Locust is the load testing tool of choice for teams that already operate in Python. You write tests as Python classes, the runner spins up green threads (or asyncio tasks since version 2.20), and the web UI shows results live. Locust scales horizontally across a master-worker cluster and ships with Kubernetes-friendly Docker images. For teams running Django, FastAPI, Flask, or pure-Python microservices in 2026, Locust is the lowest friction path from idea to a thousand-VU test running in CI.

This guide covers Locust 2.x end-to-end in 2026. We walk through HttpUser and FastHttpUser, weighted tasks, sequential vs random scheduling, on_start hooks, test events, the web UI and headless mode, distributed master-worker setup, K8s deployment with locust-operator, thresholds and SLO mapping, CI integration patterns, and the gotchas that bite teams in production. For comparison with other tools see [JMeter vs Locust vs Gatling](/blog/jmeter-vs-locust-vs-gatling-comparison) and browse the [skills directory](/skills) for AI agent skills.

## Why Locust

Three reasons. First, Python everywhere. If your team writes Python for backend, fixtures, and data tools, having load tests in the same language eliminates context switching and lets you share modules. Second, headless distributed mode is trivial. \`locust --worker\` connects to \`locust --master\` over ZeroMQ and that is the entire setup. Third, the web UI is genuinely useful: you can drive a test interactively, watch live results, and download CSV without touching a CLI.

The trade-off is throughput per worker. CPython is single-threaded due to the GIL, so even with gevent or asyncio you cap at around 5,000 to 10,000 RPS per worker process. For higher scale you run more workers, which scales linearly but consumes more CPU. Locust trades raw throughput for developer experience; for teams that want both you often pair Locust with FastHttpUser (the geventhttpclient-backed user class) which boosts per-worker throughput by 2-3x.

| Feature | Locust | k6 | JMeter |
|---|---|---|---|
| Language | Python | JavaScript | Java/XML |
| Concurrency | gevent or asyncio | Goroutines | JVM threads |
| Single-worker RPS | 5k-10k | 30k-40k | 5k-8k |
| Web UI | First-class | None (cloud only) | Plugin |
| Distributed | ZMQ master-worker | k6 Cloud or k6-operator | RMI master-slave |
| Headless mode | --headless | Default | -n |
| Plugins | PyPI ecosystem | xk6 | Plugin Manager |

## Installing Locust

In 2026 the recommended path is to install Locust into a project virtualenv. Pin the version in \`requirements.txt\` so CI runs are deterministic.

\`\`\`bash
# Project-scoped install
python -m venv .venv
source .venv/bin/activate
pip install locust==2.32.0

# Verify
locust --version
\`\`\`

Locust supports Python 3.10 or newer in 2026. Older Python versions hit issues with gevent compatibility and asyncio task management.

## Your First Test

A Locust test is a Python file (locustfile) that defines one or more user classes. Each user class subclasses \`HttpUser\` or \`FastHttpUser\`. Inside the class you define methods decorated with \`@task\` for the requests to make. Locust spawns N instances of each user class and runs their tasks in parallel.

\`\`\`python
# locustfile.py
from locust import HttpUser, task, between

class CheckoutUser(HttpUser):
    wait_time = between(1, 5)
    host = "https://api.example.com"

    def on_start(self):
        response = self.client.post("/auth/login", json={
            "email": "user@example.com",
            "password": "demo"
        })
        self.token = response.json()["token"]
        self.client.headers["Authorization"] = f"Bearer {self.token}"

    @task(3)
    def browse_products(self):
        self.client.get("/products?q=laptop")

    @task(1)
    def checkout(self):
        cart = self.client.post("/cart", json={"sku": "ABC-123"})
        self.client.post("/checkout", json={"cartId": cart.json()["id"]})
\`\`\`

Run it interactively:

\`\`\`bash
locust -f locustfile.py
# Open http://localhost:8089
# Set 100 users, spawn rate 10 users/sec, click Start
\`\`\`

In the web UI you set the target user count, spawn rate, and host. Locust spawns users at the requested rate, each running tasks at the requested cadence.

## HttpUser vs FastHttpUser

\`HttpUser\` uses the \`requests\` library under the hood. It is mature and supports all of \`requests\`'s features: connection pooling, redirects, session handling, custom adapters. The trade-off is throughput: \`requests\` is not the fastest Python HTTP library.

\`FastHttpUser\` uses \`geventhttpclient\` which is significantly faster (2-3x more RPS per process). The API is slightly different: it returns response objects with a \`status_code\` attribute rather than \`status\`. For high-RPS tests prefer FastHttpUser.

\`\`\`python
from locust import FastHttpUser, task

class FastCheckoutUser(FastHttpUser):
    @task
    def search(self):
        with self.client.get("/products?q=laptop", catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Got {response.status_code}")
\`\`\`

For tests that exceed 5,000 RPS per worker, FastHttpUser is the right default. For tests below that threshold, HttpUser's familiarity wins.

| Class | Throughput | API Compatibility |
|---|---|---|
| HttpUser | Lower | Fully compatible with requests |
| FastHttpUser | Higher | Subset of requests; check docs |

## Sequential vs Random Task Selection

The default scheduler picks tasks weighted by the integer passed to \`@task\`. A \`@task(3)\` runs three times as often as a \`@task(1)\`. The picks are random, so the distribution converges to the weights over time but is not strict in any short window.

For sequential flows you use \`SequentialTaskSet\`:

\`\`\`python
from locust import HttpUser, SequentialTaskSet, task, between

class CheckoutSequence(SequentialTaskSet):
    @task
    def login(self):
        response = self.client.post("/auth/login", json={"email": "u", "password": "p"})
        self.user.token = response.json()["token"]

    @task
    def browse(self):
        self.client.get("/products", headers={"Authorization": f"Bearer {self.user.token}"})

    @task
    def checkout(self):
        cart = self.client.post("/cart", json={"sku": "X"},
            headers={"Authorization": f"Bearer {self.user.token}"})
        self.client.post("/checkout", json={"cartId": cart.json()["id"]},
            headers={"Authorization": f"Bearer {self.user.token}"})

class CheckoutUser(HttpUser):
    tasks = [CheckoutSequence]
    wait_time = between(1, 3)
    host = "https://api.example.com"
\`\`\`

\`SequentialTaskSet\` runs its tasks in source order, looping. Pair it with \`HttpUser\` for realistic user journeys.

## On Start and On Stop

\`on_start\` runs once per user when it spawns. \`on_stop\` runs once when the test ends. Use these for setup and teardown: login, create test entities, fetch a session token, then later delete what you created.

\`\`\`python
class APIUser(HttpUser):
    def on_start(self):
        response = self.client.post("/auth/login", json=self._creds())
        self.token = response.json()["token"]
        self.client.headers["Authorization"] = f"Bearer {self.token}"

    def on_stop(self):
        # Clean up test artifacts
        self.client.post("/auth/logout")

    def _creds(self):
        return {"email": "test@x.com", "password": "p"}
\`\`\`

## Events and Listeners

Locust emits events at various lifecycle points. You can subscribe to events to push custom metrics, log to external systems, or implement custom assertions.

\`\`\`python
from locust import events
from locust.runners import MasterRunner

@events.request.add_listener
def push_to_datadog(request_type, name, response_time, response_length, exception, **kwargs):
    if exception:
        send_metric("locust.error", 1, tags=[f"endpoint:{name}"])
    send_metric("locust.duration", response_time, tags=[f"endpoint:{name}"])

@events.init.add_listener
def on_init(environment, **kwargs):
    if isinstance(environment.runner, MasterRunner):
        print("Master initialized")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"Test started against {environment.host}")
\`\`\`

The most useful listeners are \`request\` (per-request hook), \`init\` (process startup), \`test_start\`, and \`test_stop\`. Use these to integrate with Datadog, Prometheus, or any custom dashboard system.

## Headless Mode

For CI and automated runs use \`--headless\`. This disables the web UI and runs the test from start to finish based on command-line flags.

\`\`\`bash
locust -f locustfile.py \\
  --headless \\
  --users 1000 \\
  --spawn-rate 100 \\
  --run-time 5m \\
  --host https://staging.example.com \\
  --csv stats \\
  --html report.html
\`\`\`

The \`--csv\` flag writes stats files. The \`--html\` flag writes a single-page report. Both are useful CI artifacts.

For threshold-based pass/fail, parse the CSV or use the \`--exit-code-on-error\` flag combined with custom assertions in a \`test_stop\` listener.

\`\`\`python
@events.test_stop.add_listener
def check_thresholds(environment, **kwargs):
    stats = environment.runner.stats
    p95 = stats.total.get_response_time_percentile(0.95)
    fail_ratio = stats.total.fail_ratio
    if p95 > 800:
        environment.process_exit_code = 1
        print(f"FAIL: p95={p95}ms exceeds threshold 800ms")
    if fail_ratio > 0.01:
        environment.process_exit_code = 1
        print(f"FAIL: error rate {fail_ratio:.2%} exceeds 1%")
\`\`\`

The \`process_exit_code\` becomes the Locust exit code. CI fails on non-zero.

| Threshold Metric | How to Read | Suggested SLO |
|---|---|---|
| p95 latency | get_response_time_percentile(0.95) | Match production SLO |
| p99 latency | get_response_time_percentile(0.99) | 2x production p99 |
| error rate | fail_ratio | < 0.5% |
| total requests | num_requests | Validate enough load happened |
| per-endpoint p95 | stats.get(endpoint).get_response_time_percentile(0.95) | Per-route SLO |

## Distributed Master-Worker

For loads beyond what one machine can produce, run distributed mode. The master coordinates workers and aggregates stats; workers do the actual HTTP work.

\`\`\`bash
# On master
locust -f locustfile.py --master --master-bind-host=0.0.0.0 --master-bind-port=5557

# On each worker
locust -f locustfile.py --worker --master-host=master.internal --master-port=5557
\`\`\`

The master exposes the web UI on port 8089. The number of users you specify in the UI is total across all workers; Locust distributes them evenly.

Workers can join and leave a running test. The master handles re-balancing automatically. This makes it easy to scale up mid-test if you need more capacity, or scale down to reduce cost.

## Kubernetes Deployment

For production scale, run Locust on Kubernetes. The community locust-operator handles master and worker pods, autoscaling, and result persistence.

\`\`\`yaml
apiVersion: locust.io/v1alpha1
kind: LocustTest
metadata:
  name: checkout-soak
spec:
  master:
    image: locustio/locust:2.32.0
    resources:
      requests:
        cpu: 2
        memory: 4Gi
  workers:
    replicas: 10
    image: locustio/locust:2.32.0
    resources:
      requests:
        cpu: 2
        memory: 4Gi
  locustfile:
    configMap: checkout-locustfile
  test:
    users: 5000
    spawnRate: 100
    duration: 60m
    host: https://staging.example.com
\`\`\`

The operator provisions 10 worker pods and one master pod. The master web UI is exposed via a Service. Workers auto-register. Results stream to a sink configured via events listeners.

## Result Storage

Locust does not persist results long-term out of the box. You add storage via event listeners. The common patterns:

\`\`\`python
# InfluxDB sink
from influxdb_client import InfluxDBClient, Point

client = InfluxDBClient(url="http://influx:8086", token=TOKEN, org=ORG)
writer = client.write_api()

@events.request.add_listener
def write_to_influx(request_type, name, response_time, response_length, exception, **kwargs):
    point = Point("locust").tag("name", name).tag("type", request_type) \\
        .field("response_time", response_time) \\
        .field("response_length", response_length or 0) \\
        .field("failure", 1 if exception else 0)
    writer.write(bucket="locust", record=point)
\`\`\`

InfluxDB plus Grafana is the most common Locust observability stack. Prometheus via the \`locust-prometheus-exporter\` PyPI package is another path. Datadog via direct API calls works for SaaS-heavy teams.

## CI Integration

The standard pattern is to run Locust in headless mode against a staging environment on every release candidate.

\`\`\`yaml
name: Load Test

on:
  pull_request:
    branches: [main]

jobs:
  locust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Locust
        run: |
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt

      - name: Run load test
        env:
          BASE_URL: \${{ vars.STAGING_URL }}
          LOAD_TEST_PASSWORD: \${{ secrets.LOAD_TEST_PASSWORD }}
        run: |
          source .venv/bin/activate
          locust -f tests/load/locustfile.py \\
            --headless \\
            --users 500 \\
            --spawn-rate 50 \\
            --run-time 5m \\
            --host \$BASE_URL \\
            --csv stats \\
            --html report.html

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: locust-report
          path: |
            stats*.csv
            report.html
\`\`\`

The \`process_exit_code\` from the \`test_stop\` listener controls pass/fail. Combine with CI threshold scripts for fine-grained assertions.

## Common Gotchas

Five issues bite Locust teams most often:

1. **Single GIL per process.** Even with gevent, Python is single-threaded. For high RPS run multiple worker processes per machine via \`--processes\`. On a 16-core machine, run 16 workers.
2. **Connection pool exhaustion.** \`requests\` defaults to 10 connections per host. Override with a custom adapter for high-RPS tests.
3. **Memory growth in long tests.** Locust stats accumulate. For soak tests beyond an hour, reset stats periodically with \`environment.runner.stats.reset_all()\`.
4. **CSV files lose precision.** The \`--csv\` output rounds response times to milliseconds. For sub-ms precision, use a custom listener writing to a database.
5. **Web UI port conflicts.** The default 8089 may collide with other services. Pin with \`--web-port\`.

## Conclusion

Locust is the right load tool for Python-first teams. The locustfile syntax is approachable, the master-worker mode is trivial to set up, and the Python ecosystem covers most protocol gaps. For raw throughput Gatling or k6 wins, but for developer experience Locust is hard to beat.

If you are starting from scratch, write a locustfile for your most important user journey, run it locally with the web UI, then move to headless mode in CI. Add an InfluxDB plus Grafana dashboard once you have multiple tests. Scale to Kubernetes when you outgrow a single machine.

Browse the [skills directory](/skills) for Locust AI agent skills and read [JMeter vs Locust vs Gatling](/blog/jmeter-vs-locust-vs-gatling-comparison) for tool comparisons.
`,
};
