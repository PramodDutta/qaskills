import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Locust Load Testing with Python: Complete 2026 Tutorial',
  description:
    'Learn Locust load testing with Python end to end: write a locustfile with HttpUser and @task, run the web UI and headless CLI, scale with master/worker, and export results.',
  date: '2026-06-23',
  category: 'Tutorial',
  content: `
# Locust Load Testing with Python: Complete 2026 Tutorial

Locust is an open-source load testing tool that lets you describe user behavior in plain Python instead of clicking through a GUI or fighting an XML config. If you can write a function, you can write a load test. You define a "user" as a Python class, decorate methods with \`@task\` to mark the requests that user makes, and Locust swarms your target with thousands of these simulated users while reporting live request rates, response times, and failures. Because the test is just Python, you get the full ecosystem for free: \`requests\`-style HTTP calls through the built-in client, environment variables for config, your own helper libraries, and any pip package you need to generate realistic payloads.

This tutorial walks through Locust from a standing start. We will cover what Locust is and the gevent/greenlet concurrency model that makes a single machine generate so much load, how to install it, and how to write your first \`locustfile.py\` using \`HttpUser\`, \`@task\`, and \`wait_time\`. Then we run it two ways — interactively through the web UI at \`http://localhost:8089\`, and in CI-friendly headless mode with \`--users\`, \`--spawn-rate\`, \`--run-time\`, and \`--headless\`. After that we go deeper: task weighting, \`TaskSet\` and \`SequentialTaskSet\`, \`on_start\`/\`on_stop\` for login flows, marking responses as failures with \`catch_response\`, shaping load over time with \`LoadTestShape\`, running distributed across a master and many workers, exporting CSV results, wiring it into CI, and how Locust compares to k6 and JMeter. By the end you will have a runnable test you can point at your own API. Verify exact flags and class names against the current Locust docs before a production run, since the project evolves.

## What is Locust and how does the gevent model work?

Locust is a Python load testing framework where each simulated user is an instance of a user class you write. Instead of OS threads (which are heavy and limited to a few thousand per box), Locust uses **gevent**, a coroutine library built on **greenlets**. A greenlet is a lightweight, cooperatively-scheduled "micro-thread." When one simulated user is waiting on network I/O (the slow part of any HTTP request), gevent transparently switches to another greenlet that has work to do. Because thousands of greenlets share a single OS thread and only one runs at a time, you can simulate tens of thousands of concurrent users from a single process without the memory and context-switch overhead of real threads.

The practical consequence: a single modern laptop can usually drive several thousand concurrent users. The catch is that everything runs cooperatively on one CPU core, so if your test code does CPU-heavy work (parsing huge JSON, crypto, image processing) it blocks the whole event loop and your generated load drops. The fix is distributed mode (one master plus many workers, covered later) which spreads users across cores and machines. Keep per-task Python work light and let the network be the bottleneck.

## Installing Locust

Locust is a normal Python package. You need Python 3.9+ (check the current minimum on the docs). Use a virtual environment so it does not pollute your system Python:

\`\`\`bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\activate
pip install locust
locust --version
\`\`\`

That last command prints the installed version and confirms the \`locust\` CLI is on your PATH. On Linux you may need build tools for gevent's C extensions, but pip ships wheels for the common platforms so most installs are instant. Pin the version in \`requirements.txt\` (for example \`locust==2.x.x\`) so CI and your laptop run the same engine.

## Your first locustfile

By convention your test lives in a file named \`locustfile.py\`. The minimum viable test is a class that subclasses \`HttpUser\`, sets a \`wait_time\`, and has at least one \`@task\` method. Here is a complete, runnable example you can point at any HTTP API:

\`\`\`python
from locust import HttpUser, task, between


class WebsiteUser(HttpUser):
    # Each simulated user waits 1 to 5 seconds between tasks,
    # mimicking a human pausing between page views.
    wait_time = between(1, 5)

    @task
    def view_homepage(self):
        # self.client is a requests-like HTTP session, scoped per user.
        # The URL is relative to --host (set on the CLI or via host attr).
        self.client.get("/")

    @task(3)
    def view_products(self):
        # weight 3: chosen ~3x as often as a weight-1 task.
        self.client.get("/products")
\`\`\`

\`HttpUser\` gives every user a \`self.client\` — a session built on the \`requests\` library that automatically tracks each call's timing, status, and name and reports it to Locust. \`wait_time = between(1, 5)\` makes each user sleep a random 1–5 seconds between tasks so you simulate think time rather than a tight loop. Locust also ships \`constant(2)\` (always 2 seconds) and \`constant_throughput(1)\` / \`constant_pacing(1)\` if you want to target a fixed rate per user. The two \`@task\` methods are the things this user does; the \`(3)\` argument is a weight, explained next.

## Running it: the web UI

With \`locustfile.py\` in your current directory, start Locust:

\`\`\`bash
locust -f locustfile.py
\`\`\`

It prints that the web interface is running and you open \`http://localhost:8089\` in a browser. The start form asks for **number of users** (peak concurrent users to simulate), **spawn rate** (how many new users to start per second until you hit the peak), and the **host** (base URL like \`https://staging.example.com\` that all your relative \`self.client\` paths are joined to). Click Start swarming and the live dashboard shows requests per second, response time percentiles (50th, 95th, 99th), failure counts, and per-endpoint stats updating in real time. Charts plot RPS and response times over the run. This interactive mode is ideal for exploratory testing and demos — you can ramp users up and down on the fly and watch the system react.

## Running it: headless mode for CI

For automation you do not want a browser. Pass \`--headless\` and supply the load parameters and host on the command line so the run is fully unattended and reproducible:

\`\`\`bash
locust -f locustfile.py \\
  --headless \\
  --users 500 \\
  --spawn-rate 50 \\
  --run-time 5m \\
  --host https://staging.example.com \\
  --csv results
\`\`\`

This spawns up to 500 users at 50 per second, runs for 5 minutes, then stops automatically. \`--run-time\` accepts values like \`30s\`, \`5m\`, or \`1h30m\`. \`--csv results\` writes \`results_stats.csv\`, \`results_failures.csv\`, and friends. The process prints a summary table and exits — perfect for a pipeline step.

Here are the flags you will reach for most often:

| Flag | Meaning |
|---|---|
| \`-f <file>\` | Path to the locustfile (defaults to \`locustfile.py\`) |
| \`--host <url>\` | Base URL prepended to relative request paths |
| \`--headless\` | Run without the web UI; start swarming immediately |
| \`--users <n>\` | Peak number of concurrent simulated users |
| \`--spawn-rate <n>\` | Users started per second until peak is reached |
| \`--run-time <t>\` | Stop after a duration, e.g. \`30s\`, \`10m\`, \`1h\` |
| \`--csv <prefix>\` | Write stats/failures/history CSV files with this prefix |
| \`--html <file>\` | Write a standalone HTML report at the end of the run |
| \`--master\` | Run this process as the distributed coordinator |
| \`--worker\` | Run this process as a load-generating worker |
| \`--master-host <ip>\` | Address of the master for a worker to connect to |
| \`--expect-workers <n>\` | Master waits for this many workers before starting |

## Task weighting, TaskSet, and SequentialTaskSet

In the first example, \`@task(3)\` weighted \`view_products\` so it runs about three times as often as the unweighted \`view_homepage\`. Weights let you model realistic traffic mixes — browsing is far more common than checkout, for example. You can also group related tasks into a \`TaskSet\`, which is a reusable bundle of behavior that a user can be assigned:

\`\`\`python
from locust import HttpUser, TaskSet, SequentialTaskSet, task, between


class BrowsingTasks(TaskSet):
    @task(5)
    def list_products(self):
        self.client.get("/products")

    @task(1)
    def stop(self):
        # Return control to the parent user/taskset.
        self.interrupt()


class CheckoutFlow(SequentialTaskSet):
    # Tasks run in the order they are declared, once each, top to bottom.
    @task
    def add_to_cart(self):
        self.client.post("/cart", json={"sku": "ABC-123", "qty": 1})

    @task
    def view_cart(self):
        self.client.get("/cart")

    @task
    def checkout(self):
        self.client.post("/checkout", json={"payment": "card"})


class ShopUser(HttpUser):
    wait_time = between(1, 3)
    tasks = [BrowsingTasks, CheckoutFlow]
\`\`\`

A plain \`TaskSet\` picks among its tasks randomly by weight, like the user class itself. A \`SequentialTaskSet\` runs its tasks strictly in declaration order, which is exactly what you want for a multi-step flow such as add-to-cart then view-cart then checkout. Mixing both in one user's \`tasks\` list models a population that mostly browses but sometimes completes a purchase.

## on_start and on_stop: login and teardown

Most real APIs require authentication. Locust gives every user an \`on_start\` hook that runs once when the user is spawned, before any task, and an \`on_stop\` hook that runs when the user is stopped. Use \`on_start\` to log in and stash a token, and \`on_stop\` to clean up. Here is a fuller \`locustfile.py\` that logs in, reuses the token, and asserts on a response:

\`\`\`python
from locust import HttpUser, task, between


class ApiUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        # Runs once per simulated user, before any task.
        response = self.client.post(
            "/api/login",
            json={"username": "loadtest", "password": "secret"},
        )
        if response.status_code == 200:
            token = response.json().get("token")
            # Attach the token to every later request from this user.
            self.client.headers.update({"Authorization": f"Bearer {token}"})
        else:
            # Stop this user; it cannot do authenticated work.
            self.environment.runner.quit()

    @task(3)
    def get_profile(self):
        self.client.get("/api/profile")

    @task
    def list_orders(self):
        # catch_response lets us inspect the body and decide pass/fail.
        with self.client.get("/api/orders", catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Unexpected status {response.status_code}")
            elif "orders" not in response.json():
                response.failure("Response missing 'orders' key")
            else:
                response.success()

    def on_stop(self):
        # Runs once when the user is told to stop. Good for logout.
        self.client.post("/api/logout")
\`\`\`

Because \`self.client.headers\` is per-user, the token set in \`on_start\` flows into every task that user runs, exactly like a real authenticated session. The \`on_stop\` logout keeps your backend's session tables from filling up during long runs.

## Assertions and failures with catch_response

By default Locust marks any HTTP response with a status below 400 as a success. But a \`200 OK\` with a wrong or empty body is a real failure that default behavior misses. The \`catch_response=True\` flag, used as a context manager, hands you the response so you can validate it and explicitly call \`response.success()\` or \`response.failure("reason")\`. The \`list_orders\` task above shows the pattern: it fails the request if the status is not 200 or if the JSON is missing the \`orders\` key. Those failures show up in the failures table and CSV with your custom message, which is how you turn a load test into a real assertion-driven check. You can also use it inversely — to mark an expected 404 as a success during negative testing.

## Custom load shapes with LoadTestShape

A flat "500 users for 5 minutes" run is fine for a baseline, but real traffic ramps, spikes, and recedes. Subclass \`LoadTestShape\` and implement \`tick()\` to drive the user count and spawn rate over time. \`tick()\` is called roughly once a second and returns a \`(user_count, spawn_rate)\` tuple, or \`None\` to stop the test:

\`\`\`python
from locust import HttpUser, task, between, LoadTestShape


class WebsiteUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def index(self):
        self.client.get("/")


class StagesShape(LoadTestShape):
    # Ramp to 100, hold, spike to 500, then ramp down.
    stages = [
        {"duration": 60, "users": 100, "spawn_rate": 10},
        {"duration": 120, "users": 100, "spawn_rate": 10},
        {"duration": 180, "users": 500, "spawn_rate": 50},
        {"duration": 240, "users": 50, "spawn_rate": 50},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])
        return None  # No more stages -> stop the test.
\`\`\`

With a shape class present, you do not pass \`--users\`/\`--spawn-rate\` — the shape owns the schedule. This is the idiomatic way to script soak tests, stress ramps, and spike tests. Note \`duration\` here is the cumulative elapsed time at which each stage ends, which is why the loop returns the first stage whose end time is still ahead of the current run time.

## Distributed testing: master and workers

One Python process is capped by a single CPU core. To generate more load, run Locust distributed: one **master** coordinates and aggregates stats but generates no load itself, and many **workers** each run a slice of the simulated users. Start the master:

\`\`\`bash
locust -f locustfile.py --master --expect-workers 4 \\
  --headless --users 4000 --spawn-rate 200 --run-time 10m \\
  --host https://staging.example.com
\`\`\`

Then start each worker, pointing it at the master (use the master's IP/hostname across machines):

\`\`\`bash
locust -f locustfile.py --worker --master-host 127.0.0.1
\`\`\`

Run four worker commands (or use \`--processes 4\` / \`-1\` on a worker to fork per core). The master waits for \`--expect-workers 4\` to connect, then distributes the 4000 users evenly — 1000 per worker — and merges their reported stats into one dashboard or CSV. Every worker needs the same \`locustfile.py\`. For Kubernetes, the community **locust-operator** / Helm charts spin up master and worker pods for you. The key mental model: workers do the load, the master only orchestrates and reports.

## Parsing results and exporting CSV

For CI you want machine-readable output, not a web dashboard. The \`--csv results\` flag writes several files: \`results_stats.csv\` (per-endpoint and aggregated request counts, RPS, median/95th/99th response times), \`results_failures.csv\` (each failure with its message and count), \`results_stats_history.csv\` (a time series sampled during the run), and \`results_exceptions.csv\`. Add \`--csv-full-history\` for a denser time series. \`--html report.html\` produces a self-contained HTML report with the charts baked in — easy to attach as a CI artifact. You can also tap the data programmatically by hooking Locust's event system (for example \`request\` and \`quitting\` events) to push metrics to Prometheus, Grafana, or your own store, but for most pipelines CSV plus a threshold check is enough.

## CI integration

The headless command is your CI step. The pattern: run a fixed load for a fixed time, write CSV, then parse the CSV in a small script that fails the build if the 95th-percentile latency or failure rate crosses a budget. Locust does not have k6-style built-in thresholds, so you implement the gate yourself:

\`\`\`yaml
# .github/workflows/load-test.yml (excerpt)
- name: Run Locust load test
  run: |
    pip install locust
    locust -f locustfile.py --headless \\
      --users 200 --spawn-rate 20 --run-time 3m \\
      --host \${{ secrets.STAGING_URL }} \\
      --csv results --only-summary

- name: Enforce performance budget
  run: python check_thresholds.py results_stats.csv
\`\`\`

Your \`check_thresholds.py\` reads the aggregated row from \`results_stats.csv\`, compares the 95th percentile and failure count to your limits, and exits non-zero to fail the pipeline when the budget is blown. Keep load tests off the critical path of every commit — run them nightly or on demand against staging, since a real load run takes minutes and needs an isolated target.

## Locust vs k6 vs JMeter

All three are mature load testing tools; the right pick depends on your team's language and workflow. Locust scripts are pure Python, k6 scripts are JavaScript (on a Go engine), and JMeter is GUI/XML-driven with a JVM runtime.

| Dimension | Locust | k6 | JMeter |
|---|---|---|---|
| Test language | Pure Python | JavaScript (Go engine) | GUI / XML (Groovy for scripting) |
| Concurrency model | Greenlets (gevent) | Goroutines | OS threads |
| Live web UI | Yes (signature feature) | No native UI | Yes (GUI, not for load runs) |
| Distributed load | Built-in master/worker | k6-operator / Grafana Cloud | Master/slave (heavier setup) |
| Pass/fail gates | DIY (parse stats) | First-class \`thresholds\` | Assertions + listeners |
| Scripting flexibility | Full Python ecosystem | JS sandbox, no full Node API | Plugins; verbose for custom logic |
| Resource use per node | Low | Very low | Higher (threads + JVM) |
| Best for | Python teams, custom logic | JS/TS teams, CI gates, max load | Enterprise GUI workflows, protocol breadth |

Choose Locust when your team writes Python and your scenarios need real programmability — calling internal libraries, generating complex payloads, branching logic. Choose k6 when you want the highest single-node throughput and built-in CI thresholds and your team is comfortable in JavaScript. Choose JMeter when you need its enormous protocol/plugin ecosystem or your organization is standardized on its GUI. For a deeper head-to-head, see our [k6 vs Locust 2026 comparison](/blog/k6-vs-locust-2026) and [k6 vs JMeter performance testing guide](/blog/k6-vs-jmeter-performance-testing).

## Best practices

Keep task code lightweight so the gevent loop is never blocked by CPU work — push heavy processing out of the hot path. Always set a realistic \`wait_time\`; a test with no think time hammers the server in an unrealistic way and inflates your numbers. Name your requests when URLs contain dynamic IDs (\`self.client.get(f"/users/{uid}", name="/users/[id]")\`) so the stats table groups them instead of exploding into thousands of unique rows. Use \`catch_response\` to assert on bodies, not just status codes. Externalize host, credentials, and load parameters as CLI flags or environment variables so the same file runs against dev, staging, and CI. Test against a staging environment that mirrors production, never production itself, and ramp gradually with \`--spawn-rate\` to find the breaking point rather than slamming peak load instantly. Finally, store a baseline result and compare each run against it so regressions surface early.

## Frequently Asked Questions

### Is Locust good for load testing?

Yes. Locust is a mature, widely used open-source load testing tool that excels when you want to define user behavior in real Python. Its gevent model lets a single machine simulate thousands of users, it has a friendly live web UI, and distributed master/worker mode scales to very high load. It is especially strong for teams that already write Python and need programmable, branching test scenarios.

### How many users can Locust simulate?

A single Locust process can typically simulate a few thousand concurrent users, limited by one CPU core because greenlets run cooperatively. To go higher, run distributed mode with one master and many workers across cores and machines — there is no hard ceiling, and large setups drive hundreds of thousands of users. Keep per-task code light so CPU work does not block the event loop and cap your throughput.

### What is the difference between @task and TaskSet in Locust?

A \`@task\` is a single method on a user (or task set) that performs one unit of behavior, like one HTTP request. A \`TaskSet\` groups several related tasks into a reusable bundle a user can be assigned, and it can be nested. Use \`SequentialTaskSet\` when the tasks must run in a fixed order, such as a login then add-to-cart then checkout flow.

### How do I run Locust without the web UI?

Pass \`--headless\` along with the load parameters: \`locust -f locustfile.py --headless --users 500 --spawn-rate 50 --run-time 5m --host https://example.com\`. Locust starts swarming immediately, runs for the given duration, prints a summary, and exits. Add \`--csv results\` to write machine-readable stats. This is the mode you use in CI pipelines and automated performance gates where no browser is available.

### How does Locust handle authentication and login?

Override the \`on_start\` method on your user class. It runs once per simulated user before any task, so you POST to your login endpoint, read the token from the response, and attach it to \`self.client.headers\` so every subsequent request from that user is authenticated. Use \`on_stop\` to log out or clean up. Because the client is per-user, each simulated user maintains its own independent session.

### Can Locust fail a test on slow responses?

Locust itself does not have built-in pass/fail thresholds like k6. You enforce budgets two ways: use \`catch_response=True\` to call \`response.failure()\` when a body or status is wrong, which records failures in the report, and in CI parse the exported \`results_stats.csv\` with a small script that exits non-zero when the 95th percentile latency or failure rate exceeds your limit. That script becomes your performance gate.

### Is Locust better than JMeter?

It depends on your team. Locust is lighter, code-first (pure Python), and friendlier for developers who want programmable scenarios and version-controlled tests. JMeter has a larger protocol and plugin ecosystem and a GUI many enterprise teams standardize on, but its tests are XML and heavier on resources. If your team writes Python and values scriptability, Locust usually wins; if you need broad protocol support or an established GUI workflow, JMeter may fit better.

### How do I run Locust in distributed mode?

Start one process with \`--master\` (it coordinates and aggregates but generates no load), then start one or more processes with \`--worker --master-host <master-ip>\`. The master waits for workers (use \`--expect-workers N\`), splits the total users evenly across them, and merges their stats into one report. Every worker must use the same locustfile. This is how you scale beyond a single CPU core's limit.

## Conclusion

Locust turns load testing into something you actually want to maintain: real Python you can read, diff, and reuse. You now have a complete picture — the gevent/greenlet model that powers it, installation, a runnable \`locustfile.py\` with \`HttpUser\`, \`@task\`, \`wait_time\`, and an authenticated \`on_start\` login, both the web UI and headless CLI runs, task weighting and sequential flows, \`catch_response\` assertions, \`LoadTestShape\` for realistic traffic, distributed master/worker scaling, CSV export, and a CI gate. Start small: point the first example at your staging API, run it headless for a couple of minutes, then layer on login, assertions, and a load shape as your needs grow.

Ready to go further with QA tooling and automation? Browse the [QASkills skills directory](/skills) for ready-to-use skills your AI coding agent can install, and keep learning with our [load testing for beginners guide](/blog/load-testing-beginners-guide) and the [complete pytest testing guide](/blog/pytest-testing-complete-guide) to round out your Python testing stack.
`,
};
