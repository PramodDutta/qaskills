import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Signadot Sandboxes: Testing Microservices in Shared Kubernetes Clusters',
  description: 'Signadot guide for QA teams: use sandboxes, routing keys, RouteGroups, SmartTests, CI previews, and shared-cluster validation safely before merge.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Signadot Sandboxes: Testing Microservices in Shared Kubernetes Clusters

Signadot is an active Kubernetes testing and preview-environment platform built around request-level isolation, not full-environment duplication. A Signadot Sandbox creates forks of changed workloads inside a shared Kubernetes cluster, then routes only requests carrying a sandbox routing key to those forks. Everything else keeps using the baseline services. That makes Signadot especially interesting for QA engineers who need realistic integration feedback without spinning up a complete copy of every microservice for every pull request.

The current docs and release notes I verified show ongoing maintenance: Operator v1.4.0 was documented on September 10, 2026, CLI v1.7.0 appeared in the May 28, 2026 notes, and the product documentation now includes Sandboxes, RouteGroups, DevMesh, Gateway API and Istio routing, Smart Tests, Jobs, local workloads, preview endpoints, and usage-based pricing. Windows is still not natively supported for the CLI, although the CLI docs say some features may work under WSL.

The short answer: use Signadot when one shared staging-like cluster already has the baseline system, and you want each PR, AI coding-agent change, or local developer loop to replace only the services under test. It is not a replacement for unit tests, consumer-driven contracts, or synthetic monitoring. It is the layer that lets those checks hit a realistic microservice graph before merge.

## The Sandbox Model: Route One Request, Not One Universe

Traditional preview environments clone the world: namespace, Helm release, database, queues, ingress, jobs, and sometimes third-party mocks. That works until the system has dozens of services, long migrations, high data volume, and shared dependencies. Signadot takes a different route. The baseline environment remains in place, and a sandbox adds one or more forked workloads plus optional sandbox resources. A routing key decides whether a request sees the fork or the baseline.

| Concept | What it means in Signadot | Testing impact |
| --- | --- | --- |
| Baseline | The shared running version of your application in Kubernetes | Gives every sandbox realistic dependencies by default. |
| Sandbox | A logical context containing forked workloads, local mappings, and resources | Lets a PR replace only the services it changes. |
| Routing key | Opaque key generated for a sandbox or RouteGroup | Selects sandbox traffic request by request. |
| RouteGroup | A routing context that matches multiple sandboxes, usually by labels | Combines related PRs or multi-service changes under one key. |
| DevMesh | Signadot's no-service-mesh routing sidecar approach | Useful when you do not run Istio or Gateway API routing. |
| Smart Tests | Starlark API tests that compare sandbox and baseline behavior | Adds regression signal beyond plain status-code checks. |

The key design constraint is context propagation. Signadot can route the first hop if the incoming request carries the sandbox routing key, but downstream calls need the key forwarded through headers. The docs call out W3C \`baggage\` and \`tracestate\` as the standard carriers, and recommend OpenTelemetry instrumentation because it can propagate those headers without requiring a tracing backend. Service mesh routing cannot magically infer which outgoing request belongs to which incoming request from outside the process. That correlation has to happen at the application layer.

If your services already propagate trace context, Signadot adoption is often easier than building another preview stack. If your services strip headers at gateways, use custom HTTP clients without propagation, or publish events without metadata, test the propagation path before you promise branch-level previews to every team.

## Install And Authenticate The Moving Parts

A working Signadot setup has a SaaS control plane, an operator installed in your cluster, and the CLI for developers and CI. The official operator docs say the operator installs into the \`signadot\` namespace with Helm, requires a cluster token created from the dashboard, and needs egress to \`api.signadot.com\` plus \`tunnel.signadot.com:443\`.

\`\`\`bash
kubectl create ns signadot
helm repo add signadot https://charts.signadot.com
helm repo update
helm install signadot-operator signadot/operator --namespace signadot --set controlPlane.clusterToken='<cluster-token>'
kubectl get pods -n signadot
\`\`\`

The CLI supports macOS and Linux. The docs show Homebrew, an install script, release downloads, and Docker as installation paths. Authentication should use \`signadot auth\` commands in modern CLI versions.

\`\`\`bash
brew tap signadot/tap
brew install signadot-cli
signadot auth status
signadot auth login --with-api-key '<api-key>'
\`\`\`

For CI containers, the install script is convenient, but pinning versions through a base image is more auditable. The official install script is still useful for prototyping.

\`\`\`bash
curl -sSLf https://raw.githubusercontent.com/signadot/cli/main/scripts/install.sh | sh
signadot auth login --with-api-key '<api-key>'
signadot cluster list
\`\`\`

The platform boundary matters for security reviews. The operator, workloads, and data stay in your cluster, while the dashboard and API run in Signadot's cloud. Preview traffic uses Signadot-managed endpoints and, with Operator v1.4.0 or later, the release notes and architecture docs describe preview traffic being served in-cluster from a preview server rather than through the older tunnel path. If your organization has strict data handling rules, review preview endpoint configuration, custom domains, access controls, and what test traffic you allow through the platform.

## Author A Sandbox For One Changed Service

A sandbox definition is YAML or JSON with a name and spec. The CLI reference shows \`signadot sandbox apply -f my-sandbox.yaml\`, plus list, get, and delete commands. A fork usually points to an existing Kubernetes workload and customizes its image, environment, files, or local mapping.

\`\`\`yaml
name: checkout-pr-1842
spec:
  cluster: staging-us
  description: "PR 1842 checkout tax calculation"
  forks:
    - forkOf:
        kind: Deployment
        namespace: commerce
        name: checkout
      customizations:
        images:
          - image: ghcr.io/example/checkout:pr-1842
        env:
          - name: LOG_LEVEL
            value: debug
  defaultRouteGroup:
    endpoints:
      - name: storefront
        target: http://storefront.commerce.svc:3000
\`\`\`

Apply it and inspect the generated routing key:

\`\`\`bash
signadot sandbox apply -f checkout-pr-1842.yaml
signadot sandbox get checkout-pr-1842 -o json
signadot sandbox list
\`\`\`

In a browser, the Chrome extension can inject the routing key. In automated tests, send the \`baggage\` header yourself. In the docs, Signadot examples use \`baggage: sd-routing-key=<routing-key>\`. Query parameter routing is also available through \`?sd-routing-key=<key>\`, especially for browser links, webhook callbacks, and tools that cannot set headers, but the official docs describe it as best-effort and dependent on where the first service receives the request.

\`\`\`bash
curl -H 'baggage: sd-routing-key=<routing-key>' http://storefront.commerce.svc:3000/api/checkout/quote
curl 'http://storefront.commerce.svc:3000/api/checkout/quote?sd-routing-key=<routing-key>'
\`\`\`

Header routing is the safer default for CI and automated QA because it behaves like the system should behave under service-to-service propagation. Query parameters are excellent for sharing a link with a reviewer, validating a webhook path, or giving an AI assistant a simple instruction.

## Combine Multi-Service Changes With RouteGroups

One changed service is the cleanest case. Real PRs often span an API, a worker, a UI, and a schema change. Signadot RouteGroups solve the routing-context problem by combining sandboxes selected by labels. The docs show \`signadot routegroup apply -f my-routegroup.yaml\`, \`routegroup list\`, \`routegroup get\`, and \`routegroup delete\`.

\`\`\`yaml
name: checkout-tax-feature
spec:
  cluster: staging-us
  description: "route group for checkout tax feature validation"
  match:
    any:
      - label:
          key: feature
          value: checkout-tax
  endpoints:
    - name: storefront
      target: http://storefront.commerce.svc:3000
\`\`\`

\`\`\`bash
signadot routegroup apply -f checkout-tax-routegroup.yaml
signadot routegroup get checkout-tax-feature -o yaml
\`\`\`

RouteGroups are valuable for QA because they let you validate a feature as a composed behavior without forcing every involved service into one repository or one deployment pipeline. The frontend sandbox can join by label. The checkout sandbox can join by the same label. A pricing service change can join later. The route group gets its own routing key, so a browser, Playwright suite, Postman collection, or Smart Test can see the combined change.

| Scenario | Use individual sandbox | Use RouteGroup |
| --- | --- | --- |
| One service image changes | Yes | Usually unnecessary |
| Frontend and backend PRs must be tested together | Possible but awkward | Yes |
| AI agent changes one endpoint and one worker | Possible if one repo owns both | Yes if separate sandboxes exist |
| Release manager wants to preview a feature branch set | No | Yes |
| QA wants to isolate one failure to one fork | Yes | Start with RouteGroup, then test individual sandboxes |

What people get wrong: they create a sandbox for every service in the call chain. That copies the old preview-environment mindset into Signadot. Only fork what changed or what must be isolated for data reasons. Let the baseline carry everything else.

## CI Preview Environments Per Pull Request

In CI, a common pattern is to build the changed service image, create or update the sandbox, run validation against the routing key, then delete the sandbox when the PR closes or after a TTL. Signadot also supports pull request preview workflows through its platform, but the core mechanics are CLI-friendly.

\`\`\`yaml
name: signadot-preview

on:
  pull_request:
    types:
      - opened
      - synchronize
      - reopened

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Install Signadot CLI
        run: curl -sSLf https://raw.githubusercontent.com/signadot/cli/main/scripts/install.sh | sh

      - name: Authenticate
        run: signadot auth login --with-api-key '\${{ secrets.SIGNADOT_API_KEY }}'

      - name: Create sandbox spec
        run: |
          cat > sandbox.yaml <<'YAML'
          name: checkout-pr-\${{ github.event.pull_request.number }}
          spec:
            cluster: staging-us
            description: "checkout PR \${{ github.event.pull_request.number }}"
            forks:
              - forkOf:
                  kind: Deployment
                  namespace: commerce
                  name: checkout
                customizations:
                  images:
                    - image: ghcr.io/example/checkout:pr-\${{ github.event.pull_request.number }}
            defaultRouteGroup:
              endpoints:
                - name: storefront
                  target: http://storefront.commerce.svc:3000
          YAML

      - name: Apply sandbox
        run: signadot sandbox apply -f sandbox.yaml

      - name: Capture routing key
        run: signadot sandbox get checkout-pr-\${{ github.event.pull_request.number }} -o json > sandbox.json
\`\`\`

That sample writes a YAML file in CI because it needs dynamic PR data. In a production repo, prefer a checked-in template and use the CLI's YAML templating features rather than generating large files in shell. The shell approach is short for illustration, but checked-in templates are easier for agents and reviewers to reason about.

For PR cleanup, handle the \`pull_request: closed\` event and delete by name. Signadot release notes mention fixes around GitHub closed webhooks for PRs that never created a sandbox, which is exactly the kind of edge case you should make idempotent.

\`\`\`yaml
name: signadot-preview-cleanup

on:
  pull_request:
    types:
      - closed

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Install Signadot CLI
        run: curl -sSLf https://raw.githubusercontent.com/signadot/cli/main/scripts/install.sh | sh
      - name: Authenticate
        run: signadot auth login --with-api-key '\${{ secrets.SIGNADOT_API_KEY }}'
      - name: Delete sandbox
        run: signadot sandbox delete checkout-pr-\${{ github.event.pull_request.number }}
\`\`\`

If deletion can fail because a sandbox was never created, wrap the command with a prior \`get\` check in your real workflow. Cleanup jobs should be boring.

## Smart Tests, Jobs, And Existing Test Suites

Signadot has two test execution concepts that QA teams should separate. Smart Tests are Starlark API tests designed for integration testing and sandbox-to-baseline comparison. Jobs run existing test suites using images and environments defined by Job Runner Groups. The docs say Smart Tests use Jobs underneath, while Jobs are the lower-level infrastructure for arbitrary frameworks.

| Need | Smart Tests | Jobs |
| --- | --- | --- |
| Compare sandbox behavior to baseline | Strong fit | Possible, but you build comparison logic |
| Run an existing Playwright, Postman, or pytest suite | Not the main fit | Strong fit |
| Produce relevance-scored API diffs | Strong fit | No, unless your tooling does that |
| Reuse current test framework unchanged | Limited | Strong fit |
| CI pass or fail for PR validation | Yes | Yes |

Smart Tests are written in Starlark files with the suffix \`.star\`. The CLI reference says \`signadot smart-test run\` can run tests from repository config, a directory with \`-d\`, or a file with \`-f\`. It can run against a baseline cluster with \`--cluster\`, or against a Sandbox or RouteGroup routing context to enable Smart Diff analysis of captured API traffic. It also supports \`--publish\`, \`--set-label\`, output formats, and execution management commands.

\`\`\`bash
signadot smart-test run --cluster staging-us -d tests/smart --set-label suite=baseline
signadot smart-test run --sandbox checkout-pr-1842 -f tests/smart/checkout.star --publish --set-label pr=1842
signadot smart-test execution list --run-id <run-id>
signadot smart-test execution get <execution-id>
\`\`\`

Use Smart Tests when the main question is "Did this service change the runtime API behavior in a meaningful way compared with baseline?" Use Jobs when the main question is "Can my existing suite run against this routing context?" They complement each other. A good PR validation pipeline might run Smart Tests for API drift, a Playwright job for user journeys, and a targeted contract test for consumer expectations. If you need the bigger testing strategy around service boundaries, pair this with [microservices testing strategies](/blog/microservices-testing-strategies). For provider-consumer compatibility specifically, connect Signadot checks to [API contract testing for microservices](/blog/api-contract-testing-microservices) instead of expecting sandbox diffs to replace explicit contracts.

## Data Isolation And Stateful Failure Modes

Request routing isolates service versions. It does not automatically make shared data safe. The platform docs describe several approaches: partition shared data by tenant or key, provision ephemeral databases or schemas through resource plugins, or branch data where your data platform supports it. QA needs to choose per test class.

| State type | Practical sandbox strategy | Failure to watch |
| --- | --- | --- |
| Read-only catalog data | Share baseline data | Tests accidentally mutate records. |
| Tenant-scoped business data | Use a sandbox-only tenant or organization ID | Missing tenant filter leaks into shared assertions. |
| Database schema change | Use an ephemeral schema or resource plugin | Migration touches baseline schema. |
| Queue messages | Propagate routing key as message metadata | Baseline consumer processes sandbox message. |
| External payment or email | Stub or route to test account | Real side effects from preview tests. |

For asynchronous systems, the product page and docs describe routing keys traveling as message headers, with sandboxed consumers processing matching messages and shared consumers skipping them. That design works only if your application code participates. A message published without the routing key cannot be reliably attributed to the sandbox later.

A realistic failure mode looks like this: a checkout PR sandbox passes HTTP tests, but the order confirmation email comes from the baseline worker. Diagnosis starts with the request path. Did the checkout service receive \`baggage: sd-routing-key=<key>\`? Did it copy that key into the message header when publishing? Does the worker know how to ask Signadot's routing data which sandbox owns the key? If any hop drops the key, the system falls back to baseline behavior and your test becomes a blended result.

Do not paper over this by running a full copy of every async worker in every sandbox. First fix key propagation and selective consumption. Full duplication is a costlier fallback, not the first design.

## Local Development And Agent Loops

Signadot also supports local workloads. A sandbox can map a Kubernetes workload to a local port after the developer or CDE runs \`signadot local connect\`. The sandbox reference notes that local mappings require the connection from the machine where the local service will run, and \`signadot sandbox get-env\` plus \`get-files\` can retrieve environment variables and file mounts from the in-cluster workload when the user has the right Kubernetes read access.

\`\`\`yaml
name: local-checkout-debug
spec:
  cluster: staging-us
  local:
    - from:
        kind: Deployment
        namespace: commerce
        name: checkout
      name: local-checkout
      mappings:
        - port: 8080
          toLocal: localhost:8080
      env:
        - name: LOG_LEVEL
          value: debug
\`\`\`

\`\`\`bash
signadot local connect
signadot sandbox apply -f local-checkout-debug.yaml
eval $(signadot sandbox get-env local-checkout-debug)
go run ./cmd/checkout
\`\`\`

This is powerful for AI coding agents because the agent can patch code, run the service locally, and validate it against real cluster dependencies. It is also a permission boundary. Do not give an agent arbitrary cluster read access just because \`get-env\` is convenient. Grant the minimal namespace and object access required for the mapped service, and keep secrets governed by your normal developer-access policy.

## Pricing And Plan Fit For QA Leaders

The official pricing page describes usage-based pricing around sandboxes created, test invocations, and concurrent devboxes. It lists a free Starter tier, a Business tier, and Enterprise. Exact commercial terms can change, so treat pricing as something to verify during procurement, but the structure is clear enough for planning.

| Plan area | Official positioning I verified | QA planning note |
| --- | --- | --- |
| Starter | Free, with monthly sandbox and test-invocation allowances, one Kubernetes cluster, and community Slack support | Good for hands-on proof of value. |
| Business | Listed at $250 per month, includes higher sandbox, test invocation, devbox, cluster, and resource plugin limits, with add-ons | Good for a small team standardizing PR previews. |
| Enterprise | Contact-sales tier for larger needs | Likely needed for advanced governance, larger scale, and enterprise support requirements. |
| Billing unit | Sandboxes created, test invocations, concurrent devboxes | Estimate from PR volume and test frequency, not service count alone. |

The pricing FAQ says running \`signadot job submit\` or \`signadot smart-test run\` counts as one test invocation regardless of how many individual tests execute. That matters for suite design. A single huge invocation can hide failure localization, while many tiny invocations can raise usage. Group tests by decision point: "can this PR merge," "is this route group safe for release," or "does this nightly environment drift need investigation?"

## What To Put In The First Production Pilot

Choose one flow with pain, not one service with prestige. Good candidates are checkout, signup, billing quote, entitlement creation, search indexing, or any API chain where local mocks regularly lie. The pilot should include the service owner, QA owner, platform owner, and one developer using an AI coding agent or CDE.

1. Confirm the baseline cluster is stable enough to be the shared reference.
2. Install the operator in a non-production cluster and verify egress requirements.
3. Pick one changed workload and create a sandbox from a PR image.
4. Prove header propagation across at least three hops.
5. Add one RouteGroup for a multi-service change.
6. Run one Smart Test and one existing framework suite.
7. Capture cleanup behavior on PR close and TTL expiry.
8. Document the failure modes found during the pilot.

Success is not "we created a sandbox." Success is "a QA engineer can tell which version processed each hop, what data was touched, which diff matters, and what artifact supports the merge decision."

## Frequently Asked Questions

### Is Signadot the same as a preview environment?

Signadot can create PR previews, but its model is lighter than cloning a full environment. A sandbox replaces selected workloads inside a shared Kubernetes baseline and uses routing keys to direct only tagged requests to those forks. That means unchanged services, shared dependencies, and baseline infrastructure stay in place. The benefit is scale and realism. The tradeoff is that your services must propagate routing context correctly, and stateful dependencies need a deliberate isolation strategy.

### Do I need Istio to use Signadot?

No. Signadot supports routing through service mesh approaches such as Istio, Gateway API, or Linkerd, but it also documents DevMesh, a built-in sidecar approach for clusters without a service mesh. The choice changes where routing decisions happen and what infrastructure you operate. If you already run Istio or Gateway API, Signadot can program that routing layer. If you do not, DevMesh gives you a lighter starting point. Either way, application-level context propagation still matters for downstream calls.

### Can Smart Tests replace contract tests?

No, not completely. Smart Tests are strong for provider-focused runtime comparison: they exercise APIs against baseline and sandbox behavior and help identify meaningful diffs. Consumer-driven contract tests answer a different question: whether a provider still satisfies explicit expectations published by consumers. Use Smart Tests to catch unexpected runtime drift and contract tests to protect agreed interfaces. For high-risk APIs, the two approaches are complementary rather than competitive.

### What is the biggest adoption risk?

The biggest risk is partial routing context. The first request reaches the sandbox, but a downstream HTTP call, Dapr invocation, queue message, or worker action loses the routing key and falls back to baseline. The test may still pass, but it is no longer proving the PR behavior end to end. Diagnose propagation before scaling adoption. Add observability that shows routing key presence at each hop, and write one validation test whose only job is to prove sandbox ownership across the full path.
`,
};
