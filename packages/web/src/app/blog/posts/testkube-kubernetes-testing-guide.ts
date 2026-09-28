import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testkube: Kubernetes-Native Test Orchestration Guide',
  description: 'Testkube guide for QA teams: run Kubernetes-native tests, author TestWorkflows, collect artifacts, trigger CI, and debug failures with confidence.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Testkube: Kubernetes-Native Test Orchestration Guide

Testkube is a Kubernetes-native test orchestration platform for running test tools such as k6, Playwright, Cypress, Postman/Newman, JMeter, curl, and custom scripts inside the cluster where the system under test already runs. The current model to learn is TestWorkflows, not the older Tests, TestSuites, Sources, and Executors model. The official standalone-agent docs still list those older resources during a transition period, but they are marked deprecated, so a new implementation should start with \`apiVersion: testworkflows.testkube.io/v1\` and \`kind: TestWorkflow\`.

Testkube is on the 2.13 line: 2.13.3 was released on September 21, 2026, and the docs image inventory references \`kubeshop/testkube-api-server:2.13.3\`. The agent, Helm chart, and CLI are versioned separately, so pin each one from the install path your organization actually uses and record the resolved versions in CI logs.

For QA engineers using Claude Code, Cursor, Copilot, or other AI coding agents, Testkube works best when the agent authors small, reviewable TestWorkflow YAML, applies it to a non-production cluster, runs it with the CLI, and then reads logs and artifacts. Ready-made QA skills install from qaskills.sh with the qaskills CLI, but the important discipline is the same even if you hand-write everything: keep the workflow declarative, keep secrets out of logs, and make failure artifacts available without giving the agent broad cluster access.

## Current Product Shape And Migration Boundaries

Testkube has two main deployment shapes. The Testkube Agent is open source and runs in your infrastructure. It can run standalone, managed by the CLI and API, or connect to a Testkube control plane for the dashboard and commercial orchestration features. The standalone docs say there is no dashboard in standalone mode, and that Workflows, Templates, logs, artifacts, webhooks, and event triggers are available directly through the agent.

The important catch is that standalone mode does not include every TestWorkflow feature. The docs call out limitations around complex \`execute\` orchestration, \`parallel\`, \`matrix\`, \`count\`, \`shards\`, \`services\`, and \`concurrency\` when using only the open source agent without a control plane. That does not make standalone weak. It means you should design standalone workflows as single-pod or simpler executions, then move composition and fleet orchestration into a connected setup when the test estate grows.

| Area | Current guidance | QA decision |
| --- | --- | --- |
| Primary resource model | \`TestWorkflow\` and \`TestWorkflowTemplate\` | Use this for all new work. |
| Legacy resources | Tests, TestSuites, Sources, Executors are deprecated but still available during transition | Migrate instead of expanding old coverage. |
| Open source agent | Runs in your cluster and can operate standalone | Good for initial adoption and local cluster proof of value. |
| Connected control plane | Adds dashboard and advanced workflow features | Use for larger teams, cross-cluster history, parallel orchestration, and governance. |
| Storage | PostgreSQL is the primary default database for new installs, artifacts use Minio-compatible storage | Plan backups and retention like test infrastructure, not throwaway dev tooling. |

The installation path is direct. For standalone, the docs show \`testkube init\` as the CLI path and Helm as the Kubernetes-native path. For repeatable environments, Helm is usually preferable because the values file is reviewable and fits GitOps.

\`\`\`bash
helm repo add kubeshop https://kubeshop.github.io/helm-charts
helm repo update
helm upgrade --install testkube kubeshop/testkube --create-namespace --namespace testkube --set installCRDs=true
kubectl get all -n testkube
\`\`\`

For production-like installations, decide storage early. Testkube artifacts are not just nice screenshots. They become the forensic record for flaky tests, performance regressions, browser traces, HAR files, Postman JSON, k6 summaries, and logs that an AI agent will use to diagnose the next failure. The standalone docs mention Minio for artifacts and also document S3-compatible values. That is your hint to configure object storage deliberately before the artifact volume becomes business-critical.

## TestWorkflow Anatomy For Real Test Suites

A TestWorkflow is a Kubernetes custom resource that describes content, configuration, containers, shell steps, artifacts, and optional orchestration. It is not a wrapper around one specific framework. That is the point: the same Kubernetes-native execution plane can run a k6 script, a Playwright suite, a Newman collection, or a custom smoke test that verifies a migration.

| Field | What it controls | Common QA mistake |
| --- | --- | --- |
| \`content.git\` | Repository source for tests | Pulling from a floating branch with no audit trail. |
| \`container.image\` | Runtime for a step | Using a local developer image that CI cannot pull. |
| \`workingDir\` | Directory where commands run | Assuming it is the repo root after changing \`paths\`. |
| \`config\` | Typed runtime parameters | Hard-coding environment URLs in YAML. |
| \`artifacts.paths\` | Files Testkube collects | Uploading only on success, then losing failure traces. |
| \`execute\` | Workflow composition | Using it in standalone mode where the feature may not be available. |

Here is a minimal k6 workflow that runs in-cluster and uploads the k6 summary and HTML dashboard output. The assertions are in the test script, while Testkube handles execution and artifacts.

\`\`\`yaml
apiVersion: testworkflows.testkube.io/v1
kind: TestWorkflow
metadata:
  name: checkout-k6-smoke
  namespace: testkube
  labels:
    app: checkout
    suite: smoke
spec:
  content:
    git:
      uri: https://github.com/example/commerce-tests.git
      revision: main
      paths:
        - perf/checkout.js
  config:
    targetUrl:
      type: string
      default: http://checkout.commerce.svc.cluster.local:8080
  steps:
    - name: Run k6 checkout smoke
      workingDir: /data/repo/perf
      container:
        image: grafana/k6:2.3.0
        env:
          - name: TARGET_URL
            value: "{{ config.targetUrl }}"
          - name: K6_WEB_DASHBOARD
            value: "true"
          - name: K6_WEB_DASHBOARD_EXPORT
            value: /data/artifacts/k6-report.html
      shell: |
        mkdir -p /data/artifacts
        k6 run --summary-export /data/artifacts/summary.json checkout.js
      artifacts:
        workingDir: /data/artifacts
        paths:
          - "summary.json"
          - "k6-report.html"
\`\`\`

The workflow is intentionally small. An agent can inspect it, update the image tag, change the target URL, or add another artifact without understanding your whole deployment topology. Keep that style. When a workflow needs to test the live service mesh, database, or event broker, add only the variables and files that the test actually needs.

For Playwright, put the browser dependencies in the image rather than hoping the cluster pod can install them on the fly. A good TestWorkflow avoids hidden setup work in every run.

\`\`\`yaml
apiVersion: testworkflows.testkube.io/v1
kind: TestWorkflow
metadata:
  name: storefront-playwright-regression
  namespace: testkube
  labels:
    app: storefront
    suite: e2e
spec:
  content:
    git:
      uri: https://github.com/example/storefront.git
      revision: main
      paths:
        - tests/e2e
        - package.json
        - package-lock.json
        - playwright.config.ts
  config:
    baseUrl:
      type: string
      default: http://storefront.web.svc.cluster.local:3000
  steps:
    - name: Run Playwright
      workingDir: /data/repo
      container:
        image: mcr.microsoft.com/playwright:v1.63.0-noble
        env:
          - name: BASE_URL
            value: "{{ config.baseUrl }}"
          - name: PLAYWRIGHT_HTML_OUTPUT_DIR
            value: /data/artifacts/playwright-report
      shell: |
        npm ci
        npx playwright test --reporter=list,html --grep @critical
      artifacts:
        workingDir: /data/artifacts
        paths:
          - "playwright-report/**"
          - "test-results/**"
\`\`\`

Notice the \`--grep @critical\` flag. That is the real Playwright flag for selecting tests by title or annotation. Do not invent a Testkube-level filter if the underlying framework already provides the right filter. The workflow should orchestrate execution, while the test framework should own test selection semantics.

## Applying And Running Workflows

TestWorkflows are CRDs, so you can use either the Testkube CLI or \`kubectl apply\`. The CLI is more convenient for running, watching, reading logs, and downloading artifacts. \`kubectl apply\` is attractive for GitOps because it treats workflows like the rest of your cluster configuration.

\`\`\`bash
testkube create testworkflow -f checkout-k6-smoke.yaml
testkube get testworkflows
testkube run testworkflow checkout-k6-smoke --watch
testkube get testworkflowexecutions
\`\`\`

If you use aliases, \`tw\` is commonly accepted in examples, but spell out \`testworkflow\` in documentation and onboarding scripts. AI agents are much better at debugging explicit commands because errors are less ambiguous.

For GitHub Actions, use CI to trigger a workflow, not to reimplement the workflow. The action below installs the CLI, creates or updates the TestWorkflow, runs it, and lets Testkube own the cluster execution. I am using the current GitHub Actions majors specified for this environment, and the setup action major verified from the Testkube repository.

\`\`\`yaml
name: testkube-smoke

on:
  pull_request:
    branches:
      - main

jobs:
  cluster-smoke:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Testkube CLI
        uses: kubeshop/setup-testkube@v1
        with:
          organization: \${{ secrets.TESTKUBE_ORG_ID }}
          environment: \${{ secrets.TESTKUBE_ENV_ID }}
          token: \${{ secrets.TESTKUBE_API_TOKEN }}

      - name: Apply and run TestWorkflow
        run: |
          testkube create testworkflow -f testworkflows/checkout-k6-smoke.yaml
          testkube run testworkflow checkout-k6-smoke --watch --tag pr=\${{ github.event.pull_request.number }} --tag run=\${{ github.run_id }}
\`\`\`

Two details matter in real CI. First, tag executions so you can search by PR, run ID, suite, or service. Second, keep the CI job waiting for completion with \`--watch\` when you want branch protection to block merges. If you choose asynchronous execution, you need a separate status callback or policy check, otherwise the GitHub job can pass while the cluster test fails later.

## Running Frameworks Without Losing Their Native Strengths

Testkube should not flatten every test tool into generic pass or fail. Let each tool emit its richest native report, then collect those reports as artifacts.

| Framework | Keep native behavior | Artifact to collect |
| --- | --- | --- |
| k6 | Thresholds, checks, summary export, optional web dashboard | \`summary.json\`, HTML report, custom line protocol metrics if used |
| Playwright | Traces, videos, screenshots, HTML report, \`--grep\` selection | \`playwright-report/**\`, \`test-results/**\` |
| Cypress | Videos, screenshots, JUnit or Mochawesome output | \`cypress/videos/**\`, \`cypress/screenshots/**\`, report XML or JSON |
| Postman/Newman | Collection variables, environment files, JUnit output | Newman JSON or JUnit XML |
| JMeter | JTL results, dashboard \`statistics.json\` | JTL files and dashboard folder |

The official artifacts docs say Testkube collects files produced by TestWorkflow steps through the \`artifacts\` property. It also scans artifacts for valid JUnit XML and recognizes tool-specific reports, including k6 \`summary.json\` created with \`--summary-export\`, Artillery JSON reports, JMeter dashboard \`statistics.json\`, and Influx line protocol files ending with \`.influx\` or \`.lp\`.

For Cypress, the useful workflow shape is to install once inside the container, run a filtered suite, and collect reports even if the command fails. A dedicated artifact step with \`condition: always\` is safer than attaching artifacts only to the test command.

\`\`\`yaml
apiVersion: testworkflows.testkube.io/v1
kind: TestWorkflow
metadata:
  name: admin-cypress-critical
  namespace: testkube
spec:
  content:
    git:
      uri: https://github.com/example/admin-ui.git
      revision: main
  config:
    baseUrl:
      type: string
      default: http://admin.web.svc.cluster.local:3000
  steps:
    - name: Run Cypress critical specs
      workingDir: /data/repo
      container:
        image: cypress/included:16.1.0
        env:
          - name: CYPRESS_baseUrl
            value: "{{ config.baseUrl }}"
      shell: |
        npx cypress run --browser chrome --spec "cypress/e2e/critical/**/*.cy.ts"
    - name: Collect Cypress output
      condition: always
      artifacts:
        workingDir: /data/repo
        paths:
          - "cypress/videos/**"
          - "cypress/screenshots/**"
          - "results/**"
\`\`\`

What people get wrong: they migrate a test suite into Testkube and then remove the framework-specific diagnostics to make the YAML shorter. That defeats the main advantage of in-cluster orchestration. A failed browser test without screenshots or traces is just a remote red light.

## Trigger Design: CI, Kubernetes Events, Schedules

Testkube supports several trigger surfaces, including CI/CD plugins, Kubernetes events, webhooks, CDEvents, and scheduling. The right trigger depends on what you are proving.

| Trigger | Best use | Avoid when |
| --- | --- | --- |
| Pull request CI | Fast smoke and changed-service checks | The suite is long and has no branch protection signal. |
| Deployment event | Post-deploy validation against actual release objects | You need to block the deployment before rollout starts. |
| Cron schedule | Nightly regression, soak, drift detection | Failures require immediate author feedback. |
| Manual run | Debugging and release-manager judgment calls | The same suite should run consistently on every merge. |
| Webhook or CDEvent | Integrating with platform pipelines | Ownership of the event schema is unclear. |

For microservices, trigger layering works better than one giant test run. Run API contract smoke checks on every PR, run browser critical paths after preview deployment, run load smoke after merging to staging, and reserve long performance or chaos workflows for scheduled windows. If you already use Kubernetes-native load tooling, compare this orchestration model with [k6 Operator for Kubernetes distributed load testing](/blog/k6-operator-kubernetes-distributed-load-testing). If you also validate resilience through controlled faults, connect the execution plan to [Chaos Mesh Kubernetes testing](/blog/chaos-mesh-kubernetes-testing-guide) rather than treating chaos as a separate ritual.

## Data, Secrets, And Cross-Workflow Handoffs

The Testkube docs for sharing data between executions describe three supported mechanisms: output values through \`execution()\`, artifact contents through \`read_artifact()\`, and artifact files through \`fetch\`. Output values are capped at 4096 bytes, and \`read_artifact()\` is capped at 1 MiB. That is a good architectural boundary. Pass identifiers and small summaries as outputs. Pass files as artifacts. Pass secrets through secret references, not through outputs.

\`\`\`yaml
apiVersion: testworkflows.testkube.io/v1
kind: TestWorkflow
metadata:
  name: producer
  namespace: testkube
spec:
  steps:
    - name: Publish build metadata
      id: publish
      shell: |
        mkdir -p /data/out
        echo -n "checkout-api" > /testkube/outputs/service
        echo '{"cases":12,"fixture":"seeded"}' > /data/out/fixture-summary.json
      artifacts:
        workingDir: /data/out
        paths:
          - "fixture-summary.json"
\`\`\`

If you later compose workflows, make the consumer check for the output before using it. A missing output resolves as empty in documented examples. Silent empty strings are dangerous when an AI agent is triaging a failed run.

\`\`\`yaml
steps:
  - name: Run producer
    execute:
      workflows:
        - name: producer
          as: p
  - name: Require service output
    shell: |
      test -n '{{ execution("p").outputs.service }}' || { echo "producer did not publish service"; exit 1; }
      echo 'service={{ execution("p").outputs.service }}'
\`\`\`

The failure mode here is subtle. A team publishes a token, session ID, or generated user email through \`/testkube/outputs\`, then later replaces the value with a secret-shaped value. The docs say sensitive values that Testkube masks are not published outside the workflow that produced them. A consumer can suddenly fail with a withheld-output error. The fix is not to disable masking. Put shared secrets in Kubernetes secrets or the Testkube credential mechanism available in your environment, and pass only non-sensitive handles.

## A Failure Mode: Workflow Passes Locally, Fails In Cluster

The most common Testkube adoption failure is not a Testkube bug. It is an environment assumption. The test passes on the developer laptop, fails in the workflow pod, and the first reaction is to patch timeouts. Diagnose the boundary instead.

Start with the pod's view of the network. If the test targets \`localhost\`, it is probably hitting the workflow container, not the service under test. Use the Kubernetes DNS name for in-cluster services. If the test needs to hit something on the developer machine, use an explicit local-dev bridge or a tool designed for local-to-cluster routing.

Then check the image. Browser suites need browser dependencies. k6 needs the k6 binary and any extensions. Newman needs Node and the collection files. Database tests need clients. Do not rely on \`apt-get\` in every run unless the cluster has stable egress and your team accepts the latency and supply-chain risk.

Finally, inspect artifacts before editing code. A Playwright trace that shows a 503 from the ingress points to routing or readiness. A k6 summary with connection refused points to a service address or NetworkPolicy. A Cypress video that never reaches the login page points to base URL or auth setup. An agent should summarize those facts before it proposes a code fix.

\`\`\`bash
testkube get testworkflowexecutions
testkube logs testworkflowexecution <execution-id>
testkube get testworkflowexecution <execution-id>
\`\`\`

If artifacts are missing, fix the workflow first. Without artifacts, every retry burns cluster time and gives the agent less evidence than a local failure would.

## Governance For AI Coding Agents

AI agents are useful with Testkube because they can author YAML, run executions, retrieve logs, and propose narrow fixes. They are also risky if they can mutate every workflow or every namespace. Give them scoped tools.

| Control | Practical implementation | Why it matters |
| --- | --- | --- |
| Namespace scope | Run Testkube in a dedicated namespace and bind minimal RBAC | Prevents test automation from becoming cluster automation. |
| Workflow review | Store TestWorkflow YAML in Git and require review | Agents can propose changes without applying hidden state. |
| Image allowlist | Use approved test images and pinned tags | Keeps arbitrary code execution visible. |
| Secret boundary | Inject secrets through approved mechanisms only | Avoids leaking values into logs or outputs. |
| Artifact retention | Define TTLs by suite class | Balances debugging value against storage cost. |
| Execution tags | Tag by PR, service, suite, and run | Makes flaky-test triage searchable. |

The best mental model is "cluster test runner with evidence capture," not "let the agent control Kubernetes." Testkube gives your team a durable execution plane. The agent should operate inside that plane and leave a record you can inspect.

## Frequently Asked Questions

### Is Testkube open source or commercial?

The Testkube Agent is open source and runs in your own infrastructure. It can run standalone without a control plane, managed through the CLI and API. Testkube also offers connected control plane options with dashboard and advanced orchestration features. The split matters because some TestWorkflow features are not available in standalone mode. For a small team, start with the open source agent to prove value. For larger teams, evaluate the connected control plane when you need dashboard history, parallel orchestration, governance, and cross-cluster visibility.

### Should new teams use Tests and Executors or TestWorkflows?

Use TestWorkflows for new work. The official standalone-agent docs still mention Tests, TestSuites, Sources, and Executors, but mark them deprecated and available only during a transition period. TestWorkflows are the current model for expressing test content, containers, shell commands, artifacts, configuration, templates, and orchestration. If you already have legacy resources, migrate gradually by framework or service. Do not create more old-style definitions unless you are maintaining an existing estate during a controlled transition.

### Can Testkube replace GitHub Actions or Jenkins?

Usually no. Testkube should run the cluster-native test workload, while CI starts the run and enforces merge policy. GitHub Actions, Jenkins, Argo Workflows, or another orchestrator still handles checkout, credentials, branch protection, release sequencing, and notifications. Testkube handles execution inside Kubernetes, logs, artifacts, workflow state, and test-specific history. That division is cleaner than pushing browser dependencies, service DNS, and cluster-only integration tests into a generic CI runner.

### What is the first workflow I should build?

Start with a high-signal smoke test for one service path that frequently breaks: a k6 API smoke, a Playwright critical checkout path, or a Newman contract collection. Keep it under a few minutes, collect artifacts on failure, tag executions by PR and service, and run it from CI with \`testkube run testworkflow <name> --watch\`. Once that is reliable, add broader regression workflows and scheduled suites. Reliability of the first workflow matters more than coverage volume.
`,
};
