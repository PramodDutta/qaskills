import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'NeoLoad Tricentis Performance Testing Guide 2026',
  description:
    'Master Tricentis NeoLoad in 2026. Cover the GUI designer, YAML as code, distributed runners, SAP and Citrix protocols, CI integration, and pricing tradeoffs.',
  date: '2026-05-08',
  category: 'Performance',
  content: `
# NeoLoad Tricentis Performance Testing Guide 2026

NeoLoad is the enterprise performance testing platform from Tricentis. It sits in the same market as BlazeMeter and LoadRunner: a commercial product with a GUI designer, distributed cloud-or-on-prem runners, integrations with enterprise systems like SAP, ServiceNow, Citrix, and Oracle, and a pricing model based on virtual users and infrastructure. For organizations with significant investment in non-HTTP protocols, where open-source tools like k6 and Locust either don't support the protocol or require heavy customization, NeoLoad pays off.

This guide covers NeoLoad in 2026. We walk through the design studio and YAML-as-code authoring, the runtime architecture with controllers and load generators, supported protocols, parameterization and correlation patterns, the integration with Tricentis Tosca for end-to-end testing, CI/CD with the NeoLoad Web API, the analysis dashboard, and how NeoLoad compares to LoadRunner and to open-source alternatives. Pricing and total cost of ownership get a section because for many teams it is the deciding factor. For comparisons see [JMeter vs Locust vs Gatling](/blog/jmeter-vs-locust-vs-gatling-comparison) and the [skills directory](/skills).

## Why NeoLoad

Three reasons enterprises pick NeoLoad. First, protocol breadth. NeoLoad has first-class support for SAP GUI, SAP Web, Citrix ICA, Oracle Forms, ServiceNow, Salesforce, and dozens of other enterprise protocols. If you need to load test a SAP HANA module, open-source tools cannot help; NeoLoad can. Second, enterprise integrations. NeoLoad integrates with Tricentis Tosca for shift-left and shift-right scenarios, with Jenkins and Azure DevOps for CI/CD, and with Splunk and Dynatrace for analytics correlation. Third, vendor support. When something breaks at 3 AM you call Tricentis support; with open source you debug yourself.

The trade-off is cost and lock-in. NeoLoad licenses are expensive (typically five figures per year per controller, plus per-VU charges for cloud runs). Test plans authored in NeoLoad cannot be easily moved to other tools. For teams without strong enterprise-protocol needs, the cost is hard to justify versus k6 or JMeter.

| Feature | NeoLoad | LoadRunner | k6 |
|---|---|---|---|
| GUI designer | Yes | Yes | No |
| Code authoring | YAML | C/JS | JavaScript |
| SAP support | Yes | Yes | Limited |
| Citrix support | Yes | Yes | No |
| Cloud runners | Yes | Yes | Yes |
| Cost | High | Very high | Free or paid SaaS |
| Vendor support | Yes | Yes | Community or commercial |

## Installing NeoLoad

NeoLoad is a desktop application plus optional cloud control plane. The Design Studio runs on Windows, macOS, or Linux. You install it from the Tricentis customer portal after obtaining a license.

\`\`\`bash
# After download from Tricentis portal
# macOS
hdiutil mount NeoLoad-9.5.0.dmg
sudo cp -R /Volumes/NeoLoad/NeoLoad.app /Applications/
sudo cp -R /Volumes/NeoLoad/NeoLoadController.app /Applications/

# Linux
tar -xzf NeoLoad-9.5.0-linux-x64.tar.gz -C /opt/
/opt/NeoLoad/bin/designStudio

# Windows: run the .exe installer
\`\`\`

Activate with your license file. The Design Studio is the primary authoring environment. The Controller runs tests. A separate Web Portal provides the dashboard and historical comparison.

## Designing a Test in the Studio

The studio offers two authoring modes: the visual designer with drag-and-drop, and YAML as code. Most teams use the designer for initial recording and YAML for ongoing maintenance.

The visual workflow:

1. Create a new project.
2. Click Record. The browser launches with a NeoLoad proxy.
3. Perform the user journey: login, browse, add to cart, checkout.
4. Stop recording. NeoLoad generates a virtual user definition with all captured requests.
5. Run a single-user validation to confirm the recording replays.

After recording you switch to YAML view to refactor:

\`\`\`yaml
# project.yaml (excerpt)
populations:
  Checkout_Users:
    user_paths:
      - checkout_flow

user_paths:
  checkout_flow:
    actions:
      - http_request:
          method: POST
          url: \${BASE_URL}/auth/login
          headers:
            Content-Type: application/json
          body: '{"email":"\${user_email}","password":"\${user_password}"}'
          extractors:
            - jsonpath:
                expression: $.token
                variable: auth_token
      - delay: 2s

      - http_request:
          method: GET
          url: \${BASE_URL}/products?q=laptop
          headers:
            Authorization: Bearer \${auth_token}
      - delay: 3s

      - http_request:
          method: POST
          url: \${BASE_URL}/cart
          headers:
            Authorization: Bearer \${auth_token}
            Content-Type: application/json
          body: '{"sku":"ABC-123","qty":1}'
          extractors:
            - jsonpath:
                expression: $.id
                variable: cart_id

      - http_request:
          method: POST
          url: \${BASE_URL}/checkout
          headers:
            Authorization: Bearer \${auth_token}
            Content-Type: application/json
          body: '{"cartId":"\${cart_id}"}'
          slas:
            - response_time_percentile:
                percentile: 95
                operator: less_than
                value: 800ms

scenarios:
  baseline_load:
    populations:
      - population: Checkout_Users
        load_policy:
          type: rampup
          start: 0
          end: 500
          duration: 5m
        duration: 30m
\`\`\`

YAML is git-friendly, supports diffs, and is easier to review than the binary project file. Most teams commit YAML and treat the GUI as a one-time generator.

## Parameterization and Correlation

NeoLoad uses a variables system for parameterization. Variables can be:

- Constants (the same value across all users)
- File-based (CSV or JSON, each user picks a row)
- Random (generated within constraints)
- Captured (extracted from a previous response)

\`\`\`yaml
variables:
  - name: BASE_URL
    type: constant
    value: https://staging.example.com

  - name: user_email
    type: file
    file_path: data/users.csv
    column: email
    distribution: per_user_unique

  - name: user_password
    type: file
    file_path: data/users.csv
    column: password
    distribution: per_user_unique

  - name: search_query
    type: random
    set: ["laptop", "phone", "tablet", "monitor", "keyboard"]
\`\`\`

Correlation is the process of extracting dynamic values from responses (session tokens, cart IDs, anti-CSRF tokens) and using them in subsequent requests. The \`extractors\` block in the YAML above captures the login token into \`auth_token\` and the cart ID into \`cart_id\`. NeoLoad supports JSONPath, XPath, regex, and HTML-aware extractors.

## Distributed Load Generators

For loads beyond what one machine can produce you add load generators (LGs). Each LG runs the NeoLoad runtime agent and accepts work from the controller. LGs can be on-prem VMs, EC2 instances, Kubernetes pods, or NeoLoad cloud-managed.

\`\`\`yaml
# Load generator configuration
load_generators:
  - host: lg1.internal
    type: java
    port: 7100
  - host: lg2.internal
    type: java
    port: 7100
  - host: lg3.internal
    type: java
    port: 7100

scenarios:
  distributed_baseline:
    populations:
      - population: Checkout_Users
        load_generators: [lg1.internal, lg2.internal, lg3.internal]
        load_policy:
          type: constant
          users: 1500   # 500 per LG
          duration: 30m
\`\`\`

The controller distributes virtual users across LGs. Each LG runs independently and streams results back to the controller in real time. For cloud-managed LGs you specify regions and NeoLoad provisions infrastructure automatically.

| Deployment | Use Case | Cost |
|---|---|---|
| On-prem VMs | Data residency, fixed infrastructure | CapEx |
| Self-managed EC2 | Cloud control, custom VPC | OpEx |
| Kubernetes | Cloud-native, auto-scaling | OpEx + cluster |
| NeoLoad cloud | No infrastructure work | Per VU hour |

## SAP and Citrix Protocols

The killer feature for many enterprises. NeoLoad supports protocol-level recording for SAP GUI (the thick client used by ERP modules) and Citrix ICA (the protocol used by virtualized desktops). Open-source tools cannot do this.

For SAP GUI you install the NeoLoad SAP GUI plugin, then record by clicking through transactions in SAP Logon. NeoLoad captures the RFC calls and replays them at scale. This is the only way to load test SAP modules that don't expose HTTP APIs.

For Citrix you install the Citrix module and record sessions through a Citrix StoreFront. NeoLoad captures ICA channel traffic and replays it as virtual sessions.

\`\`\`yaml
# SAP test fragment (simplified)
sap_action:
  type: SAPGUI
  session: SAP_PROD
  transaction: VA01
  fields:
    - id: VBAK-VKORG
      value: '1000'
    - id: VBAK-VTWEG
      value: '10'
\`\`\`

These protocols are mature in NeoLoad. Teams replacing LoadRunner often migrate primarily to retain SAP and Citrix coverage.

## Service Level Agreements

NeoLoad calls thresholds "SLAs". You define them per-request, per-page, or per-scenario. SLA breaches show up as red in the report and can fail CI builds.

\`\`\`yaml
slas:
  - name: checkout_p95_latency
    operator: less_than
    value: 800ms
    metric: response_time_percentile
    percentile: 95

  - name: error_rate_under_one_percent
    operator: less_than
    value: 1%
    metric: error_rate

  - name: throughput_above_target
    operator: greater_than
    value: 500
    metric: requests_per_second
\`\`\`

SLAs are first-class in NeoLoad. The report highlights breaches and the controller exits with non-zero code if any are violated.

## Tricentis Tosca Integration

Tosca is Tricentis's broader test automation platform. The NeoLoad-Tosca integration lets you reuse Tosca's UI test cases as load test scenarios. You design a UI test in Tosca, the integration captures the network requests it generates, and NeoLoad converts them into a load test.

This is most useful for organizations already using Tosca for functional UI testing. The integration lets QA engineers contribute to performance testing without learning a separate tool. The trade-off is the dual licensing cost.

## CI/CD Integration

NeoLoad Web exposes a REST API for headless test execution. The pattern in 2026 with GitHub Actions:

\`\`\`yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]

jobs:
  neoload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run NeoLoad test
        env:
          NLW_TOKEN: \${{ secrets.NEOLOAD_TOKEN }}
          NLW_URL: https://neoload.example.com
        run: |
          docker run --rm \\
            -v $(pwd):/work -w /work \\
            tricentis/neoload-cli:latest \\
            neoload run \\
              --project-name "checkout" \\
              --scenario baseline_load \\
              --duration 5m \\
              --token \$NLW_TOKEN \\
              --url \$NLW_URL \\
              --output-file results.json

      - name: Check SLAs
        run: |
          python scripts/check_neoload_slas.py results.json
\`\`\`

The CLI is available as a Docker image. It returns non-zero exit code on SLA breach. Integration with Jenkins is similar via the NeoLoad Jenkins plugin.

| CI System | Integration Method |
|---|---|
| Jenkins | Native plugin |
| GitHub Actions | Docker image |
| GitLab CI | Docker image |
| Azure DevOps | Native extension |
| Bamboo | Plugin |
| CircleCI | Docker orb |

## Analysis Dashboard

NeoLoad Web provides the dashboard for completed runs. Key panels:

- Overview: aggregate latency percentiles, throughput, error rate.
- Time series: per-metric line charts over the test duration.
- Per-transaction: drill into specific requests for per-route stats.
- SLA results: pass/fail of every SLA.
- Comparison: side-by-side with previous runs to spot regressions.

The comparison feature is particularly useful. After each release you compare the latest run against the previous baseline. Regressions in latency or error rate are immediately visible.

For deeper analysis you integrate with Dynatrace, AppDynamics, or Splunk. The integration overlays backend metrics with NeoLoad metrics so you can correlate frontend latency spikes with backend GC pauses or DB lock contention.

## Pricing and TCO

NeoLoad pricing is not public. Quotes typically include:

- Controller license: per year, fixed
- Load generator licenses: per VM, per year
- Cloud VU hours: per VU per hour for cloud runs
- Tosca integration: separate license
- Support tier: standard or premium

For a mid-sized team (one controller, three on-prem LGs, ~1000 cloud VU hours per month, no Tosca) annual cost is in the low five figures. For large enterprises with multiple controllers, dozens of LGs, and high cloud usage, six figures is typical.

Compare this to:

- k6 OSS plus Grafana Cloud k6 for 50k VU hours: low-to-mid four figures
- JMeter plus BlazeMeter: mid four to low five figures
- Locust OSS plus a few Kubernetes pods: minimal infrastructure cost

The decision often comes down to whether your specific protocol requirements (SAP, Citrix, Oracle Forms) justify the premium. For pure HTTP workloads NeoLoad is hard to justify; for enterprise protocol coverage it is often the only option.

## When to Pick NeoLoad

Pick NeoLoad if you need:

- SAP GUI or Web load testing
- Citrix ICA load testing
- Oracle Forms or Apps load testing
- ServiceNow, Salesforce, or Workday-specific tooling
- Integration with Tricentis Tosca
- Vendor support contracts for performance testing
- A GUI-first workflow for non-engineering testers

Skip NeoLoad if:

- Your workload is pure HTTP/HTTPS or gRPC
- You have engineers who can write JavaScript or Python
- You want open-source flexibility
- Your budget cannot accommodate enterprise tooling

## Conclusion

NeoLoad is the enterprise commercial choice for performance testing in 2026, with strongest justification when your protocols include SAP, Citrix, Oracle Forms, or similar enterprise systems. For pure HTTP workloads open-source tools like k6, JMeter, and Locust are cheaper and often more flexible. The decision depends on protocol breadth and how much value your team places on vendor support.

If you are evaluating NeoLoad, request a proof of concept that exercises your hardest protocol (e.g., SAP GUI) and your CI pipeline. The PoC validates both whether the tool covers your needs and whether the team workflow fits.

Browse the [skills directory](/skills) for performance testing AI agent skills. Read [JMeter vs Locust vs Gatling](/blog/jmeter-vs-locust-vs-gatling-comparison) for open-source comparisons.
`,
};
