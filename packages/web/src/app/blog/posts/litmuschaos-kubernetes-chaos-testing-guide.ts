import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LitmusChaos Guide: Kubernetes Chaos Engineering For QA Teams',
  description: 'Use litmuschaos to run Kubernetes chaos tests with probes, CI gates, scoped faults, and useful release evidence instead of noisy disruption.',
  date: '2026-09-24',
  category: 'Guide',
  content: `
# LitmusChaos Guide: Kubernetes Chaos Engineering For QA Teams

LitmusChaos is a CNCF incubating chaos engineering platform for cloud-native systems. In the current 3.x docs, the platform centers on ChaosCenter, chaos infrastructure, experiments, faults, probes, and Kubernetes custom resources such as \`ChaosEngine\` and \`ChaosResult\`. For QA teams, the practical payoff is not breaking pods for fun. It is turning a recovery expectation into a repeatable test with a verdict, logs, and enough evidence to debug the weakness.

Use litmuschaos when you need controlled fault injection against Kubernetes workloads, repeatable experiment definitions, a UI or API-driven control plane, reusable resilience probes, and a path to schedule chaos as part of release validation. Start in staging, scope the blast radius tightly, and make the pass condition explicit before the fault starts. A chaos run without a hypothesis is only an outage rehearsal with better branding.

The official Litmus docs show 3.30.0 as the current documentation version, describe Litmus as a Kubernetes-native framework using custom resources, and document namespaced mode as the supported standard installation mode since the 3.9.0 release. The experiment reference still uses \`apiVersion: litmuschaos.io/v1alpha1\` for examples such as \`ChaosEngine\`, and the probes documented for experiment verdicts are \`httpProbe\`, \`cmdProbe\`, \`k8sProbe\`, and \`promProbe\`.

## The QA Shape Of A Chaos Experiment

A QA-owned chaos test should read like a failure story with a measurable ending: if one checkout pod disappears, the service stays available; if the product API sees 300 ms network latency, p95 remains below the release limit; if one pod burns CPU, autoscaling catches up without dropping writes. That is different from an SRE fire drill. QA is not just proving that infrastructure can absorb pain. QA is verifying a product behavior under an injected fault.

Litmus gives you the building blocks. ChaosCenter is the control plane where teams create, schedule, and analyze experiments. Chaos infrastructure is the execution plane component that connects the control plane to a target environment. Chaos faults are the specific disruptions, such as \`pod-delete\`, \`pod-network-latency\`, and \`pod-cpu-hog\`. Probes express steady-state checks and become part of the verdict.

| QA question | Litmus object or feature | Evidence to keep |
| --- | --- | --- |
| Can the service survive one replica disappearing? | \`pod-delete\` fault | \`ChaosResult\`, deployment events, HTTP probe history |
| Does latency injection break the checkout SLO? | \`pod-network-latency\` plus \`promProbe\` | Prometheus query result, application latency dashboard |
| Does CPU pressure trigger recovery without failed orders? | \`pod-cpu-hog\` plus \`cmdProbe\` or \`k8sProbe\` | HPA events, pod CPU, order-count check |
| Can the pipeline block a risky release? | litmusctl, API, or GitOps schedule | CI log, experiment run status, fault logs |

Litmus is adjacent to tools like [Chaos Mesh for Kubernetes testing](/blog/chaos-mesh-kubernetes-testing-guide), but the operating model is different enough to matter. Litmus leans into a control plane and reusable experiment workflow. Chaos Mesh often feels closer to Kubernetes-native chaos CRDs managed directly by platform teams. A QA team choosing between them should compare who will author experiments, who will approve blast radius, and where the verdict must be consumed.

## Install ChaosCenter Without Hiding The Blast Radius

The Litmus installation page lists Kubernetes 1.17 or later, Helm 3 or kubectl, and persistent storage for ChaosCenter state. The docs recommend 20 GB of persistent volume for production-like use and note that a smaller volume can work for test purposes. They also describe self-hosted installation through Helm or kubectl manifests, plus a hosted option through Harness Chaos Engineering SaaS.

For most QA teams, Helm is the clean starting point because it gives you an upgrade story and a clear namespace boundary. Install ChaosCenter in a namespace such as \`litmus\`, then connect target chaos infrastructure from the same or another cluster.

\`\`\`bash
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm repo update

kubectl create namespace litmus --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install chaos litmuschaos/litmus --namespace litmus --set portal.frontend.service.type=ClusterIP

kubectl -n litmus get pods
kubectl -n litmus get svc
\`\`\`

For local evaluation, the docs show NodePort examples and also mention port-forwarding the frontend service. In shared clusters, prefer private access through port-forwarding, internal ingress, or a controlled load balancer. Do not expose a default lab install to the internet just because a quickstart used NodePort.

\`\`\`bash
kubectl -n litmus rollout status deploy/chaos-litmus-frontend
kubectl -n litmus port-forward svc/chaos-litmus-frontend-service 9091:9091
\`\`\`

The docs state that default credentials are \`admin\` and \`litmus\` on a fresh install. Change them before inviting teammates or connecting production-like targets. For a QA lab, that may sound ceremonial, but chaos tooling can delete pods, stress nodes, and add network faults. Treat it like a deployment system, not like a dashboard.

## Architecture QA Engineers Actually Touch

The Litmus control plane stores users, projects, experiment definitions, schedules, ChaosHub data, and run information. The execution plane injects faults into the target environment. In 3.x wording, the old delegate or agent terminology changed to chaos infrastructure, and the old scenario/workflow language changed toward experiments and faults.

That rename matters when reading old blog posts, generated manifests, or AI agent output. An assistant may say "create a chaos workflow with an agent" because it learned from Litmus 2.x examples. In current Litmus 3.x conversation, ask for the chaos infrastructure, experiment, and fault names. The underlying CRDs such as \`ChaosEngine\` and \`ChaosResult\` are still relevant when you inspect Kubernetes-side execution.

| Term | Current QA meaning | Common confusion |
| --- | --- | --- |
| ChaosCenter | UI and APIs for experiments, schedules, analytics, and projects | Not the component that directly kills the pod |
| Chaos infrastructure | Execution-plane connection to a target cluster or namespace | Older docs may call this agent or delegate |
| Chaos fault | The actual failure action, such as pod delete or network latency | Older docs may call this experiment |
| Resilience probe | Reusable check that affects verdict | Not just a dashboard alert |
| \`ChaosResult\` | Kubernetes custom resource holding verdict details | Easy to miss if the UI summarizes the run |

If your organization is building a broader practice around [chaos engineering resilience testing](/blog/chaos-engineering-resilience-testing), keep these words consistent in tickets and runbooks. Most confusion in early chaos adoption is not about YAML. It is about whether the team is discussing a platform component, a planned experiment, a single fault, or the pass criteria.

## Start With Pod Delete, Not A Dramatic Failure

The \`pod-delete\` fault is the right first experiment because Kubernetes should already know how to recover from it. If a Deployment with multiple replicas and a readiness probe cannot survive one pod deletion in staging, a larger chaos catalog will only produce more noise.

The experiment reference describes \`pod-delete\` as a pod-level fault and lists tunables for common behavior, force delete, multiple iterations, random interval, and deterministic pod termination. The example below scopes the target to a Deployment labelled \`app=checkout-api\` in the \`shop\` namespace and adds an HTTP probe that checks a cluster-local health endpoint.

\`\`\`yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: checkout-pod-delete
  namespace: shop
spec:
  engineState: active
  appinfo:
    appns: shop
    applabel: app=checkout-api
    appkind: deployment
  chaosServiceAccount: pod-delete-sa
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"
            - name: CHAOS_INTERVAL
              value: "15"
            - name: FORCE
              value: "false"
        probe:
          - name: checkout-health-during-pod-delete
            type: httpProbe
            httpProbe/inputs:
              url: http://checkout-api.shop.svc.cluster.local/health
              insecureSkipVerify: false
              responseTimeout: 2000
              method:
                get:
                  criteria: ==
                  responseCode: "200"
            mode: Continuous
            runProperties:
              probeTimeout: 5
              interval: 5
              retry: 2
              probePollingInterval: 5
              initialDelaySeconds: 10
              stopOnFailure: true
\`\`\`

This manifest is intentionally boring. The service account name is specific to the fault RBAC you install from the Litmus experiment catalog. The duration is short. \`FORCE\` is false. The probe uses the service DNS name, not a public ingress that might hide cluster-local failure. The result should answer one question: did customer-visible health stay good while a pod disappeared?

## Resilience Probes Are The Test, Not Decoration

The official probe docs define probes as checks inside \`.spec.experiments[].spec.probe\` that contribute to the experiment verdict. They support five modes: \`SOT\` at start, \`EOT\` at end, \`Edge\` before and after, \`Continuous\` during injection, and \`OnChaos\` strictly during the chaos duration. Run properties include \`probeTimeout\`, \`retry\`, \`interval\`, \`probePollingInterval\`, \`initialDelaySeconds\`, and \`stopOnFailure\`.

| Probe type | Use it for | Fields worth reviewing |
| --- | --- | --- |
| \`httpProbe\` | Availability checks and simple API expectations | \`url\`, \`responseTimeout\`, method criteria |
| \`cmdProbe\` | Domain checks that need a shell command or tool image | \`command\`, comparator type, optional source image |
| \`k8sProbe\` | Kubernetes object state checks | group, version, resource, namespace, field selector, label selector |
| \`promProbe\` | Metrics-based SLOs | \`endpoint\`, \`query\` or \`queryPath\`, comparator |

What people get wrong: they treat probes as alerts attached to chaos. A probe is more strict than an alert because it gates the experiment verdict. If your Prometheus alert waits five minutes but your chaos lasts sixty seconds, copying the alert expression may never prove the release risk. Decide whether the experiment should fail on a single bad sample, a sustained SLO breach, or a post-chaos recovery miss.

\`\`\`yaml
probe:
  - name: checkout-p95-under-500ms
    type: promProbe
    promProbe/inputs:
      endpoint: http://prometheus-operated.monitoring.svc.cluster.local:9090
      query: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace="shop",service="checkout-api"}[2m])) by (le))
      comparator:
        criteria: <
        value: "0.5"
    mode: Continuous
    runProperties:
      probeTimeout: 5
      interval: 5
      retry: 2
      probePollingInterval: 10
      initialDelaySeconds: 20
      stopOnFailure: true
\`\`\`

A \`cmdProbe\` can validate a data-plane fact that HTTP status misses. Keep it small and deterministic. If the check needs custom binaries, use source mode with a purpose-built image rather than relying on whatever happens to be inside the experiment pod.

\`\`\`yaml
probe:
  - name: orders-counter-still-increases
    type: cmdProbe
    cmdProbe/inputs:
      command: |
        wget -qO- http://orders-api.shop.svc.cluster.local/internal/count
      comparator:
        type: int
        criteria: ">"
        value: "1000"
      source:
        image: busybox:1.36
        imagePullPolicy: IfNotPresent
    mode: EOT
    runProperties:
      probeTimeout: 10
      interval: 5
      retry: 3
      initialDelaySeconds: 5
\`\`\`

For Kubernetes state, use a \`k8sProbe\` when the expected recovery lives in the cluster API: a Deployment returns to available, an HPA scales, or a PodDisruptionBudget still has allowed disruptions. The exact selector fields depend on the probe schema, so copy the current experiment reference rather than translating from memory.

## Network Latency And CPU Hog Without Fooling Yourself

After pod deletion, teams usually try latency and resource pressure. \`pod-network-latency\` introduces network delay against selected pods. \`pod-cpu-hog\` consumes CPU on selected pods. Both can produce false confidence if the target selector is broad or if the application path under test does not actually call the delayed dependency.

Use latency for dependency contracts: can checkout tolerate slower inventory reads, or does it retry until the queue backs up? Use CPU hog for resource isolation: does one noisy pod starve the node, or are requests and limits containing damage?

\`\`\`yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: inventory-network-latency
  namespace: shop
spec:
  engineState: active
  appinfo:
    appns: shop
    applabel: app=inventory-api
    appkind: deployment
  chaosServiceAccount: pod-network-latency-sa
  experiments:
    - name: pod-network-latency
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: NETWORK_LATENCY
              value: "300"
            - name: JITTER
              value: "50"
            - name: TARGET_CONTAINER
              value: inventory-api
        probe:
          - name: checkout-still-accepts-carts
            type: httpProbe
            httpProbe/inputs:
              url: http://checkout-api.shop.svc.cluster.local/health
              responseTimeout: 2500
              method:
                get:
                  criteria: ==
                  responseCode: "200"
            mode: Continuous
            runProperties:
              probeTimeout: 5
              interval: 5
              retry: 1
              probePollingInterval: 5
              stopOnFailure: true
\`\`\`

\`\`\`yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: checkout-cpu-hog
  namespace: shop
spec:
  engineState: active
  appinfo:
    appns: shop
    applabel: app=checkout-api
    appkind: deployment
  chaosServiceAccount: pod-cpu-hog-sa
  experiments:
    - name: pod-cpu-hog
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "90"
            - name: CPU_CORES
              value: "1"
            - name: TARGET_CONTAINER
              value: checkout-api
        probe:
          - name: checkout-deployment-available-after-cpu
            type: k8sProbe
            k8sProbe/inputs:
              group: apps
              version: v1
              resource: deployments
              namespace: shop
              fieldSelector: metadata.name=checkout-api
              labelSelector: app=checkout-api
              operation: present
            mode: EOT
            runProperties:
              probeTimeout: 10
              interval: 5
              retry: 6
              initialDelaySeconds: 15
\`\`\`

The \`k8sProbe\` shown is deliberately used as a recovery check, not as proof of user experience. Pair it with HTTP or Prometheus evidence. A Deployment can be present while users are seeing timeouts.

## CI Gating With litmusctl Or Kubernetes Evidence

Litmusctl is the command-line companion documented for managing Litmus accounts, projects, and chaos infrastructure. Exact command flows vary by how your ChaosCenter is exposed and authenticated, so pin your CI wrapper to the litmusctl version your platform team supports. The design goal is stable: trigger an experiment, wait for run completion, then fail the pipeline if the experiment verdict or resilience score is below the release gate.

Some teams drive Litmus through API or GitOps instead of litmusctl. Others apply \`ChaosEngine\` resources directly for a narrow lab. Direct Kubernetes apply is easy to reason about, but it bypasses some ChaosCenter scheduling and analytics workflow. Use it for focused QA environments, not as a stealth production chaos path.

\`\`\`bash
set -euo pipefail

kubectl -n shop apply -f chaos/pod-delete-checkout.yaml

for attempt in $(seq 1 60); do
  verdict="$(kubectl -n shop get chaosresult checkout-pod-delete-pod-delete -o jsonpath='{.status.experimentStatus.verdict}' 2>/dev/null || true)"

  if [ "$verdict" = "Pass" ]; then
    kubectl -n shop get chaosresult checkout-pod-delete-pod-delete -o yaml > chaos-result.yaml
    exit 0
  fi

  if [ "$verdict" = "Fail" ] || [ "$verdict" = "Stopped" ]; then
    kubectl -n shop get chaosresult checkout-pod-delete-pod-delete -o yaml > chaos-result.yaml
    exit 1
  fi

  sleep 10
done

kubectl -n shop get chaosresult checkout-pod-delete-pod-delete -o yaml > chaos-result.yaml || true
exit 1
\`\`\`

This script assumes the \`ChaosResult\` name produced by your experiment. Confirm it in a lab with \`kubectl -n shop get chaosresult\` before wiring the pipeline. The important point is not that every organization should poll this exact JSONPath. The important point is that CI waits for the verdict, captures the object, and fails on a bad result.

\`\`\`yaml
name: checkout-chaos

on:
  workflow_dispatch:

jobs:
  litmus:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Configure kubectl
        run: |
          mkdir -p "$HOME/.kube"
          printf '%s' "$KUBE_CONFIG_B64" | base64 -d > "$HOME/.kube/config"
        env:
          KUBE_CONFIG_B64: \${{ secrets.QA_KUBE_CONFIG_B64 }}

      - name: Run checkout pod-delete chaos
        run: bash scripts/run-litmus-pod-delete.sh

      - name: Collect chaos evidence
        if: always()
        run: |
          mkdir -p artifacts
          kubectl -n shop get chaosengine,chaosresult,pods,events -o wide > artifacts/litmus-objects.txt
          kubectl -n shop describe chaosresult checkout-pod-delete-pod-delete > artifacts/chaos-result.txt || true

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: litmus-checkout-chaos
          path: artifacts
\`\`\`

Keep the artifact name free of slashes. More importantly, keep the run scoped to a non-production environment until you have approval, observability, rollback, and a stop mechanism.

## Reading ChaosResult Like A Test Report

The Litmus repository README describes \`ChaosResult\` as the resource that holds experiment run results, validation status, rollback status, and verdict. That makes it the closest thing to a test report in direct Kubernetes workflows. In ChaosCenter, the UI summarizes this information with experiment run details and resilience scoring. In Kubernetes, you inspect the CR.

| Field to inspect | What it tells QA | Typical action |
| --- | --- | --- |
| Verdict | Whether the fault and probes passed | Fail the release gate on \`Fail\` or \`Stopped\` |
| Probe status | Which steady-state check failed | Route to product, platform, or observability owner |
| Runner and experiment pod logs | Fault setup, injection, and rollback details | Debug RBAC, target selection, or probe configuration |
| Kubernetes events | Scheduling, deletion, readiness, and image issues | Separate Litmus problems from app behavior |

Do not collapse the result to a single green or red badge too early. A failed probe with successful fault rollback means the tool worked and the system did not meet the hypothesis. A failed setup with no target pods selected means the test did not run. A passed \`pod-delete\` with customer errors in Prometheus means your probe was too weak. Those are different engineering conversations.

## A Real Failure Mode: The Fault Passed, The Product Failed

Imagine the checkout team runs \`pod-delete\` against a three-replica Deployment. Litmus reports \`Pass\`. The \`ChaosResult\` says the pod was deleted and rollback completed. The release moves forward. Later, a node drain causes checkout errors.

Diagnosis shows the original HTTP probe hit \`/health\`, which returned 200 as long as the process was alive. During the chaos run, the application lost its Redis connection and rejected cart writes, but \`/health\` did not check Redis. Kubernetes restarted one pod, the remaining pods stayed ready, and the probe never touched the failing path.

The fix is not "use more chaos." The fix is to strengthen the hypothesis. Add an HTTP probe that exercises a cheap write path in a test tenant, or add a \`cmdProbe\` that checks a counter after the run. Add a \`promProbe\` for checkout 5xx rate during chaos. Keep \`/health\` as one signal, but do not confuse it with user behavior.

\`\`\`yaml
probe:
  - name: checkout-write-path-survives
    type: httpProbe
    httpProbe/inputs:
      url: http://checkout-api.shop.svc.cluster.local/test/cart
      responseTimeout: 2500
      method:
        post:
          body: '{"tenant":"chaos-ci","sku":"qa-widget","quantity":1}'
          bodyPath: ""
          contentType: json
          criteria: ==
          responseCode: "202"
    mode: Continuous
    runProperties:
      probeTimeout: 5
      interval: 5
      retry: 1
      probePollingInterval: 10
      stopOnFailure: true
\`\`\`

If your current probe schema or version requires slightly different POST body fields, follow the official HTTP probe reference for your installed chart. The modeling point remains: probe the behavior users need, not only the endpoint Kubernetes uses for liveness.

## Guardrails For Shared Clusters

QA teams often share staging clusters with developers, demos, and preview environments. Chaos experiments need guardrails that are both technical and social. Technical guardrails include namespace scoping, service-account RBAC per fault, labels that opt workloads into chaos, short durations, and event collection. Social guardrails include calendar windows, Slack announcements, owner approvals, and a rollback contact.

| Guardrail | Why it matters | Implementation clue |
| --- | --- | --- |
| Namespace mode | Prevents broad accidental impact | Install and connect chaos infrastructure with intended scope |
| Opt-in labels | Keeps selectors honest | Require \`chaos=enabled\` on target workloads |
| Fault-specific service accounts | Limits what a bad manifest can do | Use separate RBAC for pod delete, latency, and CPU hog |
| Short first durations | Reduces diagnosis noise | Start with 60 to 120 seconds |
| Stop path | Lets humans abort quickly | Document UI stop, API stop, or delete path before first run |

Litmus is powerful enough that the absence of a failure is meaningful only when the blast radius was real. But the blast radius must still be intentional. The best QA chaos programs do not start by "testing production." They start by making staging failure evidence trustworthy, then gradually move selected, low-risk hypotheses closer to production with owners watching.

## Frequently Asked Questions

### Is LitmusChaos still an active CNCF project?

Yes. The current docs identify LitmusChaos as a CNCF incubating project, and the public documentation shows an active 3.x line with 3.30.0 available. The GitHub repository describes Litmus as a 100 percent open source CNCF project. Because the terminology changed in 3.x, be cautious with older articles that mention agents, delegates, scenarios, or workflows. Map those concepts to chaos infrastructure, experiments, and faults before copying examples.

### Should QA teams use ChaosCenter or only Kubernetes manifests?

Use ChaosCenter when you want shared experiment authoring, schedules, analytics, projects, and a UI for reviewing runs. Use direct Kubernetes manifests for small, controlled lab checks where the team wants everything in Git and CI. Many teams use both: ChaosCenter for program-level visibility, and checked-in manifests for release gates. The key is that every path must preserve the hypothesis, target scope, probe configuration, and result evidence.

### Which LitmusChaos fault should be first?

Start with \`pod-delete\` on a multi-replica, non-critical service in staging. It validates target selection, RBAC, probes, event collection, and team response without requiring complex kernel or network assumptions. Once the team can explain a pod-delete pass or fail from evidence, move to \`pod-network-latency\` for dependency behavior or \`pod-cpu-hog\` for resource isolation. Avoid dramatic node-level faults until the basics are boring.

### What makes a LitmusChaos run useful in CI?

A useful CI run has a narrow target, a short duration, explicit probes, a deterministic verdict check, and artifacts captured on both pass and fail. The pipeline should not merely apply a manifest and sleep. It should wait for completion, read \`ChaosResult\` or the platform run status, collect logs and events, then fail the job when the verdict fails. That makes chaos a release signal instead of a scheduled disturbance.
`,
};
