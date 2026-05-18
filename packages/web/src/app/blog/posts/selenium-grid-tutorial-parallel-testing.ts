import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Grid Tutorial: Parallel Testing with Docker and Kubernetes',
  description:
    'Complete Selenium Grid tutorial covering Grid 4 architecture, Docker setup, docker-compose configuration, Kubernetes deployment, dynamic scaling, video recording, cross-browser matrix, and CI/CD integration.',
  date: '2026-05-18',
  category: 'Tutorial',
  content: `
Running your entire Selenium test suite on a single machine is the simplest setup, but it becomes a serious bottleneck as your test count grows. A suite of 500 browser tests that takes 45 minutes on one machine can finish in under five minutes when distributed across a Selenium Grid with Docker containers. This tutorial walks you through building a production-grade Selenium Grid from scratch -- from understanding the Grid 4 architecture to deploying on Kubernetes with auto-scaling.

You will learn how Selenium Grid 4 works internally, set up a local grid with docker-compose, configure parallel test execution across Chrome, Firefox, and Edge, enable video recording for debugging, build a cross-browser testing matrix, deploy on Kubernetes with dynamic scaling using KEDA, and integrate everything into your CI/CD pipeline.

---

## Key Takeaways

- **Selenium Grid 4** is a complete redesign from Grid 3, introducing a microservices architecture with Router, Distributor, Session Map, Session Queue, Node, and Event Bus components
- **Docker Compose** provides the fastest path to a working Selenium Grid -- a single \`docker compose up\` command launches hub and browser nodes with configurable concurrency
- **Dynamic Grid mode** automatically creates and destroys Docker containers per test session, guaranteeing clean browser state and eliminating idle resource waste
- **Video recording** is built into Selenium's official Docker images, capturing full test execution videos without additional tooling
- **Kubernetes with KEDA** enables auto-scaling Grid nodes based on the session queue length, handling burst test loads without manual capacity planning
- **Cross-browser testing matrices** in CI/CD pipelines distribute tests across Chrome, Firefox, and Edge simultaneously, providing comprehensive browser coverage
- **The Grid 4 dashboard** provides real-time visibility into active sessions, queued requests, and node health

---

## Understanding Selenium Grid 4 Architecture

Selenium Grid 4 replaced the monolithic Hub/Node model of Grid 3 with a set of discrete components that can be deployed independently.

### Grid 3: The Old Model

In Selenium Grid 3, a single **Hub** process accepted WebDriver session requests and routed them to registered **Nodes**. The Hub maintained a registry of available Nodes and matched incoming requests to Nodes based on browser capabilities. This was simple but limited:

- The Hub was a single point of failure
- All traffic flowed through the Hub, creating a bottleneck
- Session management was basic
- No built-in observability or queuing

### Grid 4: The New Architecture

Grid 4 decomposes the Hub into five distinct components:

| Component | Responsibility |
|---|---|
| **Router** | Entry point for all WebDriver requests. Routes to the correct internal component based on the request type |
| **Distributor** | Accepts new session requests and assigns them to available Nodes based on capabilities matching |
| **Session Map** | Maintains a mapping of active session IDs to the Node handling each session |
| **Session Queue** | Holds pending session requests when no matching Node is immediately available. Supports timeouts and request ordering |
| **Node** | Runs actual browser instances and executes WebDriver commands against them |
| **Event Bus** | Internal communication backbone connecting all components |

In standalone mode, all components run in a single process -- this is the simplest deployment for local development. In distributed mode, each component runs as its own process or container, enabling independent scaling.

### How a Test Request Flows Through Grid 4

1. Your test sends a new session request (\`POST /session\`) to the **Router**
2. The Router forwards the request to the **Distributor**
3. The Distributor checks available **Nodes** for a match against the requested capabilities (browser, version, platform)
4. If a matching Node with available capacity exists, the Distributor creates a session on that Node and returns the session ID
5. If no match is available, the request enters the **Session Queue** and waits
6. The session ID is registered in the **Session Map** so subsequent commands route directly to the correct Node
7. All subsequent WebDriver commands (\`GET /session/{id}/url\`, etc.) go through the Router, which uses the Session Map to forward them to the right Node
8. When the test calls \`driver.quit()\`, the session is removed from the Session Map and the Node slot becomes available

---

## Setting Up Selenium Grid with Docker Compose

Docker Compose is the fastest way to get a working Selenium Grid.

### Basic Hub and Node Setup

Create a \`docker-compose.yml\` file:

\`\`\`yaml
version: '3.8'

services:
  selenium-hub:
    image: selenium/hub:4.21.0
    container_name: selenium-hub
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"
    environment:
      - SE_NODE_MAX_SESSIONS=5
      - SE_NODE_OVERRIDE_MAX_SESSIONS=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4444/wd/hub/status"]
      interval: 15s
      timeout: 5s
      retries: 5

  chrome:
    image: selenium/node-chrome:4.21.0
    depends_on:
      selenium-hub:
        condition: service_healthy
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
      - SE_NODE_OVERRIDE_MAX_SESSIONS=true
    shm_size: '2g'

  firefox:
    image: selenium/node-firefox:4.21.0
    depends_on:
      selenium-hub:
        condition: service_healthy
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: '2g'

  edge:
    image: selenium/node-edge:4.21.0
    depends_on:
      selenium-hub:
        condition: service_healthy
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: '2g'
\`\`\`

Start the grid:

\`\`\`bash
docker compose up -d
\`\`\`

Open the Selenium Grid dashboard at \`http://localhost:4444\` to see your hub and registered nodes.

### Scaling Nodes

Scale Chrome nodes for more parallel capacity:

\`\`\`bash
docker compose up -d --scale chrome=5
\`\`\`

This launches five Chrome node containers, each with four concurrent sessions, giving you 20 parallel Chrome sessions.

### Important Configuration Options

| Environment Variable | Purpose | Default |
|---|---|---|
| \`SE_NODE_MAX_SESSIONS\` | Maximum concurrent sessions per node | 1 |
| \`SE_NODE_OVERRIDE_MAX_SESSIONS\` | Allow overriding the max sessions limit | false |
| \`SE_SESSION_REQUEST_TIMEOUT\` | Timeout for queued session requests (seconds) | 300 |
| \`SE_SESSION_RETRY_INTERVAL\` | Retry interval for queued sessions (seconds) | 5 |
| \`SE_NODE_SESSION_TIMEOUT\` | Timeout for idle sessions (seconds) | 300 |
| \`SE_SCREEN_WIDTH\` | Browser screen width | 1920 |
| \`SE_SCREEN_HEIGHT\` | Browser screen height | 1080 |
| \`SE_VNC_NO_PASSWORD\` | Disable VNC password requirement | false |

The \`shm_size: '2g'\` setting is critical. Chrome uses \`/dev/shm\` for shared memory, and the default Docker allocation of 64MB causes browser crashes during heavy page loads.

---

## Video Recording

Selenium's Docker images include video recording containers that capture the entire browser session as an MP4 file.

### Adding Video Recording

\`\`\`yaml
version: '3.8'

services:
  selenium-hub:
    image: selenium/hub:4.21.0
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"

  chrome:
    image: selenium/node-chrome:4.21.0
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
    shm_size: '2g'

  chrome-video:
    image: selenium/video:ffmpeg-7.0-20240517
    depends_on:
      - chrome
    volumes:
      - ./recordings:/videos
    environment:
      - DISPLAY_CONTAINER_NAME=chrome
      - SE_VIDEO_FILE_NAME=auto
      - SE_VIDEO_UPLOAD_ENABLED=false
\`\`\`

After running tests, the \`./recordings\` directory contains MP4 files named by session ID. This is invaluable for debugging failures in CI/CD where you cannot watch the browser live.

### VNC Access for Live Debugging

The debug images include a VNC server:

\`\`\`yaml
  chrome-debug:
    image: selenium/node-chrome:4.21.0
    depends_on:
      - selenium-hub
    ports:
      - "7900:7900"
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_VNC_NO_PASSWORD=true
    shm_size: '2g'
\`\`\`

Connect to \`http://localhost:7900\` with noVNC in your browser to watch tests execute in real time.

---

## Dynamic Grid

Dynamic Grid automatically creates and destroys Docker containers per test session. Instead of pre-provisioning nodes, the Grid spins up a fresh container when a session is requested and tears it down when the session ends.

### Configuration

\`\`\`yaml
version: '3.8'

services:
  selenium-hub:
    image: selenium/hub:4.21.0
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"
    volumes:
      - ./config/dynamic-grid.toml:/opt/selenium/config.toml
      - /var/run/docker.sock:/var/run/docker.sock
\`\`\`

Create \`config/dynamic-grid.toml\`:

\`\`\`toml
[docker]
url = "unix:///var/run/docker.sock"
video-image = "selenium/video:ffmpeg-7.0-20240517"
configs = [
    "chrome", "{\\\"browserName\\\": \\\"chrome\\\"}", "selenium/node-chrome:4.21.0",
    "firefox", "{\\\"browserName\\\": \\\"firefox\\\"}", "selenium/node-firefox:4.21.0",
    "edge", "{\\\"browserName\\\": \\\"MicrosoftEdge\\\"}", "selenium/node-edge:4.21.0"
]
\`\`\`

### Benefits of Dynamic Grid

- **Clean state guarantee**: Every test gets a fresh container with no leftover cookies, cache, or state from previous tests
- **Resource efficiency**: Containers exist only during active sessions -- no idle nodes consuming resources
- **Automatic browser version management**: Update the image tag to get a new browser version
- **Video recording per session**: Each container can record its session independently

---

## Connecting Tests to the Grid

### Java with Selenium WebDriver

\`\`\`java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import java.net.URL;

public class GridTest {
    private WebDriver driver;

    @BeforeEach
    void setUp() throws Exception {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--no-sandbox", "--disable-dev-shm-usage");

        driver = new RemoteWebDriver(
            new URL("http://localhost:4444/wd/hub"),
            options
        );
    }

    @Test
    void shouldLoadHomePage() {
        driver.get("https://example.com");
        assertEquals("Example Domain", driver.getTitle());
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
\`\`\`

### Python with pytest

\`\`\`python
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Remote(
        command_executor="http://localhost:4444/wd/hub",
        options=options
    )
    yield driver
    driver.quit()

def test_homepage(driver):
    driver.get("https://example.com")
    assert "Example Domain" in driver.title
\`\`\`

### TypeScript with WebDriverIO

\`\`\`typescript
// wdio.conf.ts
export const config = {
  hostname: 'localhost',
  port: 4444,
  path: '/wd/hub',
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  }],
  framework: 'mocha',
  specs: ['./test/**/*.ts'],
};
\`\`\`

### Playwright with Selenium Grid

Playwright can connect to Selenium Grid using the \`selenium\` channel:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('connect to Selenium Grid', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://example.com');
  await expect(page).toHaveTitle('Example Domain');
  await context.close();
});
\`\`\`

Configure in \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    connectOptions: {
      wsEndpoint: 'ws://localhost:4444',
    },
  },
});
\`\`\`

---

## Parallel Test Execution

Running tests in parallel against a Selenium Grid requires configuration at the test runner level.

### Java with TestNG Parallel Suites

\`\`\`xml
<!-- testng.xml -->
<suite name="Parallel Tests" parallel="methods" thread-count="10">
    <test name="Cross Browser">
        <parameter name="browser" value="chrome"/>
        <classes>
            <class name="com.example.tests.LoginTest"/>
            <class name="com.example.tests.CheckoutTest"/>
            <class name="com.example.tests.SearchTest"/>
        </classes>
    </test>
</suite>
\`\`\`

\`\`\`java
public class BaseTest {
    private static final ThreadLocal<WebDriver> driverThread = new ThreadLocal<>();

    @BeforeMethod
    @Parameters("browser")
    public void setUp(String browser) throws Exception {
        MutableCapabilities options;
        switch (browser) {
            case "firefox":
                options = new FirefoxOptions();
                break;
            case "edge":
                options = new EdgeOptions();
                break;
            default:
                ChromeOptions chromeOptions = new ChromeOptions();
                chromeOptions.addArguments("--no-sandbox");
                options = chromeOptions;
        }

        WebDriver driver = new RemoteWebDriver(
            new URL("http://localhost:4444/wd/hub"),
            options
        );
        driverThread.set(driver);
    }

    protected WebDriver getDriver() {
        return driverThread.get();
    }

    @AfterMethod
    public void tearDown() {
        WebDriver driver = driverThread.get();
        if (driver != null) {
            driver.quit();
            driverThread.remove();
        }
    }
}
\`\`\`

Using \`ThreadLocal\` is essential -- it ensures each thread has its own WebDriver instance, preventing race conditions.

### Python with pytest-xdist

\`\`\`bash
pip install pytest-xdist

# Run 10 tests in parallel
pytest -n 10 --dist=loadscope
\`\`\`

### JUnit 5 Parallel Execution

\`\`\`properties
# junit-platform.properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=10
\`\`\`

---

## Cross-Browser Testing Matrix

A cross-browser matrix tests your application across multiple browser and OS combinations.

### Docker Compose for Multi-Browser

\`\`\`yaml
version: '3.8'

services:
  hub:
    image: selenium/hub:4.21.0
    ports:
      - "4444:4444"

  chrome-latest:
    image: selenium/node-chrome:4.21.0
    depends_on: [hub]
    environment:
      - SE_EVENT_BUS_HOST=hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: '2g'

  firefox-latest:
    image: selenium/node-firefox:4.21.0
    depends_on: [hub]
    environment:
      - SE_EVENT_BUS_HOST=hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: '2g'

  edge-latest:
    image: selenium/node-edge:4.21.0
    depends_on: [hub]
    environment:
      - SE_EVENT_BUS_HOST=hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: '2g'
\`\`\`

### Test Runner Configuration for Matrix

\`\`\`java
@ParameterizedTest
@ValueSource(strings = {"chrome", "firefox", "MicrosoftEdge"})
void shouldLoadDashboardInAllBrowsers(String browserName) throws Exception {
    MutableCapabilities caps = new MutableCapabilities();
    caps.setCapability("browserName", browserName);

    WebDriver driver = new RemoteWebDriver(
        new URL("http://localhost:4444/wd/hub"),
        caps
    );

    try {
        driver.get("https://app.example.com/dashboard");
        // Assertions
        assertTrue(driver.getTitle().contains("Dashboard"));
    } finally {
        driver.quit();
    }
}
\`\`\`

---

## Kubernetes Deployment

For production-grade infrastructure, deploy Selenium Grid on Kubernetes with auto-scaling.

### Basic Kubernetes Deployment

\`\`\`yaml
# selenium-hub-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: selenium-hub
  labels:
    app: selenium-hub
spec:
  replicas: 1
  selector:
    matchLabels:
      app: selenium-hub
  template:
    metadata:
      labels:
        app: selenium-hub
    spec:
      containers:
        - name: selenium-hub
          image: selenium/hub:4.21.0
          ports:
            - containerPort: 4442
            - containerPort: 4443
            - containerPort: 4444
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          readinessProbe:
            httpGet:
              path: /wd/hub/status
              port: 4444
            initialDelaySeconds: 10
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: selenium-hub
spec:
  type: ClusterIP
  selector:
    app: selenium-hub
  ports:
    - name: publish
      port: 4442
      targetPort: 4442
    - name: subscribe
      port: 4443
      targetPort: 4443
    - name: web
      port: 4444
      targetPort: 4444
\`\`\`

### Chrome Node Deployment

\`\`\`yaml
# chrome-node-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: selenium-chrome
  labels:
    app: selenium-chrome
spec:
  replicas: 3
  selector:
    matchLabels:
      app: selenium-chrome
  template:
    metadata:
      labels:
        app: selenium-chrome
    spec:
      containers:
        - name: selenium-chrome
          image: selenium/node-chrome:4.21.0
          env:
            - name: SE_EVENT_BUS_HOST
              value: "selenium-hub"
            - name: SE_EVENT_BUS_PUBLISH_PORT
              value: "4442"
            - name: SE_EVENT_BUS_SUBSCRIBE_PORT
              value: "4443"
            - name: SE_NODE_MAX_SESSIONS
              value: "4"
            - name: SE_NODE_OVERRIDE_MAX_SESSIONS
              value: "true"
          resources:
            requests:
              memory: "1Gi"
              cpu: "1000m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          volumeMounts:
            - name: dshm
              mountPath: /dev/shm
      volumes:
        - name: dshm
          emptyDir:
            medium: Memory
            sizeLimit: 2Gi
\`\`\`

The \`emptyDir\` volume with \`medium: Memory\` provides the shared memory Chrome needs without hitting the default container limit.

### Auto-Scaling with KEDA

KEDA (Kubernetes Event-Driven Autoscaler) scales nodes based on the Selenium Grid session queue:

\`\`\`yaml
# keda-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-chrome-scaler
spec:
  scaleTargetRef:
    name: selenium-chrome
  minReplicaCount: 1
  maxReplicaCount: 20
  pollingInterval: 10
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub:4444/graphql'
        browserName: 'chrome'
        sessionBrowserName: 'chrome'
        activationThreshold: '1'
\`\`\`

When tests are queued waiting for Chrome sessions, KEDA scales up Chrome node pods. When the queue drains, it scales back down to the minimum. This handles burst test loads without maintaining idle infrastructure.

---

## Grid Dashboard and Monitoring

### Built-in Grid UI

Selenium Grid 4 includes a web-based dashboard at \`http://<hub-host>:4444/ui\`. The dashboard shows:

- **Active sessions** -- which browsers are in use and their session IDs
- **Available nodes** -- registered nodes, their capabilities, and available slots
- - **Session queue** -- pending requests waiting for available nodes
- **Grid configuration** -- component topology and configuration

### Monitoring with Prometheus and Grafana

Grid 4 exposes metrics that can be scraped by Prometheus:

\`\`\`yaml
# prometheus-config.yaml
scrape_configs:
  - job_name: 'selenium-grid'
    metrics_path: '/wd/hub/status'
    static_configs:
      - targets: ['selenium-hub:4444']
\`\`\`

Key metrics to monitor:

- **Active sessions** -- how many browsers are running
- **Queue length** -- how many tests are waiting
- **Node health** -- which nodes are connected and responsive
- **Session duration** -- how long individual tests run
- **Session creation latency** -- time from request to session start

Set up Grafana dashboards to visualize these metrics and alert on anomalies like queue length spikes or node disconnections.

---

## CI/CD Integration

### GitHub Actions with Selenium Grid

\`\`\`yaml
name: Selenium Grid Tests

on:
  pull_request:
    branches: [main]

jobs:
  selenium-tests:
    runs-on: ubuntu-latest
    services:
      selenium-hub:
        image: selenium/hub:4.21.0
        ports:
          - 4444:4444
          - 4442:4442
          - 4443:4443
      chrome-node:
        image: selenium/node-chrome:4.21.0
        env:
          SE_EVENT_BUS_HOST: selenium-hub
          SE_EVENT_BUS_PUBLISH_PORT: 4442
          SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
          SE_NODE_MAX_SESSIONS: 4
        options: --shm-size="2g"

    steps:
      - uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Wait for Grid
        run: |
          timeout 30 bash -c 'until curl -s http://localhost:4444/wd/hub/status | grep -q "ready"; do sleep 2; done'

      - name: Run tests
        run: mvn test -Dselenium.grid.url=http://localhost:4444/wd/hub -Dparallel.threads=8

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: target/surefire-reports/
\`\`\`

### GitLab CI with Docker Compose

\`\`\`yaml
selenium-tests:
  stage: test
  image: maven:3.9-eclipse-temurin-21
  services:
    - name: docker:dind
      alias: docker
  variables:
    DOCKER_HOST: tcp://docker:2375
  before_script:
    - apt-get update && apt-get install -y docker-compose-plugin curl
    - docker compose -f docker-compose.grid.yml up -d
    - timeout 60 bash -c 'until curl -s http://docker:4444/wd/hub/status | grep -q "ready"; do sleep 3; done'
  script:
    - mvn test -Dselenium.grid.url=http://docker:4444/wd/hub
  after_script:
    - docker compose -f docker-compose.grid.yml down
  artifacts:
    when: always
    reports:
      junit: target/surefire-reports/*.xml
\`\`\`

---

## Self-Hosted Grid vs Cloud Providers

| Factor | Self-Hosted (Docker/K8s) | Cloud (BrowserStack/Sauce Labs/LambdaTest) |
|---|---|---|
| **Cost** | Infrastructure + maintenance time | Per-minute pricing, higher at scale |
| **Setup** | Significant initial investment | Minutes to first test |
| **Browser coverage** | Limited to what you configure | Hundreds of browser/OS combinations |
| **Real devices** | Not supported | Mobile real-device testing available |
| **Control** | Full control over configuration | Vendor-controlled environment |
| **Scalability** | Requires Kubernetes or similar | Infinite scaling by default |
| **Network** | Tests run inside your network | May need tunnels for internal apps |
| **Debugging** | Full access to containers and logs | Vendor-provided dashboards and videos |

For most teams, a hybrid approach works best: self-hosted grid for fast feedback on core browsers (Chrome, Firefox) in CI/CD, and cloud providers for extended cross-browser and mobile device coverage before releases.

---

## Troubleshooting Common Issues

### Chrome Crashes with "Session not created"

This almost always means insufficient shared memory. Ensure:

\`\`\`yaml
shm_size: '2g'
# or in Kubernetes:
volumes:
  - name: dshm
    emptyDir:
      medium: Memory
      sizeLimit: 2Gi
\`\`\`

### Tests Time Out Waiting for Sessions

Check the session queue and node capacity:

\`\`\`bash
curl http://localhost:4444/status | jq '.value.nodes[] | {uri, slots: (.slots | length), available: [.slots[] | select(.session == null)] | length}'
\`\`\`

If all slots are occupied, either scale up nodes or reduce parallel test count.

### "Connection refused" to Grid URL

Ensure the Grid is fully ready before running tests. In CI/CD, add a readiness check:

\`\`\`bash
timeout 60 bash -c 'until curl -sf http://localhost:4444/wd/hub/status | jq -e ".value.ready == true" > /dev/null 2>&1; do sleep 2; done'
\`\`\`

### Stale Sessions Blocking Slots

Configure session timeouts to reclaim abandoned sessions:

\`\`\`yaml
environment:
  - SE_NODE_SESSION_TIMEOUT=120
  - SE_SESSION_REQUEST_TIMEOUT=300
\`\`\`

---

## Best Practices

1. **Always use \`shm_size\` or shared memory volumes** -- Chrome and Firefox need more than Docker's default 64MB
2. **Set session timeouts** -- prevent zombie sessions from blocking slots
3. **Use health checks** -- ensure the Grid is ready before sending test requests
4. **Scale nodes, not sessions per node** -- more nodes with fewer sessions each is more stable than fewer nodes with many sessions
5. **Record videos in CI/CD** -- failure videos save hours of debugging
6. **Tag tests by browser** -- run cross-browser matrix only when needed, not on every commit
7. **Monitor queue length** -- persistent queues indicate capacity issues
8. **Use dynamic grid for clean state** -- eliminates a whole class of flaky tests caused by leftover browser state
9. **Pin image versions** -- do not use \`latest\` tags in CI/CD. Pin to specific versions for reproducibility
10. **Clean up after runs** -- \`docker compose down -v\` removes volumes and prevents disk space issues

---

## Conclusion

Selenium Grid with Docker transforms test execution from a sequential bottleneck into a parallel pipeline. The Grid 4 architecture gives you fine-grained control over session management and scaling. Docker Compose provides a fast local setup. Kubernetes with KEDA enables production-grade auto-scaling. Video recording and VNC support make debugging failures straightforward.

Start with a simple docker-compose setup on your local machine. Connect your existing test suite using Remote WebDriver. Scale Chrome nodes to match your parallel test count. Add video recording for CI/CD runs. When you outgrow Docker Compose, move to Kubernetes with KEDA auto-scaling. The investment in grid infrastructure pays for itself every time a developer gets test results in five minutes instead of forty-five.
`,
};
