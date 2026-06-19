import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Locust Load Testing with Python: The Complete 2026 Guide',
  description:
    'Master Locust load testing in Python: write locustfiles, run distributed master-worker swarms, custom load shapes, percentiles, CSV export, and CI integration.',
  date: '2026-06-19',
  category: 'Guide',
  content: `
# Locust Load Testing with Python: The Complete 2026 Guide

Locust is the most Pythonic way to put serious load on an API or website. Instead of clicking through a clunky GUI or wrestling with XML, you describe user behavior as plain Python code, and Locust spawns thousands of simulated users that hammer your system while reporting live response-time percentiles. If you already write tests in Python, the learning curve is almost flat: an \`HttpUser\` class, a handful of \`@task\` methods, and you are generating realistic traffic in minutes.

This guide walks through everything you need to run Locust load testing in production-grade environments in 2026. We cover installation, writing a complete locustfile with authentication and weighted tasks, the difference between the web UI and headless runs, scaling out with distributed master-worker mode, shaping load over time with \`LoadTestShape\`, reading percentile metrics, exporting CSV for trend analysis, and wiring Locust into CI so a regression fails the build. We finish with an honest comparison against k6 and JMeter so you can decide whether Locust is the right tool for your stack. Every code block is runnable, every CLI flag is real, and the patterns shown here are the ones teams actually ship. If you maintain Python services, Locust deserves a slot in your performance toolbox alongside the other [QA skills](/skills) your team relies on.

## Why Choose Locust for Load Testing

Locust's headline feature is that test scenarios are real Python. You get loops, conditionals, helper functions, imports, dataclasses, and the entire PyPI ecosystem. Need to sign a JWT, pull credentials from a vault, or generate fake data with Faker? It is just an import away. Compare that to tools where dynamic logic means learning a bespoke scripting dialect.

The second advantage is the event-driven concurrency model. Locust uses gevent green threads, so a single modest worker process can simulate thousands of concurrent users without one OS thread per user. That makes it cheap to scale: add more worker processes or more machines and the swarm grows linearly.

Third, Locust ships a clean real-time web UI that shows requests per second, failure rate, and response-time percentiles as the test runs. You can ramp users up and down live, watch the system bend, and stop the moment something breaks. For teams that prefer automation, every UI action has a headless equivalent.

## Installing Locust

Locust runs on Python 3.9+ and installs from PyPI. Use a virtual environment to keep dependencies isolated.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install locust
locust --version
\`\`\`

Pin the version in a requirements file so CI and local runs match exactly:

\`\`\`bash
# requirements-load.txt
locust==2.31.8
faker==30.1.0
\`\`\`

\`\`\`bash
pip install -r requirements-load.txt
\`\`\`

Verify the install by running \`locust --help\`. If the binary is found and prints flags, you are ready to write your first locustfile.

## Writing Your First Locustfile

A locustfile is a normal Python module. You subclass \`HttpUser\`, declare \`wait_time\` to model think-time between actions, and decorate methods with \`@task\` to register them as behavior the simulated user performs. Save the following as \`locustfile.py\`.

\`\`\`python
from locust import HttpUser, task, between

class QuickstartUser(HttpUser):
    wait_time = between(1, 3)  # seconds of think-time between tasks

    @task
    def view_homepage(self):
        self.client.get("/")

    @task
    def view_products(self):
        self.client.get("/api/products")

    @task
    def view_product_detail(self):
        self.client.get("/api/products/42")
\`\`\`

The \`self.client\` object is a wrapped \`requests\` session that records timing and success for every call. Run it with:

\`\`\`bash
locust -f locustfile.py --host https://staging.example.com
\`\`\`

Then open http://localhost:8089, enter the number of users and spawn rate, and click Start. Locust begins simulating users immediately and streams metrics into the dashboard.

## Tasks, Weights, and Wait Time

Real users do not hit every endpoint equally. Most browse; a few buy. Weights let you bias the distribution. Pass an integer to \`@task(n)\` and that task is picked n times as often as a task with weight 1.

\`\`\`python
from locust import HttpUser, task, between

class ShopUser(HttpUser):
    wait_time = between(2, 5)

    @task(10)            # 10x more common: browsing
    def browse(self):
        self.client.get("/api/products")

    @task(3)             # less common: search
    def search(self):
        self.client.get("/api/search?q=laptop")

    @task(1)             # rare: checkout
    def checkout(self):
        self.client.post("/api/cart/checkout", json={"item_id": 42, "qty": 1})
\`\`\`

For wait time you have three built-ins: \`between(min, max)\` for a random uniform delay, \`constant(seconds)\` for a fixed pause, and \`constant_throughput(rate)\` to target a steady tasks-per-second per user regardless of response time. Use \`constant_throughput\` when you need a predictable request rate rather than a fixed user count.

## Authentication with on_start

Most APIs require a token. The \`on_start\` hook runs once per simulated user when it spawns, which is the perfect place to log in and stash a token on the user instance so every subsequent task is authenticated.

\`\`\`python
from locust import HttpUser, task, between

class AuthedUser(HttpUser):
    wait_time = between(1, 2)

    def on_start(self):
        resp = self.client.post("/api/login", json={
            "email": "loadtest@example.com",
            "password": "supersecret",
        })
        token = resp.json()["access_token"]
        self.client.headers.update({"Authorization": f"Bearer {token}"})

    @task
    def get_profile(self):
        self.client.get("/api/me")

    @task
    def list_orders(self):
        self.client.get("/api/orders")
\`\`\`

Because the token is set on \`self.client.headers\`, it persists for the lifetime of that virtual user. There is also an \`on_stop\` hook for cleanup such as logging out. If different users need different credentials, read them from a CSV or queue inside \`on_start\`.

## Validating Responses and Marking Failures

By default Locust marks any 2xx/3xx as success and 4xx/5xx as failure. But a 200 with a wrong body is still a bug. Use \`catch_response=True\` to inspect the payload and call \`response.success()\` or \`response.failure()\` yourself.

\`\`\`python
from locust import HttpUser, task, between

class ValidatingUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def get_products(self):
        with self.client.get("/api/products", catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Unexpected status {response.status_code}")
            elif len(response.json().get("items", [])) == 0:
                response.failure("Product list was empty")
            else:
                response.success()
\`\`\`

Group dynamic URLs under a stable name so the stats table does not explode into thousands of unique rows. Pass \`name=\` to fold parameterized paths together:

\`\`\`python
self.client.get(f"/api/products/{product_id}", name="/api/products/[id]")
\`\`\`

## Running Headless for CI and Automation

The web UI is great for exploration, but pipelines need a non-interactive run. The \`--headless\` flag starts the swarm immediately using flags instead of the browser form.

\`\`\`bash
locust -f locustfile.py \\
  --host https://staging.example.com \\
  --headless \\
  -u 1000 \\
  -r 100 \\
  -t 5m \\
  --csv results
\`\`\`

That command spawns 1000 users (\`-u\`) ramping at 100 per second (\`-r\`) for 5 minutes (\`-t\`), then exits and writes \`results_stats.csv\` and friends. The table below lists the flags you will reach for most often.

| Flag | Long form | Meaning |
|------|-----------|---------|
| \`-f\` | \`--locustfile\` | Path to the locustfile to run |
| \`-H\` | \`--host\` | Base URL the simulated users target |
| \`-u\` | \`--users\` | Peak number of concurrent users |
| \`-r\` | \`--spawn-rate\` | Users started per second during ramp-up |
| \`-t\` | \`--run-time\` | Total test duration, e.g. \`30s\`, \`5m\`, \`1h\` |
| | \`--headless\` | Run without the web UI, start immediately |
| | \`--csv\` | Prefix for CSV stats output files |
| | \`--html\` | Write a self-contained HTML report |
| | \`--only-summary\` | Suppress periodic logs, print final stats only |
| | \`--stop-timeout\` | Seconds to let in-flight tasks finish on shutdown |
| | \`--tags\` | Run only tasks with matching \`@tag\` |

## Distributed Master-Worker Mode

One Python process is limited by a single CPU core because of gevent's cooperative scheduling. To push past roughly a few thousand users you run Locust distributed: one master coordinates and aggregates stats while many workers generate the actual load. Start the master first:

\`\`\`bash
locust -f locustfile.py --master --host https://staging.example.com
\`\`\`

Then start workers, pointing them at the master's host. Run one worker per CPU core, on the same box or across a fleet.

\`\`\`bash
# on each load-generating machine
locust -f locustfile.py --worker --master-host 10.0.0.5
\`\`\`

For a fully headless distributed run that exits on its own, tell the master how many workers to wait for:

\`\`\`bash
locust -f locustfile.py --master --headless \\
  -u 50000 -r 500 -t 10m \\
  --expect-workers 8 \\
  --host https://staging.example.com --csv distributed
\`\`\`

The master will not start the test until all 8 workers have connected. Each worker needs the same locustfile, so bake it into a Docker image or sync it before launch. In Kubernetes you typically run the master as one Deployment and the workers as a scaled Deployment pointing at the master Service.

## Custom Load Shapes with LoadTestShape

Flat load is unrealistic. Real traffic spikes, plateaus, and recedes. Subclass \`LoadTestShape\` and implement \`tick()\`, which returns a \`(user_count, spawn_rate)\` tuple for the current second or \`None\` to stop. This gives you full programmatic control over the ramp profile, including spike and step tests.

\`\`\`python
from locust import HttpUser, task, between, LoadTestShape

class WebsiteUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def index(self):
        self.client.get("/")

class StepLoadShape(LoadTestShape):
    """Ramp in steps: 100 users, hold, 500, hold, 1000, hold, then stop."""
    stages = [
        {"duration": 60,  "users": 100,  "spawn_rate": 20},
        {"duration": 120, "users": 500,  "spawn_rate": 50},
        {"duration": 180, "users": 1000, "spawn_rate": 100},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        return None  # end the test
\`\`\`

When a \`LoadTestShape\` is present, Locust ignores the \`-u\` and \`-r\` flags and follows the shape instead. This is how you build spike tests (jump from 50 to 5000 in one tick) or soak tests (hold a moderate level for hours) without touching the dashboard.

## Reading Metrics and Percentiles

Averages lie. A 200 ms mean can hide a brutal tail where 1 percent of users wait 8 seconds. Locust reports percentiles in both the UI and the CSV output. Focus on these:

- **p50 (median)** — the typical experience.
- **p95** — the slow-but-common case; most SLOs live here.
- **p99** — the painful tail that drives support tickets.
- **RPS** — requests per second the system sustained.
- **Failure %** — share of requests that errored or failed a custom check.

You can also attach event listeners to react to or record raw stats programmatically. This hook fails the process when the p95 exceeds a threshold, which is how you turn a load test into a pass/fail gate.

\`\`\`python
from locust import events

@events.quitting.add_listener
def _(environment, **kwargs):
    stats = environment.stats.total
    if stats.get_response_time_percentile(0.95) > 800:
        print("p95 over 800ms budget")
        environment.process_exit_code = 1
    elif stats.fail_ratio > 0.01:
        print("failure ratio over 1%")
        environment.process_exit_code = 1
    else:
        environment.process_exit_code = 0
\`\`\`

## Exporting CSV and HTML Reports

Trend analysis needs persisted data. The \`--csv\` flag writes four files: \`<prefix>_stats.csv\` (per-endpoint aggregates), \`<prefix>_stats_history.csv\` (a time series sampled every second), \`<prefix>_failures.csv\`, and \`<prefix>_exceptions.csv\`. Add \`--csv-full-history\` to keep every interval rather than only the final snapshot.

\`\`\`bash
locust -f locustfile.py --headless -u 500 -r 50 -t 3m \\
  --host https://staging.example.com \\
  --csv reports/run-2026-06-19 \\
  --csv-full-history \\
  --html reports/run-2026-06-19.html
\`\`\`

Commit the HTML report as a CI artifact so reviewers can open a self-contained dashboard for any build. Feed the history CSV into a notebook or a dashboarding tool to chart p95 across releases and catch slow regressions before they reach users.

## Integrating Locust into CI

The pattern is simple: run headless, set a duration, and let the \`quitting\` listener set a non-zero exit code when budgets are blown. GitHub Actions makes this a few lines.

\`\`\`yaml
name: load-test
on:
  workflow_dispatch:
  schedule:
    - cron: "0 3 * * 1"   # Monday 3am
jobs:
  locust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements-load.txt
      - name: Run Locust headless
        run: |
          locust -f locustfile.py --headless \\
            -u 1000 -r 100 -t 5m \\
            --host \${{ secrets.STAGING_URL }} \\
            --csv results --html report.html \\
            --only-summary
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: locust-report
          path: |
            results_*.csv
            report.html
\`\`\`

Run load tests against a stable staging environment, not production, and schedule heavy runs off-peak. The \`if: always()\` on the upload step guarantees you keep the report even when the budget check fails the job.

## Locust vs k6 vs JMeter

All three tools generate load, but they make different trade-offs. Locust wins on Python ergonomics and dynamic logic; k6 wins on raw single-node efficiency and a developer-friendly CLI; JMeter wins on protocol breadth and its mature GUI. The table summarizes where each shines.

| Dimension | Locust | k6 | JMeter |
|-----------|--------|-----|--------|
| Scripting language | Python | JavaScript (ES6) | XML / GUI, Groovy for logic |
| Concurrency model | gevent green threads | Go goroutines | OS threads |
| Single-node efficiency | Good | Excellent | Moderate (thread-heavy) |
| Distributed mode | Built-in master-worker | Built-in (k6 cloud / OSS operator) | Master-slave, heavier setup |
| Live web UI | Yes, built-in | Via Grafana/cloud | Limited (GUI is for authoring) |
| Custom load shapes | LoadTestShape class | Stages / executors | Thread group ramps |
| Best for | Python teams, complex flows | JS teams, CI-first perf | Enterprise, many protocols |
| Learning curve | Low (if you know Python) | Low (if you know JS) | Steeper |

If your engineers live in Python, Locust removes friction no other tool matches. For a deeper head-to-head, see our [k6 vs JMeter comparison](/blog/k6-vs-jmeter-2026) and the broader [JMeter vs Locust vs Gatling breakdown](/blog/jmeter-vs-locust-vs-gatling-comparison). Teams evaluating Scala-based tooling should also read the [Gatling complete guide](/blog/gatling-scala-load-testing-complete-guide).

## Frequently Asked Questions

### What is Locust used for in load testing?

Locust is an open-source Python load testing tool used to simulate thousands of concurrent users hitting a website or API. You define user behavior as Python code, run a swarm headless or through a web UI, and watch live metrics like requests per second, failure rate, and response-time percentiles to find where a system breaks.

### How do I run Locust without the web UI?

Add the \`--headless\` flag along with \`-u\` for user count, \`-r\` for spawn rate, and \`-t\` for duration, for example \`locust -f locustfile.py --headless -u 1000 -r 100 -t 5m --host https://example.com\`. This starts the test immediately, runs for the set time, and exits, which is ideal for CI pipelines and scripted automation.

### How many users can Locust simulate?

A single Locust process handles a few thousand users because gevent runs on one CPU core. To go higher you use distributed master-worker mode: start one master and many workers (one per core), and the swarm scales linearly. With enough worker machines, Locust can comfortably simulate tens or hundreds of thousands of concurrent users.

### What is the difference between wait_time options in Locust?

\`between(min, max)\` gives each user a random delay between tasks, \`constant(seconds)\` gives a fixed pause, and \`constant_throughput(rate)\` targets a steady number of tasks per second per user regardless of response time. Use \`constant_throughput\` when you need a predictable request rate rather than a fixed concurrent-user count.

### How do I authenticate users in a Locust test?

Implement the \`on_start\` hook on your \`HttpUser\` class. It runs once when each simulated user spawns, so you log in there, read the token from the response, and set it on \`self.client.headers\` with an Authorization Bearer value. Every task that user runs afterward is automatically authenticated for its lifetime.

### Can Locust fail a CI build on a performance regression?

Yes. Attach an \`@events.quitting.add_listener\` function that inspects \`environment.stats.total\`, and set \`environment.process_exit_code = 1\` when the p95 latency or failure ratio exceeds your budget. Because the process exits non-zero, the CI step fails, turning your load test into a hard pass/fail performance gate.

### Is Locust better than k6 or JMeter?

It depends on your stack. Locust is best for Python teams that need complex, dynamic scenarios. k6 is more efficient per node and suits JavaScript-centric, CI-first workflows. JMeter supports the widest range of protocols and has a mature GUI for non-coders. Choose the tool whose language and concurrency model best fit your team and system.

### How do I create realistic traffic spikes in Locust?

Subclass \`LoadTestShape\` and implement \`tick()\`, returning a \`(user_count, spawn_rate)\` tuple for each moment in time or \`None\` to stop. You can jump from 50 to 5000 users in a single tick for a spike test, hold a level for hours for a soak test, or step up gradually, all in pure Python without touching the dashboard.

## Conclusion

Locust turns load testing into something Python engineers genuinely enjoy: real code, real concurrency, and real-time percentiles instead of brittle XML or a foreign scripting dialect. Start with a simple \`HttpUser\`, layer in weighted tasks and \`on_start\` authentication, then graduate to distributed master-worker swarms and custom \`LoadTestShape\` ramps as your needs grow. Wire the headless runner into CI with a \`quitting\` listener and you have an automated guardrail that fails the build the moment latency budgets slip.

Performance testing is one piece of a complete quality strategy. Explore the full catalog of [QA skills](/skills) to pair Locust with API testing, end-to-end automation, and AI-assisted QA workflows, and build a testing practice that catches regressions long before your users feel them.
`,
};
