import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chaos Mesh Kubernetes Testing Guide',
  description:
    'Chaos Mesh Kubernetes testing guide: design pod, network, DNS, IO, and stress experiments that expose resilience gaps before production incidents.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `# Chaos Mesh Kubernetes Testing Guide

A healthy Kubernetes deployment can still collapse when DNS stalls for ten seconds or one replica starts returning slowly under CPU pressure. Chaos Mesh gives QA and platform teams a Kubernetes-native way to create those failures on purpose, with experiments declared as custom resources instead of one-off shell tricks on nodes.

The value is not chaos for drama. The value is controlled evidence. You choose a namespace, a label selector, an experiment type, and a duration. Then you watch whether the service degrades gracefully, retries responsibly, alerts clearly, and recovers without manual cleanup. If you are shaping a broader resilience program, connect this guide with [chaos engineering resilience testing](/blog/chaos-engineering-resilience-testing). If your failure surface includes browser grids on containers, the operational context in [Selenium Grid 4 with Docker and Kubernetes](/blog/selenium-grid-4-docker-kubernetes-guide) is a useful companion.

## Where Chaos Mesh fits in a Kubernetes test strategy

Chaos Mesh runs inside Kubernetes and exposes experiments as Kubernetes custom resources. That makes it a natural fit for teams that already manage environments through YAML, GitOps, or platform pipelines. You can review experiments like code, apply them to staging clusters, and keep blast radius visible in the resource definition.

It should not be the first test a service ever sees. Unit tests, integration tests, contract checks, and load tests still matter. Chaos experiments answer a later question: when a dependency misbehaves in a realistic cluster, does the system stay within its resilience promises?

| Experiment family | Failure being modeled | Typical QA question |
|---|---|---|
| PodChaos | Pod kill, container kill, pod failure | Does the workload survive replica loss and reschedule cleanly? |
| NetworkChaos | Latency, packet loss, partition, bandwidth limit | Do clients retry within timeout budgets? |
| DNSChaos | DNS error or overridden domain response | What happens when service discovery lies or stalls? |
| StressChaos | CPU or memory pressure | Do resource limits and autoscaling protect the service? |
| IOChaos | Filesystem delay, fault, or attribute change | Can stateful components tolerate storage disruption? |
| HTTPChaos | HTTP delay, abort, replace, patch | Does an upstream HTTP failure produce a safe user response? |

## Installing with a testable blast radius

Chaos Mesh is commonly installed with Helm into its own namespace. In a shared cluster, treat installation as platform work because the controller needs permissions that application teams should not improvise. In a dedicated staging cluster, the setup can be simpler, but still document who is allowed to run experiments.

\`\`\`bash
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update
kubectl create ns chaos-mesh
helm install chaos-mesh chaos-mesh/chaos-mesh --namespace chaos-mesh
kubectl get pods -n chaos-mesh
\`\`\`

Before the first experiment, label a disposable workload. Do not target a namespace broadly until selectors have been rehearsed. A surprising amount of chaos damage comes from a selector that matched more pods than intended.

\`\`\`bash
kubectl create ns checkout-test
kubectl -n checkout-test create deployment checkout-api --image=nginx:1.27 --replicas=3
kubectl -n checkout-test label deployment checkout-api app=checkout-api
kubectl -n checkout-test get pods --show-labels
\`\`\`

This is not your real service, but it proves the controller is working and your selectors hit only the expected pods.

## Killing pods without pretending it is a full outage test

Pod chaos is the simplest starting point. It verifies that deployment replicas, readiness probes, disruption budgets, and service routing behave as expected when a pod disappears. It does not prove dependency resilience, database safety, or user-visible graceful degradation. Keep the claim narrow.

\`\`\`yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-one-checkout-pod
  namespace: checkout-test
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - checkout-test
    labelSelectors:
      app: checkout-api
  duration: "30s"
\`\`\`

Apply it, then watch both the application and Kubernetes events.

\`\`\`bash
kubectl apply -f kill-one-checkout-pod.yaml
kubectl -n checkout-test get pods -w
kubectl -n checkout-test describe deployment checkout-api
\`\`\`

The pass condition should be written before the experiment. For example: at least two replicas remain ready, no 5xx spike exceeds the service objective, and alerts identify replica loss without paging the wrong team.

## Injecting network latency between services

NetworkChaos is where many service assumptions become visible. A client timeout that was reasonable in a unit test can become a retry storm when latency is injected at the network layer. Start with latency before packet loss or partitions because latency gives you clearer signals about budgets.

\`\`\`yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: checkout-to-payment-latency
  namespace: checkout-test
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - checkout-test
    labelSelectors:
      app: checkout-api
  delay:
    latency: "800ms"
    correlation: "25"
    jitter: "100ms"
  duration: "2m"
\`\`\`

Pair the experiment with real traffic. Synthetic health checks alone may not exercise the slow path. A short k6, Locust, or application-level smoke script can keep requests flowing while the chaos resource is active.

| Observation | Healthy interpretation | Risk signal |
|---|---|---|
| Client latency rises but errors stay low | Timeout budget absorbs the delay | User experience may still need review |
| Errors spike immediately | Client timeout is too aggressive or retries are missing | Contract between services is brittle |
| CPU rises across many pods | Retries may be amplifying traffic | Retry policy needs backoff and cap |
| No alert fires | Monitoring misses dependency slowness | Add latency and saturation signals |

## Simulating DNS failures without changing application code

DNSChaos is useful because service discovery is usually assumed to be reliable until it is not. DNS failures expose whether clients cache addresses safely, whether error messages are actionable, and whether fallback logic exists only in design documents.

\`\`\`yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: DNSChaos
metadata:
  name: payment-dns-error
  namespace: checkout-test
spec:
  action: error
  mode: all
  selector:
    namespaces:
      - checkout-test
    labelSelectors:
      app: checkout-api
  patterns:
    - payment.checkout-test.svc.cluster.local
  duration: "90s"
\`\`\`

Run this only when the service path truly resolves the target through cluster DNS during the test. If the client has already cached the address, your experiment may appear to do nothing. That is not a Chaos Mesh problem. It is a test design issue.

## Stress experiments and resource-limit evidence

StressChaos can add CPU or memory pressure to selected pods. This is not a replacement for load testing. It answers a different question: if a container becomes resource constrained, do limits, requests, health probes, and autoscaling behavior protect the workload?

Be careful with memory stress. It can trigger OOM kills and noisy node behavior if applied too broadly. Start with a tiny namespace, short duration, and clear cleanup path.

\`\`\`yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: checkout-cpu-pressure
  namespace: checkout-test
spec:
  mode: one
  selector:
    namespaces:
      - checkout-test
    labelSelectors:
      app: checkout-api
  stressors:
    cpu:
      workers: 1
      load: 70
  duration: "1m"
\`\`\`

The expected result should reference service behavior, not only Kubernetes status. A pod can remain Running while the application misses every latency objective.

## Scheduling experiments without normalizing danger

Chaos Mesh supports scheduled experiments, but schedule them only after manual runs are understood. A nightly pod kill in staging can be valuable. A scheduled network partition across a shared integration namespace can waste a whole morning.

Use schedules for known experiments with tight selectors and bounded duration. Keep exploratory experiments manual. Every schedule should have an owner, a purpose, and a dashboard link. If nobody reads the result, the schedule is just background noise.

## Designing assertions around chaos

Chaos experiments need assertions just like API or UI tests. The assertion may not live in a unit test framework, but it must exist. Define steady-state metrics before injection, expected degradation during injection, and recovery criteria after the experiment ends.

Good assertions are observable: HTTP success rate, p95 latency, queue depth, retry count, pod readiness, alert state, or business event completion. Weak assertions sound like "the system should handle it" or "nothing bad should happen." Those cannot be automated or reviewed.

For CI-style runs, a shell script can apply the experiment, run traffic, query metrics, and delete the resource. For higher maturity, a pipeline step can publish the experiment YAML and the metric result together as evidence.

## Cleanup, safety, and auditability

Always know how to stop the experiment. Deleting the Chaos Mesh resource should end the injection, but teams should also know where the dashboard is and how to inspect active experiments. In shared clusters, restrict who can create chaos resources and which namespaces they can target.

Keep experiment YAML in the repository. Avoid ad hoc dashboard-only experiments for anything repeated. YAML gives you code review, history, and a way to reproduce a past incident test.

## Namespace strategy and RBAC for QA-owned experiments

Chaos testing becomes much safer when QA owns the experiment design but platform owns the guardrails. In Kubernetes, that usually means namespace boundaries and RBAC. A QA engineer may be allowed to create Chaos Mesh resources in \`checkout-test\`, but not in shared databases or production namespaces. That is a reasonable separation of responsibility.

Create dedicated chaos namespaces for early work. Put only the target workload and its disposable dependencies there. Once the experiment design is proven, move it to a more realistic staging namespace with approval. This staged path prevents the first YAML typo from becoming a platform incident.

RBAC should be boring and explicit. Avoid granting cluster-wide permissions to every test runner. If a CI job needs to run a pod kill experiment, bind it to the namespace and chaos resource types it needs. If a human wants to explore new experiment types, use a sandbox cluster or require a short approval path.

Also review service accounts used by the application. A pod kill test may restart a workload under a service account that lacks permissions after a recent chart change. That is useful evidence, but only if the experiment remains contained.

## Combining Chaos Mesh with traffic generation

An experiment without traffic often proves only that Kubernetes accepted the custom resource. To test resilience, the service needs realistic requests while the fault is active. The traffic does not need to be huge. It needs to cover the path affected by the fault.

For a checkout service, run a small script that creates carts, prices orders, and attempts payment authorization against a sandbox dependency. For an internal API, replay a short set of safe requests. For a queue consumer, publish messages with unique IDs and measure completion.

Traffic generation should start before the fault, continue during the fault, and run briefly after recovery. That gives you baseline, degraded, and recovered behavior. If you only measure during the fault, you may miss slow recovery. If you only measure after, you may miss user-facing errors.

Keep the load level stable. Chaos plus variable traffic is hard to interpret. If latency rises, you want to know whether the injected fault caused it, not whether the load script changed its arrival rate.

## Writing experiment charters

Before applying a chaos resource, write a short charter. It does not need to be bureaucratic. It should answer five questions: what failure is being injected, which workload is targeted, what steady state is expected, what metrics prove pass or fail, and how the experiment is stopped.

| Charter field | Example for DNSChaos | Why it matters |
|---|---|---|
| Failure hypothesis | Payment DNS lookup fails for checkout pods | Names the exact dependency risk |
| Target selector | Namespace checkout-test, label app checkout-api | Prevents accidental blast radius |
| Steady-state metric | Checkout creates test orders with less than 2 percent 5xx | Defines normal behavior before injection |
| Degraded expectation | User receives retryable payment message, no duplicate ledger entry | Connects infrastructure fault to product safety |
| Stop condition | Delete DNSChaos resource or abort after 90 seconds | Makes recovery action explicit |

Charters make chaos tests reviewable. They also help after a failed run because the team can compare what happened against a written expectation instead of reconstructing intent from chat.

## Stateful services need extra caution

Chaos Mesh can target IO and stress behavior, but stateful services deserve a higher bar. Killing an application pod is different from injecting disk faults into a database. Before testing storage faults, confirm backups, restore procedures, test data isolation, and ownership. Many QA teams should start by testing how application clients behave when the database is slow or unavailable, not by corrupting storage behavior directly.

For stateful workloads, prefer a clone or disposable environment. Validate that the application returns controlled errors, stops accepting unsafe writes, and resumes cleanly when the dependency returns. If the experiment can affect data integrity, involve database owners before it enters a shared pipeline.

Chaos testing should never become an excuse to surprise teams responsible for persistence. The discipline is controlled learning.

## Reading failed experiments productively

A failed chaos experiment is not automatically a failed team. It is evidence. The valuable question is what the system did and whether that behavior was acceptable. Did retries amplify traffic? Did the UI show a misleading success? Did an alert fire with the wrong service name? Did recovery require manual pod deletion?

Capture the timeline. Record when traffic started, when the fault began, when metrics changed, when alerts fired, and when recovery completed. Timelines help distinguish application bugs from observability gaps and platform behavior.

After the fix, rerun the same experiment with the same selector and traffic profile. Changing too many variables makes the improvement hard to prove.

## Turning incident history into Chaos Mesh experiments

The best chaos backlog usually comes from incidents, not imagination. If production once suffered from slow DNS, a misconfigured readiness probe, or a dependency timeout, turn that failure into a controlled experiment. The experiment should reproduce the condition that mattered, not every detail of the incident.

Start with the user-visible symptom and work backward. If customers saw checkout timeouts because payment DNS failed, a DNSChaos experiment against the payment host is more useful than a random pod kill. If an overloaded recommendation service caused thread starvation, StressChaos or NetworkChaos may match the risk better.

Each incident-derived experiment should include the remediation that was supposed to fix it. That makes the rerun a regression test for resilience. When the experiment passes, the team has evidence that the specific class of failure is less likely to repeat silently.

## Keeping experiments readable in Git

Name experiment files after the failure they model, not after the Chaos Mesh kind alone. \`payment-dns-error.yaml\` is more useful than \`dnschaos.yaml\`. Put selectors near the top of the review discussion, and include a short comment in the pull request explaining the expected steady state. YAML is executable, but it is also operational documentation.

## Frequently Asked Questions

### Should Chaos Mesh run in production?

Only mature teams with strong blast-radius controls should consider production experiments. Most QA teams should start in staging with realistic traffic, clear selectors, and short durations.

### How do I avoid targeting the wrong pods?

Use dedicated namespaces, specific labels, and a dry rehearsal on disposable workloads. Review selectors like production code because a broad selector is the most common chaos mistake.

### Is PodChaos enough to prove Kubernetes resilience?

No. Pod kills check replica and scheduling behavior. They do not cover slow dependencies, DNS failures, storage faults, or retry storms. Use them as the first step, not the whole program.

### What should I monitor during a NetworkChaos experiment?

Track client error rate, latency percentiles, retry volume, saturation, and alerts. Also inspect downstream services because retries can move the failure rather than contain it.

### Can Chaos Mesh experiments be part of CI?

Yes, for bounded experiments in disposable or isolated environments. Keep duration short, selectors narrow, cleanup automatic, and pass criteria tied to metrics rather than manual interpretation.
`,
};
