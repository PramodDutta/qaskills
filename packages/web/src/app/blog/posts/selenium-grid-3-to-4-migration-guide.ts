import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Grid 3 to Grid 4 Migration Guide for 2026',
  description:
    'Migrate from Selenium Grid 3 to Grid 4 in 2026. New architecture, Docker setup, capabilities, observability, Kubernetes deploy, and rollout plan.',
  date: '2026-05-15',
  category: 'Migration',
  content: `
# Selenium Grid 3 to Grid 4 Migration Guide for 2026

Selenium Grid 4 reached GA in late 2021. Five years later, plenty of enterprise QA shops still run Grid 3 (or even Grid 2 patched with custom scripts) because the Grid is a piece of infrastructure that "just works" and migration is expensive. In 2026 staying on Grid 3 is increasingly painful: the architecture cannot natively use modern container orchestration, capability matching is rigid, and the JSON Wire Protocol that Grid 3 spoke is deprecated in favor of W3C WebDriver.

This guide is the migration playbook for SDETs and infrastructure engineers who maintain a real Selenium Grid 3 deployment and want to move to Grid 4. We cover the new architecture (Router, Distributor, Session Queue, Event Bus), Docker setup, capabilities format, observability with Prometheus, Kubernetes deployment, and the gotchas that bite teams in week one.

For broader QA infrastructure references, browse [the blog index](/blog). For test cloud integrations, see the [QA Skills directory](/skills).

## Why migrate from Grid 3 to Grid 4

Three big reasons. First, the architecture: Grid 4 splits responsibilities across components (Router, Distributor, Session Queue, Session Map, Event Bus, Node) which can run together (Standalone), distributed (Hub and Node), or fully distributed (each component on its own machine). This is a much better fit for Kubernetes and Docker Swarm than Grid 3's monolithic Hub.

Second, W3C WebDriver only. Grid 4 dropped the JSON Wire Protocol. This is a tax during migration but a gift afterward; W3C is the standard, every modern client speaks it, and capability matching is more predictable. Third, observability: Grid 4 exposes Prometheus metrics out of the box, and the new GraphQL endpoint exposes session state for tooling.

## Conceptual model

Grid 3 had two roles: Hub and Node. The Hub took test requests and routed them to a matching Node.

Grid 4 has five logical components:

| Component | Responsibility |
|---|---|
| Router | Entry point. Receives requests, dispatches to Distributor or Session Map. |
| Distributor | Finds a free Node matching the requested capabilities. |
| Session Queue | Holds pending requests when no Node is available. |
| Session Map | Tracks active sessions and their Node assignments. |
| Event Bus | Inter-component communication. |
| Node | Runs the browser. Same role as Grid 3 Node but speaks W3C only. |

You can run these all in one process (Standalone mode), split into Hub and Node (the closest analog to Grid 3), or fully decomposed for high-scale deployments.

## Capabilities: Desired to W3C

Grid 3 accepted desired capabilities like:

\`\`\`json
{
  "browserName": "chrome",
  "version": "100",
  "platform": "WINDOWS"
}
\`\`\`

Grid 4 requires W3C-compliant capabilities. The most visible change is the \`browserVersion\` and \`platformName\` keys, and vendor-prefixed capabilities (\`goog:chromeOptions\`, \`moz:firefoxOptions\`).

\`\`\`json
{
  "browserName": "chrome",
  "browserVersion": "120",
  "platformName": "windows",
  "goog:chromeOptions": {
    "args": ["--headless=new", "--disable-gpu"]
  }
}
\`\`\`

If your test code uses the old \`DesiredCapabilities\` Java API or its equivalents in other clients, update to the language-specific Options class (\`ChromeOptions\`, \`FirefoxOptions\`).

## Step-by-step migration plan

1. **Week 0** - Audit your Grid 3 deployment. Inventory Hubs, Nodes, capability matchers, plugins, and the client code that constructs capabilities.
2. **Week 1** - Stand up a parallel Grid 4 in Standalone mode for the smoke suite.
3. **Week 2** - Run the smoke suite against Grid 4. Fix W3C capability issues in client code.
4. **Weeks 3 to 4** - Scale Grid 4 to handle the full suite. Move from Standalone to Hub+Node.
5. **Week 5** - Switch traffic to Grid 4. Keep Grid 3 as a fallback for one sprint.
6. **Week 6** - Decommission Grid 3 infrastructure.

## Standalone mode (quickest start)

Standalone is the simplest deployment. One JAR, one command, everything in one JVM.

\`\`\`bash
java -jar selenium-server-4.x.jar standalone
\`\`\`

Tests connect to \`http://standalone-host:4444/wd/hub\` (or \`/\` in Grid 4; the \`/wd/hub\` path is preserved for backward compatibility).

## Hub and Node mode (closest to Grid 3)

This is the typical migration target. Run a Hub on one machine and one or more Nodes on others.

\`\`\`bash
# Hub
java -jar selenium-server-4.x.jar hub

# Node (on a separate host)
java -jar selenium-server-4.x.jar node --detect-drivers true --hub http://hub-host:4444
\`\`\`

The Node detects local drivers (chromedriver, geckodriver) and registers with the Hub.

## Docker setup

The official Docker images make Grid 4 deployment trivial. A \`docker-compose.yml\` for Hub + Chrome + Firefox + Edge nodes:

\`\`\`yaml
version: '3'
services:
  selenium-hub:
    image: selenium/hub:4.x
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"

  chrome:
    image: selenium/node-chrome:4.x
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4

  firefox:
    image: selenium/node-firefox:4.x
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443

  edge:
    image: selenium/node-edge:4.x
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
\`\`\`

\`docker compose up\` brings up the entire Grid. Tests connect to \`http://localhost:4444\`.

## Kubernetes (KEDA-based autoscaling)

For high-scale, ephemeral Grids, deploy on Kubernetes with KEDA driving the Node count from the Session Queue depth.

\`\`\`yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: selenium-chrome-scaler
spec:
  scaleTargetRef:
    name: selenium-node-chrome
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
    - type: selenium-grid
      metadata:
        url: 'http://selenium-hub.selenium:4444/graphql'
        browserName: 'chrome'
\`\`\`

KEDA polls the Grid 4 GraphQL endpoint, sees pending sessions, and spins up new Chrome Node pods. Nodes auto-deregister on graceful shutdown. This is one of the biggest practical wins of Grid 4 over Grid 3.

## Before and after: capabilities in code

**Grid 3 client code (Java)**

\`\`\`java
DesiredCapabilities caps = new DesiredCapabilities();
caps.setBrowserName("chrome");
caps.setVersion("100");
caps.setPlatform(Platform.LINUX);
WebDriver driver = new RemoteWebDriver(new URL("http://grid3:4444/wd/hub"), caps);
\`\`\`

**Grid 4 client code (Java)**

\`\`\`java
ChromeOptions options = new ChromeOptions();
options.setBrowserVersion("120");
options.setPlatformName("linux");
options.addArguments("--headless=new", "--disable-gpu");
WebDriver driver = new RemoteWebDriver(new URL("http://grid4:4444"), options);
\`\`\`

The \`DesiredCapabilities\` class still exists for compatibility but is deprecated. Modern clients should use the Options classes.

## Observability

Grid 4 exposes Prometheus metrics at \`/status\` and \`/wd/hub/status\`. To wire up Prometheus:

\`\`\`yaml
scrape_configs:
  - job_name: 'selenium-grid'
    metrics_path: /status
    static_configs:
      - targets: ['selenium-hub:4444']
\`\`\`

The GraphQL endpoint at \`/graphql\` lets you query session state, capacity, and pending requests programmatically. This is also what KEDA uses for autoscaling.

## Cloud provider migration

If you use SauceLabs, BrowserStack, or LambdaTest as a Grid 3 endpoint, the Grid 4 endpoint differs.

| Provider | Grid 3 endpoint | Grid 4 endpoint |
|---|---|---|
| SauceLabs | \`https://ondemand.saucelabs.com:443/wd/hub\` | Same URL, W3C caps |
| BrowserStack | \`https://hub.browserstack.com/wd/hub\` | Same URL, W3C caps |
| LambdaTest | \`https://hub.lambdatest.com/wd/hub\` | Same URL, W3C caps |

The endpoint URL often does not change; the capabilities format does.

## Gotchas and breaking changes

1. **JSON Wire Protocol is gone.** Any test code or driver using JSON Wire breaks.
2. **\`DesiredCapabilities\` deprecated.** Use language-specific Options classes.
3. **\`platform\` becomes \`platformName\` and is lowercase.** \`WINDOWS\` becomes \`windows\`.
4. **\`version\` becomes \`browserVersion\`.** Common typo.
5. **Vendor capabilities have prefixes.** \`chromeOptions\` becomes \`goog:chromeOptions\`.
6. **\`/wd/hub\` path is optional.** Both \`/wd/hub/session\` and \`/session\` work.
7. **Nodes use the Event Bus, not direct registration.** Configure SE_EVENT_BUS_HOST.
8. **\`grid-extras\` and other plugins do not transfer.** Check Grid 4 alternatives.
9. **Custom matchers (\`platform.json\`) become \`relax-checks\` flag or capability slots.** Different model.
10. **Logging changed.** Grid 4 uses Logback. Update log configs.

## Migration checklist

- [ ] Audit Grid 3 deployment, capability matchers, and client code.
- [ ] Stand up a parallel Grid 4 in Standalone mode.
- [ ] Run the smoke suite; fix W3C capability issues.
- [ ] Move to Hub + Node mode for scale.
- [ ] Containerize Nodes with the official Docker images.
- [ ] If on Kubernetes, configure KEDA autoscaling on Session Queue depth.
- [ ] Wire Prometheus metrics for observability.
- [ ] Update cloud provider integrations to W3C caps.
- [ ] Cut traffic to Grid 4; keep Grid 3 as fallback for one sprint.
- [ ] Decommission Grid 3 infrastructure.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

Hard to argue against migration in 2026. Grid 3 is in maintenance mode. The closest thing to a reason to stay is a heavy dependency on a Grid 3-only plugin with no Grid 4 equivalent; that is rare. Even then, you should consider whether Playwright's project model (no Grid needed) is a better target.

## Conclusion and next steps

Selenium Grid 4 is a significant improvement on Grid 3: better architecture, native Kubernetes support, W3C-only, observability built in. The migration is mostly mechanical for client code and primarily infrastructural for the Grid itself. A two-person team can complete the migration for a medium deployment in four to six weeks.

Start with a parallel Standalone Grid for the smoke suite. Move to Hub + Node when capabilities are clean. Scale with Docker or Kubernetes once stable. Decommission Grid 3 after a sprint of green Grid 4 runs.

Next read: explore the [QA Skills directory](/skills) for Selenium and Playwright skills, and the [blog index](/blog) for cross-browser testing and CI guides.
`,
};
