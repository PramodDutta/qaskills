import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Grid 4 Docker and Kubernetes Complete Guide 2026',
  description:
    'Master Selenium Grid 4 with Docker Compose and Kubernetes Helm charts. Cover hubs, nodes, dynamic sessions, video recording, KEDA autoscaling, and CI patterns.',
  date: '2026-05-11',
  category: 'Reference',
  content: `
# Selenium Grid 4 Docker and Kubernetes Complete Guide 2026

Selenium Grid 4 is the distributed Selenium runtime: a coordinator (formerly called the hub) plus a set of nodes that host browsers. Tests connect to the coordinator endpoint, the coordinator selects an available node with the requested browser, and the test runs there. This pattern lets you run hundreds of parallel browser tests against a fixed pool of node containers, scale that pool horizontally on Docker hosts or Kubernetes, and isolate every test in its own browser process.

This guide covers Selenium Grid 4 end-to-end in 2026. We walk through the new modular architecture (Standalone, Hub-Node, Distributed, Fully Distributed), Docker Compose setups for local development, Kubernetes deployment with the Selenium Helm chart, browser node configuration, dynamic grids that spawn nodes per session, video recording, KEDA-based autoscaling, BiDi over WebSocket, and CI integration patterns. We compare to alternatives like Selenoid, Moon, and BrowserStack Automate. For more on protocols see [Selenium BiDi protocol guide](/blog/selenium-bidirectional-bidi-protocol-guide) and [Selenium Manager](/blog/selenium-manager-browser-driver-2026), and browse the [skills directory](/skills).

## Why Grid 4

Three reasons. First, parallelism. Modern test suites have hundreds or thousands of cases. Running them sequentially takes hours; running them in parallel against Grid takes minutes. Second, browser version coverage. Grid lets you maintain a pool with Chrome 122, 123, 124, Firefox latest, Safari, and Edge simultaneously. Each test requests the browser-version combo it needs. Third, isolation. Each test gets its own clean browser process. State leaks between tests disappear because the browser is killed after each session.

Selenium Grid 4 made significant improvements over Grid 3: a redesigned coordinator architecture, BiDi over WebSocket support, Observability via OpenTelemetry, and Helm-friendly deployment. Migration from Grid 3 is mostly mechanical but worth doing now if you have not.

| Component | Role |
|---|---|
| Coordinator (Hub) | Routes new sessions to nodes |
| Distributor | Selects which node gets a new session |
| Router | Forwards commands to the right session |
| Session Queue | Holds requests when all nodes are busy |
| Event Bus | Internal messaging between components |
| Node | Hosts browsers, registers with coordinator |
| Session Map | Tracks active sessions |

## Deployment Modes

Grid 4 supports four deployment modes:

1. **Standalone.** All components in one process. Good for local dev or tiny teams.
2. **Hub and Node.** Classic Grid 3 layout. Coordinator runs everything except browsers.
3. **Distributed.** Each component runs as a separate process. For larger scale.
4. **Fully Distributed with Kubernetes.** Each component as a Pod. Production scale.

Most teams start with Standalone, graduate to Hub-Node as test counts grow, then move to Kubernetes when they need autoscaling.

## Docker Compose: Hub and Nodes

The simplest production-ready setup is Hub and Node via Docker Compose. The Selenium project publishes official images that handle most of the complexity.

\`\`\`yaml
# docker-compose.yml
version: '3.8'

services:
  selenium-hub:
    image: selenium/hub:4.27.0
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"
    environment:
      - GRID_MAX_SESSION=50
      - GRID_BROWSER_TIMEOUT=300

  chrome:
    image: selenium/node-chrome:4.27.0
    shm_size: 2gb
    deploy:
      replicas: 5
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=5
      - SE_NODE_SESSION_TIMEOUT=300

  firefox:
    image: selenium/node-firefox:4.27.0
    shm_size: 2gb
    deploy:
      replicas: 3
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443

  edge:
    image: selenium/node-edge:4.27.0
    shm_size: 2gb
    deploy:
      replicas: 2
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
\`\`\`

Spin up:

\`\`\`bash
docker compose up --scale chrome=5 --scale firefox=3
# Then open http://localhost:4444 to see the Grid UI
\`\`\`

This gives you 5 Chrome nodes, 3 Firefox nodes, 2 Edge nodes, each with 5 sessions. Total parallel browser sessions: 50 (5 nodes * 5 sessions Chrome) + 15 + 10 = 75.

\`shm_size: 2gb\` matters. Without it Chrome crashes from /dev/shm exhaustion in headless mode.

## Connecting Tests

Tests connect to \`http://localhost:4444\` (or your remote Grid coordinator URL) using RemoteWebDriver. Capabilities specify which browser and platform you want.

\`\`\`java
// Java with TestNG
ChromeOptions options = new ChromeOptions();
options.setCapability("browserVersion", "122");
options.setCapability("platformName", "linux");
options.setCapability("se:name", "Login test " + testName);
options.setCapability("se:recordVideo", true);
options.setCapability("se:screenResolution", "1920x1080");

WebDriver driver = new RemoteWebDriver(
  new URL("http://grid.example.com:4444/wd/hub"),
  options
);
driver.get("https://staging.example.com");
\`\`\`

\`\`\`python
# Python with pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.set_capability("browserVersion", "122")
options.set_capability("se:name", "Checkout test")
options.set_capability("se:recordVideo", True)

driver = webdriver.Remote(
    command_executor="http://grid.example.com:4444/wd/hub",
    options=options,
)
driver.get("https://staging.example.com")
\`\`\`

\`se:name\` shows up in the Grid UI for live debugging. \`se:recordVideo\` enables video capture if the video node is running.

## Kubernetes Deployment

For production scale, deploy Grid to Kubernetes using the official Helm chart.

\`\`\`bash
helm repo add docker-selenium https://www.selenium.dev/docker-selenium
helm repo update

# Install with defaults
helm install grid docker-selenium/selenium-grid \\
  --namespace selenium-grid --create-namespace
\`\`\`

The chart deploys all Grid components as separate Deployments. Default resource limits are modest. For real workloads override via values.yaml:

\`\`\`yaml
# values.yaml
isolateComponents: true
ingress:
  enabled: true
  hostname: grid.example.com

basicAuth:
  enabled: true
  username: \${{ secrets.GRID_USER }}
  password: \${{ secrets.GRID_PASS }}

chromeNode:
  replicas: 10
  hpa:
    enabled: true
    minReplicas: 2
    maxReplicas: 50
    targetCPU: 70
  resources:
    requests:
      cpu: 1
      memory: 2Gi
    limits:
      cpu: 2
      memory: 4Gi

firefoxNode:
  replicas: 5
  resources:
    requests:
      cpu: 1
      memory: 2Gi

edgeNode:
  replicas: 3

videoRecorder:
  enabled: true

global:
  seleniumGrid:
    nodeMaxSessions: 4
    sessionRequestTimeout: 300
\`\`\`

Install with custom values:

\`\`\`bash
helm install grid docker-selenium/selenium-grid \\
  --namespace selenium-grid --create-namespace \\
  -f values.yaml
\`\`\`

This gives you 10 Chrome nodes with HPA scaling to 50, 5 Firefox, 3 Edge, with video recording enabled. The Ingress exposes the Grid endpoint with basic auth.

## KEDA Autoscaling

HPA scales on CPU, which doesn't always reflect actual demand for Grid sessions. KEDA (Kubernetes Event-Driven Autoscaling) can scale Grid nodes based on queue length: if there are pending session requests, spin up more nodes.

\`\`\`yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-chrome-scaler
  namespace: selenium-grid
spec:
  scaleTargetRef:
    name: selenium-chrome-node
  minReplicaCount: 2
  maxReplicaCount: 100
  pollingInterval: 10
  cooldownPeriod: 300
  triggers:
    - type: selenium-grid
      metadata:
        url: http://selenium-hub.selenium-grid.svc:4444/graphql
        browserName: chrome
        sessionsPerNode: 4
        activationThreshold: 1
\`\`\`

KEDA queries the Grid GraphQL endpoint, gets the count of pending sessions, and adjusts replicas accordingly. This scales much more cleanly than CPU-based HPA for browser workloads.

## Dynamic Grid

Selenium Grid 4 supports a "dynamic" mode where the coordinator pulls a Docker image and starts a fresh container per session. The container is destroyed after the session ends. This gives perfect isolation at the cost of slower per-session startup.

\`\`\`yaml
# config.toml on the node
[node]
detect-drivers = false

[docker]
configs = [
  "selenium/standalone-chrome:122.0", "{\\"browserName\\": \\"chrome\\", \\"browserVersion\\": \\"122\\"}",
  "selenium/standalone-firefox:latest", "{\\"browserName\\": \\"firefox\\"}",
  "selenium/standalone-edge:latest", "{\\"browserName\\": \\"MicrosoftEdge\\"}"
]
host-config-keys = ["Dns", "DnsOptions", "DnsSearch", "ExtraHosts"]

video-image = "selenium/video:latest"
assets-path = "/opt/selenium/assets"
\`\`\`

When the coordinator receives a session request for Chrome 122, it pulls the \`selenium/standalone-chrome:122.0\` image and runs it. After the session ends, the container exits. This is the model used by Selenoid and Moon as well.

## Video Recording

Grid 4 ships with a video recording sidecar. When you request \`se:recordVideo\` in capabilities, the node spins up a recording container that captures the browser's video output. The MP4 is written to a shared volume.

\`\`\`yaml
videoRecorder:
  enabled: true
  uploader:
    enabled: true
    name: aws-s3
    s3:
      bucket: my-selenium-videos
      region: us-east-1
      key: \${{ secrets.AWS_KEY }}
      secret: \${{ secrets.AWS_SECRET }}
\`\`\`

Configure the uploader to push completed videos to S3 (or Azure Blob, GCS). Videos are typically 1-10 MB per test and named by session ID for easy lookup when a test fails.

## BiDi Over WebSocket

Selenium Grid 4 supports BiDi (Bidirectional protocol) for WebDriver. This lets your test subscribe to browser events (console logs, network requests, JS errors) in real time.

\`\`\`javascript
// JavaScript with selenium-webdriver
const { Builder, By } = require('selenium-webdriver');

(async () => {
  const driver = await new Builder()
    .usingServer('http://grid.example.com:4444/wd/hub')
    .forBrowser('chrome')
    .build();

  const session = await driver.session();
  const bidiSocket = await driver.getBidi();

  // Subscribe to console logs
  await bidiSocket.subscribe('log.entryAdded');
  bidiSocket.on('log.entryAdded', (entry) => {
    console.log('Browser console:', entry.text);
  });

  await driver.get('https://example.com');
})();
\`\`\`

See [Selenium BiDi protocol guide](/blog/selenium-bidirectional-bidi-protocol-guide) for full coverage.

## Observability

Grid 4 emits OpenTelemetry spans and metrics. Pipe them into your existing observability stack:

\`\`\`yaml
# values.yaml
tracing:
  enabled: true
  exporter:
    type: otlp
    endpoint: http://otel-collector:4317

metrics:
  enabled: true
  exporter:
    prometheus:
      enabled: true
      port: 9090
\`\`\`

This gives you per-session traces, queue length metrics, and node CPU/memory metrics in your standard Grafana dashboards.

## CI Integration

Standard pattern with GitHub Actions:

\`\`\`yaml
name: Selenium Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      selenium-hub:
        image: selenium/hub:4.27.0
        ports: ['4444:4444', '4442:4442', '4443:4443']
      chrome-node:
        image: selenium/node-chrome:4.27.0
        env:
          SE_EVENT_BUS_HOST: selenium-hub
          SE_EVENT_BUS_PUBLISH_PORT: 4442
          SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
          SE_NODE_MAX_SESSIONS: 4
        options: --shm-size=2gb

    steps:
      - uses: actions/checkout@v4

      - name: Wait for Grid
        run: |
          until curl -sSL "http://localhost:4444/wd/hub/status" | jq -r '.value.ready' | grep "true"; do
            sleep 1
          done

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Run tests
        run: |
          mvn test -Dgrid.url=http://localhost:4444 -DforkCount=4
\`\`\`

For larger CI fleets, run a persistent Grid in your test cluster and have CI pipelines connect to it. This avoids the per-job Grid spin-up cost.

## Alternatives: Selenoid and Moon

For teams that find Grid 4 heavyweight, the Selenoid (open source) and Moon (commercial, Kubernetes-native) alternatives offer similar capabilities with a different architecture. They use per-session containers like Dynamic Grid by default.

| Tool | License | Strength |
|---|---|---|
| Selenium Grid 4 | Apache 2.0 | Official, BiDi support, Helm chart |
| Selenoid | Apache 2.0 | Faster startup, lightweight |
| Moon | Commercial | Kubernetes-native, scaling features |
| BrowserStack Automate | Commercial SaaS | No infrastructure |
| Sauce Labs | Commercial SaaS | No infrastructure |

## Common Issues

Five gotchas teams hit:

1. **shm_size too small.** Chrome crashes in headless. Set to 2gb minimum.
2. **Hostname resolution.** Nodes need to reach the coordinator hostname. In Kubernetes use Service names; in Docker Compose use container names.
3. **Browser version mismatch.** Tests requesting an unavailable browserVersion hang in the queue. Use platform-agnostic capabilities or pin to known-good versions.
4. **Session timeout.** Default 300s might be too short for long tests. Tune \`SE_NODE_SESSION_TIMEOUT\`.
5. **Network policies block GraphQL.** KEDA needs to query the Grid GraphQL endpoint. Ensure your NetworkPolicy allows it.

## Conclusion

Selenium Grid 4 is the right distributed Selenium runtime for teams in 2026. Helm-friendly deployment, BiDi over WebSocket, dynamic per-session containers, and KEDA autoscaling make it production-grade out of the box. Compared to commercial SaaS alternatives like BrowserStack and Sauce Labs, Grid gives you full control at a fraction of the cost when you have the operational capacity.

If you are starting from scratch, run the Docker Compose example above to learn the basics, then move to Kubernetes via Helm chart for production. Browse the [skills directory](/skills) for Selenium AI agent skills and read [Selenium Manager](/blog/selenium-manager-browser-driver-2026) for browser driver management.
`,
};
