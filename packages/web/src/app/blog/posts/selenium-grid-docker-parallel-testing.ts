import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Grid with Docker -- Parallel Testing at Scale',
  description:
    'Complete guide to Selenium Grid with Docker. Covers grid architecture, docker-compose setup, parallel test execution, Kubernetes scaling, and AI agent integration.',
  date: '2026-02-23',
  category: 'Tutorial',
  content: `
Running your Selenium test suite sequentially on a single machine is fine when you have fifty tests. When you have five hundred -- or five thousand -- it becomes a bottleneck that slows down your entire delivery pipeline. A suite that takes forty-five minutes to run sequentially can finish in under five minutes when distributed across a Selenium Grid running in Docker containers. This guide walks you through every aspect of setting up Selenium Grid with Docker for parallel testing at scale. You will learn the Grid architecture, write a complete docker-compose setup, configure your test runners for parallel execution, scale dynamically with Docker and Kubernetes, record video for debugging, integrate with CI/CD, and compare self-hosted grids against cloud providers. Whether you are running a handful of browser tests or orchestrating thousands across multiple browser versions, this guide gives you the blueprint.

---

## Key Takeaways

- **Selenium Grid 4** introduced a completely redesigned architecture with Router, Distributor, Session Map, Session Queue, and Node components -- replacing the monolithic Hub/Node model from Grid 3
- **Docker Compose** makes spinning up a full Selenium Grid with Chrome, Firefox, and Edge nodes trivial -- a single \`docker-compose up --scale chrome=5\` gives you five parallel Chrome instances
- **Dynamic Grid mode** automatically creates and destroys Docker containers per test session, eliminating idle resource waste and guaranteeing a clean browser state for every test
- **Parallel test execution** requires configuration at the test runner level -- pytest-xdist, TestNG parallel suites, JUnit 5 parallel execution, or Playwright's built-in sharding all connect to your Grid via Remote WebDriver
- **Kubernetes with KEDA** enables auto-scaling your Grid based on the session queue length, handling burst test loads without manual capacity planning
- **Video recording and VNC** are built into Selenium's official Docker images, giving you test replay and live debugging without any additional tooling

---

## What Is Selenium Grid?

Selenium Grid is a distributed test execution infrastructure that lets you run tests on multiple machines and browsers simultaneously. Instead of executing tests one at a time on your local machine, you send test requests to a central Grid that distributes them across available browser nodes.

### The Original Hub/Node Model

In Selenium Grid 3 and earlier, the architecture was straightforward. A single **Hub** accepted incoming WebDriver session requests and routed them to registered **Nodes** -- machines running actual browser instances. The Hub maintained a registry of available Nodes and their capabilities (browser type, version, platform), and matched incoming test requests to the appropriate Node.

This model worked well for small to medium grids but had limitations. The Hub was a single point of failure. All traffic flowed through it, creating a bottleneck at scale. Session management was basic, and observability was nearly nonexistent.

### Selenium Grid 4 Architecture

Selenium Grid 4 completely redesigned the architecture into discrete, independently scalable components:

| Component | Responsibility |
|---|---|
| **Router** | Entry point for all WebDriver requests. Routes to the correct component based on the request type |
| **Distributor** | Accepts new session requests and assigns them to available Nodes based on capabilities matching |
| **Session Map** | Maintains a mapping of active session IDs to the Node handling each session |
| **Session Queue** | Holds pending session requests when no matching Node is immediately available |
| **Node** | Runs the actual browser instances and executes WebDriver commands |
| **Event Bus** | Internal communication backbone connecting all components |

This decomposed architecture means each component can be scaled independently. You can run multiple Distributors behind a load balancer, add Nodes dynamically, and replace individual components without taking down the entire Grid.

### New Grid 4 Features

Beyond the architectural redesign, Grid 4 introduced several important capabilities:

- **GraphQL endpoint** at \`/graphql\` for querying Grid status, active sessions, node capacity, and queue depth programmatically
- **Observability hooks** with OpenTelemetry support for distributed tracing across Grid components
- **Fully distributed mode** where each component runs as a separate process or container, communicating over the Event Bus
- **Standalone mode** that bundles all components into a single process for simple setups -- ideal for local development and small teams

You can query the Grid status at any time:

\`\`\`bash
curl http://localhost:4444/graphql --data '{"query": "{ grid { uri, totalSlots, usedSlots, sessionCount } }"}'
\`\`\`

This returns real-time information about available capacity, active sessions, and queue depth -- essential for monitoring and auto-scaling decisions.

---

## Docker-Compose Setup

The official Selenium project maintains Docker images for every Grid component. These images are production-tested, regularly updated, and the recommended way to run Selenium Grid in containerized environments.

### Basic Grid with Chrome, Firefox, and Edge

Here is a complete \`docker-compose.yml\` that gives you a fully functional Selenium Grid with three browser types:

\`\`\`yaml
version: "3.8"

services:
  selenium-hub:
    image: selenium/hub:4.27.0
    container_name: selenium-hub
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"
    environment:
      - SE_NODE_MAX_SESSIONS=5
      - SE_NODE_SESSION_TIMEOUT=300
      - SE_SESSION_REQUEST_TIMEOUT=300

  chrome:
    image: selenium/node-chrome:4.27.0
    shm_size: "2gb"
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=3
      - SE_NODE_OVERRIDE_MAX_SESSIONS=true

  firefox:
    image: selenium/node-firefox:4.27.0
    shm_size: "2gb"
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=3
      - SE_NODE_OVERRIDE_MAX_SESSIONS=true

  edge:
    image: selenium/node-edge:4.27.0
    shm_size: "2gb"
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=3
      - SE_NODE_OVERRIDE_MAX_SESSIONS=true
\`\`\`

A few important details about this configuration:

- **\`shm_size: "2gb"\`** is critical. Chrome and other browsers use \`/dev/shm\` for shared memory. The default Docker shared memory allocation of 64MB causes browser crashes during test execution. Always set this to at least 2GB for stability.
- **\`SE_NODE_MAX_SESSIONS\`** controls how many browser instances each Node runs concurrently. Set this based on your container's CPU and memory allocation -- typically 1 session per CPU core.
- **Ports 4442 and 4443** are the Event Bus publish/subscribe ports. Port 4444 is the WebDriver endpoint your tests connect to.

### Scaling Nodes

The real power of Docker Compose for Selenium Grid is horizontal scaling. Want five Chrome nodes instead of one? A single flag does it:

\`\`\`bash
docker-compose up --scale chrome=5 --scale firefox=3 --scale edge=2 -d
\`\`\`

This gives you 5 Chrome nodes, 3 Firefox nodes, and 2 Edge nodes. With \`SE_NODE_MAX_SESSIONS=3\`, that is 30 total parallel browser sessions. Your test suite can now run 30 tests simultaneously.

### Environment Configuration Reference

| Variable | Default | Description |
|---|---|---|
| \`SE_NODE_MAX_SESSIONS\` | 1 | Max concurrent browser sessions per Node |
| \`SE_NODE_OVERRIDE_MAX_SESSIONS\` | false | Allow overriding the max sessions limit |
| \`SE_NODE_SESSION_TIMEOUT\` | 300 | Seconds before an idle session is terminated |
| \`SE_SESSION_REQUEST_TIMEOUT\` | 300 | Seconds before a queued session request times out |
| \`SE_DRAIN_AFTER_SESSION_COUNT\` | 0 | Node drains after N sessions (0 = never). Useful for freshness |
| \`SE_VNC_NO_PASSWORD\` | false | Disable VNC password for debugging images |
| \`SE_SCREEN_WIDTH\` | 1920 | Browser viewport width |
| \`SE_SCREEN_HEIGHT\` | 1080 | Browser viewport height |
| \`SE_NODE_GRID_URL\` | auto | Override the Grid URL the Node registers with |

Start the Grid and verify it is running by visiting \`http://localhost:4444/ui\` -- the Grid Console shows all registered Nodes, their capabilities, and active sessions.

---

## Running Tests in Parallel

Having a Grid running is only half the equation. Your test framework needs to be configured to execute tests in parallel and send them to the Grid via Remote WebDriver.

### Connecting to the Grid

The key change in your test code is replacing the local browser driver with a **Remote WebDriver** pointing at your Grid's URL. Here is a Python example:

\`\`\`python
from selenium import webdriver
from selenium.webdriver.common.by import By

def create_remote_driver(browser="chrome"):
    options_map = {
        "chrome": webdriver.ChromeOptions(),
        "firefox": webdriver.FirefoxOptions(),
        "edge": webdriver.EdgeOptions(),
    }
    options = options_map[browser]
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Remote(
        command_executor="http://localhost:4444/wd/hub",
        options=options,
    )
    return driver

def test_homepage_title():
    driver = create_remote_driver("chrome")
    try:
        driver.get("https://example.com")
        assert "Example" in driver.title
    finally:
        driver.quit()
\`\`\`

And the equivalent in Java:

\`\`\`java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import java.net.URL;

public class GridTest {
    public WebDriver createRemoteDriver() throws Exception {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");

        return new RemoteWebDriver(
            new URL("http://localhost:4444/wd/hub"),
            options
        );
    }
}
\`\`\`

The Grid handles capability matching automatically. If you request Chrome, the Distributor finds a Node with available Chrome capacity. If none is available, the request goes into the Session Queue until a slot opens or the timeout expires.

### Parallel Execution with pytest-xdist

For Python teams, **pytest-xdist** is the standard way to run tests in parallel:

\`\`\`bash
pip install pytest-xdist
pytest tests/ -n 10 --dist=loadscope
\`\`\`

The \`-n 10\` flag spawns 10 worker processes, each independently creating Remote WebDriver sessions against your Grid. The \`--dist=loadscope\` strategy groups tests by module, keeping related tests on the same worker.

### Parallel Execution with TestNG

For Java teams using TestNG, configure parallel execution in your \`testng.xml\`:

\`\`\`xml
<suite name="Grid Suite" parallel="methods" thread-count="10">
  <test name="Cross Browser Tests">
    <classes>
      <class name="com.example.tests.LoginTest" />
      <class name="com.example.tests.SearchTest" />
      <class name="com.example.tests.CheckoutTest" />
    </classes>
  </test>
</suite>
\`\`\`

Setting \`parallel="methods"\` runs individual test methods across threads. Use \`parallel="classes"\` to run entire test classes in parallel, which is safer when tests within a class share state.

### Parallel Execution with JUnit 5

JUnit 5 supports parallel execution natively. Add this to your \`junit-platform.properties\`:

\`\`\`properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=10
\`\`\`

Each parallel test thread creates its own Remote WebDriver session. With 10 threads and a Grid that has 10 available slots, you get full parallel utilization.

### Key Consideration: Thread Safety

When running tests in parallel, your test code must be **thread-safe**. The most common mistakes are:

- Sharing a single WebDriver instance across threads (each thread must create its own)
- Writing to shared test data without synchronization
- Tests that depend on the execution order of other tests

Use **ThreadLocal** in Java or separate driver instances per test function in Python to isolate browser sessions.

---

## Dynamic Grid with Docker

The standard Grid setup keeps browser nodes running continuously, consuming resources even when no tests are executing. Selenium Grid 4 introduced **Dynamic Grid** mode, which solves this by creating and destroying Docker containers on demand.

### How Dynamic Grid Works

In Dynamic Grid mode, there are no pre-provisioned browser Nodes. When a test requests a new session:

1. The session request arrives at the Grid
2. The Distributor checks for available capacity -- finds none
3. The Grid instructs Docker to create a new container with the requested browser
4. The container starts, registers as a Node, and receives the test session
5. When the test ends, the container is destroyed

This means **zero idle resources** and a **clean browser state** for every single test. No leftover cookies, no stale cache, no leaked state between tests.

### Docker-Compose for Dynamic Grid

\`\`\`yaml
version: "3.8"

services:
  selenium-grid:
    image: selenium/standalone-docker:4.27.0
    container_name: selenium-dynamic
    ports:
      - "4444:4444"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./config.toml:/opt/selenium/config.toml
    environment:
      - SE_NODE_MAX_SESSIONS=4
\`\`\`

The critical detail is mounting the **Docker socket** (\`/var/run/docker.sock\`). This gives the Grid container the ability to create and destroy sibling containers on the same Docker host. You also provide a \`config.toml\` that specifies which browser images to use:

\`\`\`toml
[docker]
configs = [
  "selenium/standalone-chrome:4.27.0",
  '{"browserName": "chrome"}',
  "selenium/standalone-firefox:4.27.0",
  '{"browserName": "firefox"}',
  "selenium/standalone-edge:4.27.0",
  '{"browserName": "MicrosoftEdge"}'
]
url = "http://host.docker.internal:2375"
video-image = "selenium/video:ffmpeg-7.1-20241219"
\`\`\`

### Benefits of Dynamic Grid

| Aspect | Standard Grid | Dynamic Grid |
|---|---|---|
| **Resource usage** | Nodes always running | Containers created on demand |
| **Browser state** | Shared across sessions | Clean state every session |
| **Scaling** | Manual or scripted | Automatic per session |
| **Startup time** | Instant (nodes pre-warmed) | 2-5 second container startup |
| **Cost** | Fixed (even when idle) | Pay only for active sessions |

Dynamic Grid is ideal for teams that run tests periodically (CI/CD triggers) rather than continuously. The 2-5 second startup overhead per container is negligible for most test suites.

---

## Scaling with Kubernetes

When your testing needs outgrow a single Docker host, Kubernetes provides the orchestration layer to scale Selenium Grid across a cluster of machines.

### Why Move from Docker Compose to Kubernetes

Docker Compose runs all containers on a single machine. You are limited by that machine's CPU, memory, and network bandwidth. For teams needing more than 20-30 parallel browser sessions, or requiring fault tolerance and self-healing, Kubernetes is the natural next step.

### Helm Chart Deployment

The Selenium project maintains an official Helm chart that deploys the full Grid 4 architecture into Kubernetes:

\`\`\`bash
helm repo add selenium https://www.selenium.dev/docker-selenium
helm repo update

helm install selenium-grid selenium/selenium-grid \\
  --set chromeNode.replicas=5 \\
  --set firefoxNode.replicas=3 \\
  --set edgeNode.replicas=2 \\
  --set chromeNode.resources.requests.memory=1Gi \\
  --set chromeNode.resources.requests.cpu=500m \\
  --set chromeNode.resources.limits.memory=2Gi \\
  --set chromeNode.resources.limits.cpu=1000m
\`\`\`

This deploys the Hub (Router + Distributor + Session Map), Event Bus, Session Queue, and browser Nodes as separate Kubernetes Deployments with proper resource requests and limits.

### Auto-Scaling with KEDA

**KEDA** (Kubernetes Event-Driven Autoscaling) integrates with Selenium Grid's GraphQL endpoint to scale browser Nodes based on the session queue length. When tests pile up in the queue, KEDA creates more Nodes. When the queue empties, it scales back down to a minimum.

\`\`\`yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-chrome-scaler
spec:
  scaleTargetRef:
    name: selenium-chrome-node
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: selenium-grid
      metadata:
        url: "http://selenium-hub:4444/graphql"
        browserName: "chrome"
        sessionBrowserName: "chrome"
        activationThreshold: "1"
\`\`\`

When at least one Chrome session is waiting in the queue, KEDA scales the Chrome Node Deployment up to 20 replicas. When all sessions are fulfilled, it scales back down to 1. This handles burst testing loads -- such as nightly regression runs -- without paying for idle capacity during the day.

### When to Choose Kubernetes Over Docker Compose

| Scenario | Recommended Approach |
|---|---|
| Local development and debugging | Docker Compose |
| Small team, fewer than 20 parallel sessions | Docker Compose |
| CI/CD with moderate parallel needs | Docker Compose with scaling |
| Large team, 20+ parallel sessions | Kubernetes |
| Burst testing patterns (nightly regressions) | Kubernetes with KEDA |
| Multi-cluster or multi-region | Kubernetes |
| Compliance requirements (resource isolation) | Kubernetes |

---

## Video Recording and Debugging

One of the biggest advantages of running Selenium Grid in Docker is the ability to record every test session as a video and connect via VNC for live debugging. The official Selenium Docker images make both trivial.

### Video Recording Nodes

Selenium provides video-enabled Node images that record the entire browser session to an MP4 file:

\`\`\`yaml
chrome-video:
  image: selenium/node-chrome:4.27.0
  shm_size: "2gb"
  depends_on:
    - selenium-hub
  environment:
    - SE_EVENT_BUS_HOST=selenium-hub
    - SE_EVENT_BUS_PUBLISH_PORT=4442
    - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
    - SE_NODE_MAX_SESSIONS=1

chrome-video-recorder:
  image: selenium/video:ffmpeg-7.1-20241219
  volumes:
    - ./videos:/videos
  depends_on:
    - chrome-video
  environment:
    - DISPLAY_CONTAINER_NAME=chrome-video
    - SE_VIDEO_FILE_NAME=auto
\`\`\`

After tests complete, you will find MP4 recordings in the \`./videos\` directory. The \`SE_VIDEO_FILE_NAME=auto\` setting names each file based on the session ID, making it easy to correlate recordings with test results.

### VNC Live Debugging

The debug images (\`selenium/node-chrome-debug\` or the standard images with VNC enabled) expose a VNC server on each Node. Connect with any VNC viewer to watch tests execute in real time:

\`\`\`bash
# Connect to a specific node via VNC
# Default password: "secret"
vncviewer localhost:5900
\`\`\`

For larger grids, use **noVNC** -- a browser-based VNC client built into the Selenium Docker images. Access it at \`http://localhost:7900\` to watch any active session without installing a VNC client.

### Grid Console UI

The Grid Console at \`http://localhost:4444/ui\` provides a real-time dashboard showing:

- All registered Nodes and their browser capabilities
- Active sessions with session IDs
- Queue depth and pending session requests
- Node health and stereotypes

This is your first stop when debugging Grid issues like unmatched capabilities, stuck sessions, or Node registration failures.

### Saving Test Artifacts

For CI/CD pipelines, configure your test framework to save screenshots on failure alongside the video recordings:

\`\`\`python
import pytest
from datetime import datetime

@pytest.fixture
def driver(request):
    driver = create_remote_driver("chrome")
    yield driver
    if request.node.rep_call.failed:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        driver.save_screenshot(f"artifacts/{request.node.name}_{timestamp}.png")
    driver.quit()
\`\`\`

Combine screenshots, videos, and Grid logs to build a comprehensive debugging package for every failed test.

---

## CI/CD Integration

Running Selenium Grid in CI/CD is where distributed testing delivers the most value. Every pull request gets tested across multiple browsers in parallel, catching regressions before they reach production.

### GitHub Actions with Docker Compose

GitHub Actions supports Docker Compose natively. Here is a workflow that spins up a Selenium Grid, runs parallel tests, and collects artifacts:

\`\`\`yaml
name: Selenium Grid Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start Selenium Grid
        run: |
          docker-compose -f docker-compose.selenium.yml up -d \\
            --scale chrome=4 --scale firefox=2
          sleep 10  # Wait for nodes to register

      - name: Wait for Grid
        run: |
          timeout 60 bash -c 'until curl -sf http://localhost:4444/wd/hub/status | grep -q "ready.*true"; do sleep 2; done'

      - name: Run Tests
        run: pytest tests/ -n 6 --junitxml=results.xml

      - name: Collect Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            results.xml
            videos/
            artifacts/

      - name: Stop Grid
        if: always()
        run: docker-compose -f docker-compose.selenium.yml down
\`\`\`

The \`timeout\` wait step is essential -- it polls the Grid's status endpoint until all Nodes are registered and ready. Without it, tests may start before browser Nodes have connected, causing immediate failures.

For a deeper look at building production-grade CI/CD testing pipelines, see our [CI/CD pipeline guide with GitHub Actions](/blog/cicd-testing-pipeline-github-actions).

### GitHub Actions Service Containers

An alternative approach uses GitHub Actions' built-in service containers instead of Docker Compose:

\`\`\`yaml
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    services:
      selenium-hub:
        image: selenium/hub:4.27.0
        ports:
          - 4442:4442
          - 4443:4443
          - 4444:4444
      chrome:
        image: selenium/node-chrome:4.27.0
        env:
          SE_EVENT_BUS_HOST: selenium-hub
          SE_EVENT_BUS_PUBLISH_PORT: 4442
          SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
        options: --shm-size="2gb"
\`\`\`

Service containers are simpler but offer less flexibility. You cannot dynamically scale the number of nodes, and configuration options are more limited. For most teams, the Docker Compose approach is more practical.

### Optimizing CI Execution Time

Several techniques reduce your total pipeline time when using Selenium Grid in CI:

- **Pull browser images in advance** using a caching step or pre-built custom runner images
- **Run non-browser tests first** -- unit tests and integration tests should complete before the Grid even starts
- **Use headless mode** when you do not need video recordings -- it reduces resource consumption
- **Parallelize across matrix jobs** -- run Chrome tests and Firefox tests in separate GitHub Actions jobs that execute simultaneously

---

## Selenium Grid vs Cloud Providers

Self-hosting Selenium Grid is not the only option. Cloud-based browser testing platforms offer managed infrastructure. Here is how they compare:

| Factor | **Self-Hosted Grid** | **BrowserStack** | **Sauce Labs** | **LambdaTest** |
|---|---|---|---|---|
| **Setup effort** | Medium (Docker/K8s required) | Low (SaaS, no infra) | Low (SaaS, no infra) | Low (SaaS, no infra) |
| **Monthly cost (50 parallel)** | \$200-500 (compute) | \$2,000-5,000 | \$2,000-5,000 | \$1,000-3,000 |
| **Scaling** | Manual or KEDA | Automatic | Automatic | Automatic |
| **Browser coverage** | Chrome, Firefox, Edge | 3,000+ combinations | 2,000+ combinations | 3,000+ combinations |
| **Maintenance** | You manage updates | Fully managed | Fully managed | Fully managed |
| **Data privacy** | Full control | Data leaves your network | Data leaves your network | Data leaves your network |
| **Latency** | Low (same network) | Higher (remote) | Higher (remote) | Higher (remote) |
| **Real mobile devices** | Not included | Included | Included | Included |
| **Custom browser versions** | Full control | Limited | Limited | Limited |

### When to Self-Host

Self-hosting makes sense when you need **data privacy** (regulated industries, financial services, healthcare), when your test volume is high enough that cloud costs exceed infrastructure costs, or when you need **low-latency access** to internal services that are not exposed to the internet.

### When to Use Cloud Providers

Cloud providers make sense when you need **broad browser/device coverage** without maintaining the infrastructure, when your team is small and does not have DevOps capacity to manage a Grid, or when you need **real mobile device testing** that is impractical to self-host.

Many teams use a **hybrid approach**: self-hosted Selenium Grid for the core browser tests that run on every commit, plus a cloud provider for weekly cross-browser sweeps covering older browser versions and mobile devices.

---

## Automate Selenium Testing with AI Agents

Setting up Selenium Grid infrastructure is only part of the equation. Writing effective, maintainable Selenium tests at scale requires deep framework expertise -- the kind of knowledge that AI coding agents can deliver when equipped with the right skills.

**QA Skills** provides purpose-built testing skills that teach your AI agent Selenium best practices, advanced patterns, and framework-specific idioms:

\`\`\`bash
npx @qaskills/cli add selenium-java
\`\`\`

This installs expert Selenium Java knowledge into your AI agent -- covering WebDriver patterns, Page Object Model, waits, element strategies, and Grid-aware test design. For advanced patterns including data-driven testing, custom annotations, and cross-browser configuration:

\`\`\`bash
npx @qaskills/cli add selenium-advance-pom
\`\`\`

Browse all available testing skills at [qaskills.sh/skills](/skills) or read the [getting started guide](/getting-started) to install your first skill in under a minute.

If you are evaluating whether to stay with Selenium or migrate to a newer framework, our [Selenium vs Playwright comparison](/blog/selenium-vs-playwright-2026) breaks down the architectural differences, performance benchmarks, and migration path.

---

## Frequently Asked Questions

### How much RAM does each Selenium Grid Node need?

Each Chrome or Firefox Node running a single browser session typically requires **1-2 GB of RAM**. The \`shm_size\` setting in Docker should be at least 2 GB to prevent browser crashes. For Nodes running multiple sessions (\`SE_NODE_MAX_SESSIONS > 1\`), multiply accordingly -- a Node running 3 Chrome sessions needs 4-6 GB of RAM. Always set Kubernetes resource limits to prevent a single runaway test from consuming all available memory on the host.

### Can I run Selenium Grid alongside Playwright tests?

Yes. Selenium Grid and Playwright are independent tools. Playwright does not use the WebDriver protocol and does not connect to Selenium Grid -- it uses its own browser management and parallelism. Many teams run Playwright for new tests while maintaining an existing Selenium Grid for legacy suites. Both can run simultaneously in CI/CD pipelines without conflict. If you are considering a gradual migration, our [Selenium vs Playwright guide](/blog/selenium-vs-playwright-2026) covers the strategy.

### How do I debug a test that only fails on the Grid but passes locally?

This is usually caused by one of three issues. First, **screen resolution differences** -- the Grid's default resolution may differ from your local machine, causing element visibility issues. Set \`SE_SCREEN_WIDTH\` and \`SE_SCREEN_HEIGHT\` to match your local setup. Second, **timing differences** -- the Grid introduces network latency between your test code and the browser. Add explicit waits for critical elements rather than relying on implicit timing. Third, **resource contention** -- if multiple tests share a Node, CPU and memory pressure can cause unexpected slowdowns. Reduce \`SE_NODE_MAX_SESSIONS\` or enable video recording to watch the test execution and identify where it diverges from local behavior.

### What is the maximum number of parallel sessions a single Docker host can support?

A typical machine with 16 cores and 32 GB of RAM can comfortably support **10-15 parallel Chrome sessions** or **12-18 parallel Firefox sessions** (Firefox is slightly lighter than Chrome). Beyond that, you will see degraded test performance and increased flakiness due to resource contention. For higher parallelism, either scale horizontally with multiple Docker hosts or move to Kubernetes where you can distribute Nodes across a cluster.

### Should I use Selenium Grid Standalone or Hub/Node mode?

**Standalone mode** bundles all Grid components into a single process and is ideal for local development, small CI runners, and teams running fewer than 10 parallel sessions. It requires zero configuration and starts in seconds. **Hub/Node mode** (or the fully distributed mode) separates components for independent scaling and is appropriate for production Grid deployments with 10+ parallel sessions, multiple browser types, or requirements for high availability. Start with Standalone and move to Hub/Node when you hit its limits.
`,
};
