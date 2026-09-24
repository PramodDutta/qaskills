import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Operator Kubernetes Guide: Distributed Load Testing Without Leaving Your Cluster',
  description: 'Use k6 operator kubernetes runs to split load across pods, wire results into CI, avoid skewed segments, and debug cluster failures cleanly today.',
  date: '2026-09-24',
  category: 'Performance',
  content: `
# k6 Operator Kubernetes Guide: Distributed Load Testing Without Leaving Your Cluster

The k6 Operator lets a QA team run distributed k6 load tests as Kubernetes custom resources. Instead of SSHing into generator machines or asking an AI coding agent to invent a shell loop, you apply a \`TestRun\` object, point it at a script in a ConfigMap, PVC, or runner image, and let the operator create initializer, runner, and starter pods for the execution.

Use the k6 operator kubernetes path when the system under test is reachable only from inside the cluster, when you want load generators scheduled with normal Kubernetes controls, or when CI should leave behind Kubernetes events, pod logs, and metrics that can be inspected after a failed run. Do not use it as a magic scale button. It partitions execution, but your script, thresholds, data seeding, image choice, node capacity, and result output still determine whether the test proves anything.

The current official docs and generated CRD reference show \`apiVersion: k6.io/v1alpha1\`, \`kind: TestRun\`, \`spec.parallelism\`, \`script.configMap\`, \`script.volumeClaim\`, \`script.localFile\`, \`arguments\`, newer \`args\`, \`separate\`, \`cleanup: post\`, and the \`PrivateLoadZone\` CRD for Grafana Cloud k6 private load zones. The older \`K6\` kind appears in older examples and discussions, but new work should start with \`TestRun\`.

## When The Operator Is The Right Load Generator

A useful distributed test has two jobs. It must apply enough pressure to expose the performance behavior you care about, and it must keep the measurement path honest. Kubernetes helps with the second job because it makes generator placement, resource limits, logs, service account permissions, and cleanup visible. The operator helps with the first job by splitting k6 execution across multiple runner pods.

The usual trigger is a single k6 process running out of CPU, memory, open sockets, or network throughput before the application is stressed. Moving to \`parallelism: 8\` gives k6 eight runner pods, but it also gives you eight opportunities to create bad data, eight logs to inspect, and eight processes that need the same script archive. Your test is distributed only if the work is partitioned. If every runner repeats the full workload with the same accounts, the system sees a pile of duplicate journeys, not one coherent large test.

| Scenario | k6 Operator fit | Reason |
| --- | --- | --- |
| Internal API reachable only through cluster DNS | Strong | Runners resolve the same service names as other workloads |
| Browser-heavy user journey | Conditional | It can run, but pod CPU and image size become the design constraint |
| Public endpoint from many geographic regions | Weak by itself | You need public cloud zones or multiple clusters, not one cluster placement |
| Nightly performance regression in staging | Strong | CI can apply a \`TestRun\`, watch status, collect logs, then clean up |
| One-minute smoke check after deploy | Usually unnecessary | A plain \`k6 run\` job is simpler unless cluster-only networking matters |

The operator should not be the first thing you add to a shaky k6 script. First make the script deterministic on one machine. Add thresholds that prove both latency and correctness. Remove shared mutable test data. Then lift the same script into Kubernetes and compare the single-runner result with the operator result at \`parallelism: 1\`. That comparison catches bad DNS, missing environment variables, blocked egress, and image differences before you scale.

## Install Path That Does Not Surprise CI

The official install page documents three paths: bundle, Helm, and Makefile. Bundle and Helm install the latest official release by default. The Makefile path is meant for development or for teams that already have a kustomize pipeline, and the docs recommend checking out a tagged release for production use.

For QA infrastructure, Helm is usually the least awkward because it gives you release history and an upgrade path. Bundle is fine for a temporary lab. Makefile is useful when platform engineering owns a fork or when you need to pin manifests in a larger repo.

\`\`\`bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm upgrade --install k6-operator grafana/k6-operator --namespace k6-operator-system --create-namespace

kubectl get crd testruns.k6.io privateloadzones.k6.io
kubectl -n k6-operator-system get deploy,pods
\`\`\`

The bundle route is shorter, but it hides change management inside a URL. If you use it in a bootstrap script, capture the manifest in source control for auditability.

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/grafana/k6-operator/main/bundle.yaml | kubectl apply -f -

kubectl -n k6-operator-system rollout status deploy/k6-operator-controller-manager
\`\`\`

By default, the operator watches \`TestRun\` and \`PrivateLoadZone\` objects in all namespaces. The docs list \`WATCH_NAMESPACE\` for one namespace and \`WATCH_NAMESPACES\` for a comma-separated list. Do not set both. In a shared staging cluster, a namespace watch is often the safer starting point because a failed experimental manifest in another team namespace cannot be reconciled by your controller.

| Installation choice | Use it when | Watch-out |
| --- | --- | --- |
| Helm chart | Shared QA or staging cluster | Keep chart values and CRDs reviewed together |
| Bundle YAML | Temporary proof of concept | Main branch URL can drift between test runs |
| Makefile from repo | Operator development or customized kustomize | Checkout a tag, not an arbitrary branch |

## A Minimal TestRun That QA Can Own

The basic workflow is three objects: the k6 script, the \`TestRun\`, and whatever output backend you choose. A ConfigMap is the easiest script source, but the docs call out a Kubernetes ConfigMap size limit of 1,048,576 bytes. Once your script grows into bundled modules, fixtures, certificates, or generated data, use a PVC or a custom image with \`script.localFile\`.

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failedCheckout = new Rate('checkout_failed');

export const options = {
  scenarios: {
    steady_checkout: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 80,
      maxVUs: 180,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<450'],
    checkout_failed: ['rate<0.01'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://checkout-api.default.svc.cluster.local';
  const res = http.get(\`\${baseUrl}/health\`, {
    tags: { route: 'health' },
  });

  const healthy = check(res, {
    'health returned 200': (r) => r.status === 200,
    'health body says ok': (r) => r.body && r.body.includes('ok'),
  });

  failedCheckout.add(!healthy);
  sleep(1);
}
\`\`\`

\`\`\`bash
kubectl create namespace qa-load
kubectl -n qa-load create configmap checkout-k6-script --from-file=test.js=./test.js
\`\`\`

\`\`\`yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: checkout-steady-load
  namespace: qa-load
spec:
  parallelism: 4
  cleanup: post
  separate: true
  script:
    configMap:
      name: checkout-k6-script
      file: test.js
  arguments: --tag testid=checkout-steady --summary-trend-stats avg,min,med,p(90),p(95),p(99),max
  runner:
    env:
      - name: BASE_URL
        value: http://checkout-api.default.svc.cluster.local
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: "1"
        memory: 1Gi
  starter:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 250m
        memory: 256Mi
\`\`\`

\`\`\`bash
kubectl apply -f testrun-checkout.yaml
kubectl -n qa-load get testrun checkout-steady-load -w
kubectl -n qa-load get pods -l k6_cr=checkout-steady-load
\`\`\`

The field \`separate: true\` asks the operator to use pod anti-affinity as a quick way to spread runners across different hostnames. It is not a capacity guarantee. If the cluster has two nodes and \`parallelism: 8\`, some runners must share nodes. Treat it as a hint that improves the default, then verify actual placement with \`kubectl get pods -o wide\`.

## How Work Is Split Across Runners

k6 supports execution segments, and the official options reference describes \`--execution-segment\` and \`--execution-segment-sequence\` as the way to partition a test. The operator uses the same concept so runners cover different slices of the test instead of each running all iterations. Conceptually, \`parallelism: 4\` should behave like four non-overlapping segments over one sequence:

| Runner | Segment | Meaning |
| --- | --- | --- |
| runner 1 | \`0:1/4\` | First quarter of the planned execution |
| runner 2 | \`1/4:1/2\` | Second quarter |
| runner 3 | \`1/2:3/4\` | Third quarter |
| runner 4 | \`3/4:1\` | Final quarter |

This matters for assertions. A distributed arrival-rate scenario should preserve the total requested arrival rate across the test, not multiply it by the number of pods. A hand-written loop of four Kubernetes Jobs running \`k6 run test.js\` often multiplies the rate. That is useful for a crude stress blast, but it is not the same as a partitioned k6 run and it makes threshold comparison hard.

Where people get this wrong: they add \`parallelism\` to compensate for an overloaded generator, but they leave the target data model serialized. For example, every runner uses \`user-001@example.test\` and a shared cart. Lock contention in the application then looks like a backend performance regression. The operator did its part. The script did not. Build data selection from the k6 execution context or from a pre-split data file so each runner and VU gets an independent account.

\`\`\`javascript
import exec from 'k6/execution';
import http from 'k6/http';
import { check } from 'k6';

const accounts = [
  'buyer-001@example.test',
  'buyer-002@example.test',
  'buyer-003@example.test',
  'buyer-004@example.test',
  'buyer-005@example.test',
  'buyer-006@example.test',
  'buyer-007@example.test',
  'buyer-008@example.test',
];

export const options = {
  vus: 8,
  duration: '2m',
  thresholds: {
    checks: ['rate>0.99'],
  },
};

export default function () {
  const account = accounts[exec.vu.idInTest % accounts.length];
  const res = http.post('http://checkout-api.default.svc.cluster.local/cart', JSON.stringify({
    account,
    sku: 'qa-widget',
  }), {
    headers: { 'content-type': 'application/json' },
    tags: { account_bucket: String(exec.vu.idInTest % accounts.length) },
  });

  check(res, {
    'cart mutation accepted': (r) => r.status === 202,
  });
}
\`\`\`

For very large account pools, do not put a multi-megabyte JSON fixture in a ConfigMap. Archive the script with k6, mount a PVC, or bake the data into a custom runner image. The operator supports all three source patterns, and the choice should match how often the script changes.

## Script Sources: ConfigMap, PVC, And LocalFile

ConfigMaps are best for short scripts and quick review. PVCs are best for large script bundles, generated archives, or data files produced by another pipeline step. \`localFile\` is best when the runner image is the artifact under test: the image contains the exact script, helper modules, CA bundle, and extension-enabled k6 binary you want to run.

| Source | CRD field | Good fit | Failure smell |
| --- | --- | --- | --- |
| ConfigMap | \`script.configMap.name\` and \`file\` | Small JavaScript or \`archive.tar\` | Missing key, ConfigMap too large, stale data |
| PVC | \`script.volumeClaim.name\` and optional \`file\` | Shared generated artifacts | Mounted path lacks \`/test/test.js\` or wrong access mode |
| Runner image | \`script.localFile\` plus \`runner.image\` | Locked release artifact or custom k6 extensions | Image tag drift or missing entrypoint file |

\`\`\`yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: checkout-pvc-archive
  namespace: qa-load
spec:
  parallelism: 6
  cleanup: post
  script:
    volumeClaim:
      name: k6-script-bundle
      file: archive.tar
      readOnly: true
  args:
    - --tag
    - suite=checkout
    - --out
    - experimental-prometheus-rw
  runner:
    env:
      - name: K6_PROMETHEUS_RW_SERVER_URL
        value: http://prometheus-receiver.monitoring.svc.cluster.local:9090/api/v1/write
\`\`\`

Notice \`args\` in that manifest. The generated CRD reference says \`arguments\` is a space-separated string and recommends \`args\` for values that contain spaces or quotes. That distinction is easy to miss when an AI agent patches YAML. Use \`arguments\` for short k6 flags and \`args\` when you want Kubernetes-style list semantics.

## CI Flow With A Real Pass Or Fail Signal

A CI job that only applies a \`TestRun\` and exits has not tested anything. It has scheduled a test. The pipeline should create or update the script ConfigMap, apply the CR, wait for completion, capture logs, and fail if k6 thresholds fail or the pods fail. Artifact names in GitHub Actions cannot contain \`/\`, so use names like \`k6-checkout-logs\`, not \`k6/checkout/logs\`.

\`\`\`yaml
name: checkout-load

on:
  workflow_dispatch:
  schedule:
    - cron: '30 2 * * *'

jobs:
  k6-operator:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22

      - name: Configure kubectl
        run: |
          mkdir -p "$HOME/.kube"
          printf '%s' "$KUBE_CONFIG_B64" | base64 -d > "$HOME/.kube/config"
        env:
          KUBE_CONFIG_B64: \${{ secrets.QA_KUBE_CONFIG_B64 }}

      - name: Apply k6 script
        run: |
          kubectl create namespace qa-load --dry-run=client -o yaml | kubectl apply -f -
          kubectl -n qa-load create configmap checkout-k6-script --from-file=test.js=tests/performance/checkout.js --dry-run=client -o yaml | kubectl apply -f -

      - name: Run TestRun
        run: |
          kubectl apply -f deploy/k6/checkout-testrun.yaml
          kubectl -n qa-load wait --for=condition=TestRunRunning testrun/checkout-steady-load --timeout=180s
          kubectl -n qa-load wait --for=condition=TestRunFinished testrun/checkout-steady-load --timeout=20m

      - name: Collect logs
        if: always()
        run: |
          mkdir -p artifacts
          kubectl -n qa-load get testrun,pods,jobs -o wide > artifacts/k6-objects.txt
          kubectl -n qa-load logs -l k6_cr=checkout-steady-load --all-containers=true --prefix=true > artifacts/k6-pods.log

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: k6-checkout-logs
          path: artifacts
\`\`\`

The condition names above are worth validating against your installed operator before you freeze the workflow. If your cluster reports different status fields or condition names, use \`kubectl -n qa-load get testrun checkout-steady-load -o yaml\` and adapt the wait step. The principle is stable: wait on the custom resource or owned jobs, not on an arbitrary sleep.

## Output, Cloud, And Private Load Zones

You have three common result paths. First, read the end-of-test summary from pod logs. Second, send real-time metrics to an output such as Prometheus remote write. Third, use Grafana Cloud k6. The docs describe two Grafana Cloud k6 modes with the operator: cloud output from a \`TestRun\`, and \`PrivateLoadZone\` for a cloud-managed test that runs on your cluster nodes.

Cloud output uses normal k6 output syntax in the \`TestRun\`. The official page notes that cloud output supports \`parallelism\` of 20 or less. The token is supplied as a Kubernetes secret labelled \`k6cloud=token\` when the operator is installed with bundle or Helm. For deeper reporting patterns, pair this setup with [the k6 Cloud and Grafana Cloud guide](/blog/k6-cloud-grafana-cloud-complete-guide).

\`\`\`bash
: "\${K6_CLOUD_TOKEN:?set K6_CLOUD_TOKEN before creating the secret}"
kubectl -n k6-operator-system create secret generic my-cloud-token --from-literal=token="\${K6_CLOUD_TOKEN}" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n k6-operator-system label secret my-cloud-token k6cloud=token --overwrite
\`\`\`

\`\`\`yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: checkout-cloud-output
  namespace: qa-load
spec:
  parallelism: 8
  cleanup: post
  script:
    configMap:
      name: checkout-k6-script
      file: test.js
  arguments: --out cloud
\`\`\`

\`PrivateLoadZone\` is different. The k6 Operator README describes it as a CRD representing a Grafana Cloud k6 load zone, hosted inside your network by the operator. The generated CRD reference requires \`spec.token\` and \`spec.resources\` with CPU and memory limits for registration with Grafana Cloud k6. Use PLZ when you want Grafana Cloud k6 orchestration and storage, but the traffic must originate from your private cluster.

If your team is already standardizing reusable prompts and runbooks for AI coding agents, this is the spot where a ready-made QA skill from qaskills.sh can be useful: install the skill with the qaskills CLI, then customize the manifest and CI watch logic for your cluster.

## Diagnosing A Real Failure Mode: Four Pods, Same Throughput

The most common disappointing first run is simple: \`parallelism: 4\` finishes, but throughput is almost identical to \`parallelism: 1\`. The application is not saturated, and the team concludes the operator is broken.

Start with the runner pods:

\`\`\`bash
kubectl -n qa-load get pods -l k6_cr=checkout-steady-load -o wide
kubectl -n qa-load top pods -l k6_cr=checkout-steady-load
kubectl -n qa-load logs -l k6_cr=checkout-steady-load --all-containers=true --prefix=true | tail -200
\`\`\`

If every pod is CPU-throttled, raise \`runner.resources.limits.cpu\` or reduce per-runner VUs. If only one runner is active, inspect the initializer and starter pod logs because the script may not have archived or distributed correctly. If all runners are active but the service sees the same request rate, inspect the k6 scenario. A \`constant-arrival-rate\` scenario partitions the total planned rate. If you expected four times more traffic, you should explicitly raise the scenario rate; \`parallelism\` is there to make the planned run feasible, not to redefine the test plan.

A second failure mode is a race in the pipeline. The CI step runs \`kubectl wait\` on pods that are later deleted because \`cleanup: post\` is enabled. The wait step passes on a transient condition, logs are gone, and the summary is missing. Keep \`cleanup: post\` for normal scheduled runs, but turn it off for a debugging branch, or collect logs while the run is still present. The official troubleshooting page points out that cleanup can make pod analysis harder.

## What AI Agents Commonly Patch Incorrectly

AI coding agents are excellent at turning a desired workflow into YAML, but k6 Operator manifests have a few traps that look plausible in review.

| Mistake | Why it is wrong | Safer correction |
| --- | --- | --- |
| Use \`kind: K6\` from an old snippet | Current docs center \`TestRun\` | Use \`apiVersion: k6.io/v1alpha1\` and \`kind: TestRun\` |
| Put a huge bundled script in a ConfigMap | ConfigMaps have size limits | Use \`k6 archive\` plus PVC, or \`localFile\` in a custom image |
| Set \`parallelism\` to match desired traffic multiplier | k6 segments partition the configured execution | Raise the scenario rate, then add runners to support it |
| Use \`arguments\` with complex quoting | It is one string | Prefer \`args\` for values containing spaces or quotes |
| Assert only that the \`TestRun\` exists | Scheduling is not success | Wait for finish and inspect k6 threshold exit behavior |

The deeper lesson is that distributed load testing is not a Kubernetes scheduling problem alone. It is a workload modeling problem. If you need the lower-level mechanics before you trust the operator path, work through [k6 execution segments for distributed tests](/blog/k6-execution-segments-distributed) and compare those command-line runs with one \`TestRun\` at \`parallelism: 4\`.

## Frequently Asked Questions

### Should I use k6 Operator or plain k6 in CI?

Use plain k6 when the target is public or reachable from the CI runner and one process can generate enough clean load. Use k6 Operator when the target is cluster-private, when you need multiple load-generator pods, or when Kubernetes logs and scheduling controls are part of the evidence. A good migration path is to run the same script locally, then as a \`TestRun\` with \`parallelism: 1\`, then increase \`parallelism\` only after results line up.

### Does parallelism multiply my requested request rate?

No, not in the way many teams assume. k6 execution segments are meant to split the configured execution across instances. If your script requests 120 iterations per second and the operator uses four runners, the intended distributed run is still the configured test, not automatically 480 iterations per second. To increase load, change the scenario rate, VUs, or duration, then use \`parallelism\` to give k6 enough generator capacity.

### When should I choose PrivateLoadZone instead of TestRun with cloud output?

Choose \`TestRun\` with \`--out cloud\` when Kubernetes should own the test execution and Grafana Cloud k6 should store and analyze results. Choose \`PrivateLoadZone\` when Grafana Cloud k6 should orchestrate the test while traffic originates from your private cluster. The PLZ model is especially useful for teams that already manage cloud tests centrally but need access to internal services.

### What should I keep after a failed distributed run?

Keep the \`TestRun\` YAML, the rendered script artifact, runner logs, initializer logs, starter logs, Kubernetes events, pod resource usage, and the target service metrics for the same time window. If \`cleanup: post\` deleted the objects too quickly, rerun with cleanup disabled in a debug namespace. Without the runner logs and pod placement, you cannot separate a k6 script issue from image, DNS, quota, or node-capacity problems.
`,
};
