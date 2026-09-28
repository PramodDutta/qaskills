import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Steadybit Chaos Engineering Guide: Experiments, Advice, and CI Checks',
  description: 'Steadybit guide for QA engineers: design safe chaos experiments, add checks, wire CI gates, and diagnose resilience failures before releases ship.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Steadybit Chaos Engineering Guide: Experiments, Advice, and CI Checks

Steadybit is an active commercial chaos engineering and reliability testing platform. It has not been renamed or discontinued. The product is delivered primarily as a central SaaS platform with agents and extensions deployed into your environments, and the official pricing page currently describes Professional and Enterprise plans with a 30-day free trial rather than a permanent free community tier.

For QA and test-automation engineers, the practical answer is this: Steadybit is strongest when you want chaos experiments to behave like governed tests, not ad hoc fault scripts. You model a hypothesis, constrain blast radius with environments and teams, run attacks through discovered targets, and use checks to decide whether the run should pass, fail, abort, or be investigated. That makes it a good fit for teams that already have CI quality gates and want resilience evidence beside API, browser, contract, and load-test evidence.

The biggest mistake is treating Steadybit as a button that "does chaos." The platform gives you an experiment editor, Reliability Hub actions, advice, scheduling, API access, CLI workflows, and a GitHub Action, but the engineering value comes from a testable scenario: a dependency fails, the user-facing endpoint still works, monitoring detects the impact, and recovery happens within a stated window.

## Current Product Snapshot

The official docs describe Steadybit as an agent-based platform. The SaaS platform is the control plane, and the agent deployed in your system discovers targets such as hosts, containers, Kubernetes resources, and applications. Actions come from extensions. Without extensions, the only action available is a wait action, which is a useful reminder that Steadybit needs integrations to become a real test tool.

| Area | Current Steadybit behavior | QA implication |
| --- | --- | --- |
| Product status | Active commercial SaaS with optional on-prem installation for Enterprise customers | Budget and procurement matter, but the docs and repositories show current maintenance |
| Execution model | Platform coordinates agents, agents talk to extensions, extensions discover targets and execute actions | Validate agent reachability before blaming an experiment design |
| Experiment authoring | Timeline-based editor, templates, imports, API, and CLI workflows | Humans can design once, then agents can version and review definitions |
| Safety controls | Environments, teams, permissions, emergency stop, validation errors, and preflight options | Treat blast radius as a test fixture, not a checkbox |
| CI automation | Steadybit CLI and \`steadybit/run-experiment@v1\` GitHub Action | Run small, deterministic resilience checks after deploys or before promotions |
| Pricing | Professional and Enterprise plans, 30-day free trial on the official pricing page | Plan for a commercial tool evaluation instead of assuming open-source adoption |

The official installation docs also call out deployment options for agents: Docker, Kubernetes, host, and Windows. For Kubernetes, the install path relies on the Steadybit Helm repository and container registries. For tightly firewalled QA labs, the first test is not a pod deletion experiment. It is an environment connectivity check so the agent can register, discover, and keep its control-channel connection alive.

\`\`\`bash
curl -sfL https://get.steadybit.com/env-check.sh | sh -s
\`\`\`

That command is intentionally simple, but its result is operationally important. If the agent cannot reach the platform, package repositories, Helm chart repository, GitHub Container Registry, GitHub, or Docker image sources required by your deployment style, experiment runs will show technical errors before they ever test application resilience.

## Experiment Model For QA Engineers

A useful Steadybit experiment reads like a test case with a more realistic failure injector. It has a target, a hypothesis, a fault, a signal, and an exit rule. The Steadybit docs show an example where a shopping service depends on a downstream \`hot-deals\` deployment. The experiment isolates or disrupts that downstream service, checks an upstream endpoint, and then verifies recovery of Kubernetes readiness.

| Test-design concern | Steadybit construct | Example |
| --- | --- | --- |
| Scope | Environment and target query | Only deployments in \`checkout-staging\` namespace |
| Stimulus | Attack action from an extension | Restart pod, stop container, inject latency, disturb DNS, alter cloud resource |
| Oracle | Check action | HTTP check, Prometheus query, Datadog monitor, Kubernetes rollout status, Postman collection |
| Timebox | Step duration and recovery window | Inject 500 ms latency for 5 minutes, then require recovery inside 90 seconds |
| Evidence | Run timeline, step states, logs, metrics, artifacts | Attach run URL to release notes or CI summary |

The QA framing matters because chaos experiments otherwise drift into demonstrations. A demo says, "Let us kill a pod and see what happens." A test says, "When the product catalog backend is unavailable for 120 seconds, \`GET /products\` must continue returning successful responses using fallback data, alerts must fire, and all affected pods must become ready within 60 seconds after the fault ends."

Here is a minimal scenario inventory that a test lead can ask an AI coding agent to turn into Steadybit experiment candidates. This file is not a Steadybit import format. It is a reviewable team artifact that keeps the scenario crisp before anyone opens the experiment editor.

\`\`\`yaml
service: catalog-gateway
environment: staging
scenario: downstream product service unavailable
hypothesis:
  user_visible_result: product listing remains available with cached or partial data
  monitoring_result: product-service error monitor enters alerting state
  recovery_result: all catalog-gateway pods are ready within 60 seconds
fault:
  target: deployment/product-service
  action: isolate or stop containers
  duration: 120 seconds
checks:
  - type: http
    url: https://staging.example.com/products
    required_success_rate: 99
  - type: kubernetes
    resource: deployment/catalog-gateway
    expected_ready_replicas: 3
abort_conditions:
  - checkout error rate exceeds 1 percent
  - active production incident
\`\`\`

This kind of pre-work also helps with AI coding agents. Claude Code, Cursor, and Copilot are good at generating config diffs, CI snippets, and test-data manifests when the desired behavior is explicit. They are much less reliable when the prompt says "add chaos engineering" with no service boundary, environment, success threshold, or abort rule.

## Agent And Extension Setup

Steadybit separates discovery and execution from the platform through agents and extensions. The agent is the communication channel into your environment. Extensions provide concrete capabilities such as discovering Kubernetes objects, running checks, integrating observability tools, or executing attacks against infrastructure.

| Component | What it does | Typical QA setup check |
| --- | --- | --- |
| Agent | Registers with the platform and connects experiment runs to the environment | Confirm it appears online before scheduling any run |
| Extension | Supplies actions, checks, target discovery, or events | Confirm the expected actions appear in the platform |
| Environment | Limits which discovered targets can be selected | Avoid long-term use of \`Global\` except for early trials |
| Team permissions | Control which attacks and environments a group can operate on | Separate staging-only QA experiments from production-capable teams |
| State provider | Persists agent state so registrations and rollback data survive restarts | Use stable state for long-lived Kubernetes installations |

The official docs warn that \`Global\` contains every discovered target. It is fine for learning, but risky for regular operation. Create environments that reflect your QA topology: \`payments-staging\`, \`search-preprod\`, \`mobile-api-loadlab\`, or a bounded business capability. Then assign teams and attack permissions to those environments.

A Kubernetes installation usually starts with Helm values rather than a hand-written manifest. The exact chart values depend on your runtime and the extensions you enable. This example shows the shape of a narrow install command, with placeholders that should be stored in your secret manager or CI environment.

\`\`\`bash
helm repo add steadybit https://steadybit.github.io/helm-charts
helm repo update steadybit
helm upgrade steadybit-agent steadybit/steadybit-agent --install --namespace steadybit-agent --create-namespace --set agent.key="replace-with-agent-key" --set global.clusterName="qa-staging" --set extension-container.container.engine="containerd"
\`\`\`

Do not copy that into production without reviewing the official chart values for your cluster. The point is the dependency chain: the agent key identifies the tenant, \`global.clusterName\` becomes a discovery attribute you can use later, and the container engine setting must match the node runtime. A common failure mode is a container extension failing because it expects Docker paths while the node uses containerd.

For large clusters, extension auto-registration can also become noisy. The troubleshooting docs describe \`STEADYBIT_AGENT_EXTENSIONS_AUTOREGISTRATION_NAMESPACE\`, with a matching Helm value, to limit auto-registration to a namespace. That is useful when a QA team is allowed to deploy only inside one namespace.

\`\`\`yaml
agent:
  key: replace-with-agent-key
  registerUrl: https://platform.steadybit.com
  extensions:
    autoregistration:
      namespace: steadybit-agent
global:
  clusterName: qa-staging
extension-container:
  container:
    engine: containerd
rbac:
  roleKind: role
\`\`\`

## Designing A Narrow Failure Experiment

Start with an incident-shaped question. If your system had a recent outage because a cache cluster timed out, design a cache-latency experiment. If a queue consumer lagged and user confirmation emails were delayed, design a queue throughput experiment. If a downstream API returned 500s and your frontend showed a blank state, design an HTTP dependency failure experiment.

The experiment editor is timeline-based. That encourages a better structure than a single destructive step. A robust QA experiment often has five parts: steady-state check, optional baseline load, attack, during-attack assertion, and recovery assertion. Steadybit actions can represent attacks, checks, or load tests, so the timeline can express that test flow directly.

| Phase | Purpose | Example Steadybit action class |
| --- | --- | --- |
| Baseline | Prove the target is healthy before fault injection | HTTP check, Prometheus check, Kubernetes rollout status |
| Warm traffic | Make the effect observable in non-production | Load-test action or external traffic generator |
| Fault | Create the failure condition | Container, Kubernetes, network, cloud, Java, Kafka, or gateway attack from Reliability Hub |
| Guardrail | Abort when the blast radius exceeds the plan | HTTP check, monitor check, custom preflight, manual emergency stop |
| Recovery | Prove rollback and self-healing | Readiness check, endpoint check, monitor status, run timeline review |

For a service dependency test, keep the first run boring. Select one target, one fault, one user-facing endpoint, and one recovery signal. Resist the urge to stack CPU load, latency, pod deletion, DNS disruption, and cloud API throttling in the first experiment. That kind of combined test is valuable later, but it is a poor first diagnostic because failure attribution becomes guesswork.

This Playwright test is the type of steady-state check you can keep near the application repo. It is not a replacement for Steadybit checks, but it gives an AI coding agent a concrete user-facing assertion to preserve while wiring the chaos gate.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('product listing survives catalog dependency degradation', async ({ request }) => {
  const response = await request.get('/products');
  expect(response.status(), 'catalog endpoint should remain available').toBeLessThan(500);

  const body = await response.json();
  expect(Array.isArray(body.items), 'items array is present').toBe(true);
  expect(body.items.length, 'fallback or live products are visible').toBeGreaterThan(0);
  expect(String(body.source)).toMatch(/^(live|fallback|cache)$/);
});
\`\`\`

Notice the meaningful assertions: status class, response shape, visible items, and an anchored source regex. A weak test would only assert \`status() === 200\`, which misses partial outages hidden behind a cached shell or an empty list.

## Checks That Turn Chaos Into Tests

Steadybit actions are not only attacks. The docs explicitly include checks and load tests as action kinds. Checks are the difference between "we injected a fault" and "the system violated or satisfied the hypothesis."

You can use checks before attacks to prevent invalid runs, during attacks to catch user impact, and after attacks to verify recovery. In the official run-state model, failed checks can mark a run failed. Technical problems, such as a refused connection or disconnected agent, can mark it errored. QA reporting should separate those outcomes. A failed run is often useful product evidence. An errored run is usually infrastructure or setup debt.

| Check type | Good use | Bad use |
| --- | --- | --- |
| HTTP success rate | Validate a public or internal endpoint while a dependency is impaired | Checking only the faulted dependency, which proves the attack worked but not user resilience |
| Prometheus query | Assert saturation, queue depth, or error budget burn stayed within threshold | Querying a metric with missing labels and treating no data as success |
| Datadog monitor | Prove observability detects the injected issue | Depending on a monitor that has a long evaluation delay without adjusting experiment duration |
| Kubernetes rollout status | Confirm recovery after pod disruption | Using it as the only user-facing oracle |
| Postman collection | Reuse API smoke tests under failure conditions | Running a huge suite that makes root-cause timing impossible |

For CI, the check thresholds need to be stable enough that a failure points to a real regression. A 100 percent success target is reasonable for a deterministic staging endpoint with controlled traffic. It is unrealistic for a shared environment with unrelated deploys and noisy dependencies. In shared pre-production, use narrower target queries, isolated traffic, and thresholds that reflect the test objective.

## CI/CD Patterns With Steadybit

Steadybit can be automated through the API, the CLI, and the GitHub Action. The docs show CLI installation with \`npm install -g steadybit\`, followed by profile creation using an access token. The Marketplace action \`steadybit/run-experiment@v1\` accepts inputs including \`apiAccessToken\`, \`baseURL\`, \`experimentKey\`, \`externalId\`, \`expectedState\`, \`expectedFailureReason\`, and \`executionReason\`.

Use CI gates sparingly. A full chaos suite on every pull request will be slow and flaky. A better pattern is layered:

| Pipeline stage | Steadybit role | Pass condition |
| --- | --- | --- |
| Pull request | No live chaos, only lint experiment definitions or scenario files | Experiment metadata and target labels are reviewable |
| Deploy to staging | Run one narrow experiment against the changed service | Expected state is \`COMPLETED\` and checks pass |
| Nightly | Run a broader resilience pack with load and observability checks | Failures create triage tickets, not automatic rollbacks |
| Release promotion | Run one or two high-value dependency scenarios | Promotion stops if resilience evidence is missing |

Here is a GitHub Actions job that runs after deployment to a staging environment. It uses current action majors for checkout and Node setup, and it lets the Steadybit action be the experiment runner.

\`\`\`yaml
name: staging-resilience

on:
  workflow_dispatch:
  deployment_status:

jobs:
  steadybit:
    if: \${{ github.event_name == 'workflow_dispatch' || github.event.deployment_status.state == 'success' }}
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22

      - name: Run catalog dependency experiment
        uses: steadybit/run-experiment@v1
        with:
          apiAccessToken: \${{ secrets.STEADYBIT_API_ACCESS_TOKEN }}
          baseURL: https://platform.steadybit.com
          experimentKey: CAT-42
          expectedState: COMPLETED
          executionReason: staging deployment \${{ github.run_id }}
\`\`\`

If your team prefers CLI-based GitOps, store experiment definitions in the repository and use the CLI to update or execute them. I am intentionally not inventing subcommands here because the official docs point readers to the CLI repository for detailed usage rather than listing every command on the docs page. The verified install command is stable:

\`\`\`bash
npm install -g steadybit
steadybit config profile add
\`\`\`

That is the point where a team should copy the exact current CLI command syntax from its installed version with \`steadybit --help\` or the official CLI repository. For article examples, it is better to be precise about the supported concept than to assert a stale subcommand.

## Troubleshooting A Failed Or Errored Run

A realistic failure mode looks like this: a staging pipeline runs \`CAT-42\`, the GitHub Action returns a non-success result, and the release manager asks whether the application is broken. The answer depends on the Steadybit run state.

If the experiment is \`FAILED\`, inspect the failed step. A failed HTTP check that required 99 percent success during a pod isolation attack means the hypothesis did not hold. Compare application logs, check fallback behavior, and inspect whether the upstream service timed out too slowly. That is product evidence.

If the experiment is \`ERRORED\`, diagnose the test infrastructure first. The official run docs list technical causes such as refused connections or an unexpectedly disconnected agent. Common reasons include agent egress blocked by firewall policy, a wrong container runtime setting, an extension pod without permissions, an environment target query resolving to zero targets, or a monitor check with missing credentials.

\`\`\`bash
kubectl -n steadybit-agent get pods
kubectl -n steadybit-agent logs deploy/steadybit-agent
kubectl -n steadybit-agent get events --sort-by='.lastTimestamp'
\`\`\`

Those commands are intentionally basic, but they prevent a lot of false product alarms. If the agent pod is restarting, the failure is not that the catalog service lacks resilience. If the extension cannot mount the runtime socket, the attack never reached the target. If the environment query resolved to zero targets, the experiment design is stale or discovery labels changed.

The trick is to attach classification to the CI result. A release-blocking report should say \`resilience failed\`, \`experiment errored\`, or \`precondition invalid\`. Lumping all three into "chaos failed" teaches teams to distrust the gate.

## What People Get Wrong With Steadybit

The most common mistake is widening scope before the first useful signal. Running against \`Global\`, selecting a percentage of targets without checking the resolved count, and combining several attacks can produce impressive timelines and poor engineering insight. The design docs note that target resolution matters. If a percentage rounds to zero targets, the run can stop because there is nothing to attack.

Another mistake is testing infrastructure survival instead of user survival. Killing a pod and watching Kubernetes replace it is not enough. The user-facing question is whether the system kept the promise the product makes. For APIs, that means response availability, correctness, and latency under stress. For event systems, it means message durability, processing lag, and idempotent recovery. For data workflows, it means no duplicate side effects and a clean resume path.

Finally, teams sometimes let AI agents generate chaos experiments from infrastructure names alone. That produces target selection, but not an oracle. Ask the agent to start from the user contract and incident history, then map to Steadybit actions. A good prompt includes the service, dependency, environment, maximum blast radius, expected user behavior, monitoring signal, recovery time, and rollback owner.

Ready-made QA skills install from qaskills.sh with the qaskills CLI, but for Steadybit you still need product-specific credentials, environments, and a reviewable experiment design. Use skills to standardize the workflow, not to skip the reliability thinking.

## Choosing Steadybit vs Lightweight Fault Tools

Steadybit overlaps with smaller tools, but it is not the same buying decision. If a team only needs to inject TCP latency into a local integration test, a proxy-based tool may be lighter. The [Toxiproxy fault injection testing guide](/blog/toxiproxy-fault-injection-testing-guide-2026) is a better starting point for deterministic developer tests around network behavior. If the team wants platform-level discovery, target governance, reusable templates, observability checks, schedules, and run history, Steadybit is a more complete reliability testing platform.

| Need | Steadybit fit | Lightweight fault tool fit |
| --- | --- | --- |
| Kubernetes and cloud target discovery | Strong | Usually manual |
| RBAC and blast-radius governance | Strong | Usually external |
| Local developer repeatability | Possible but heavier | Strong |
| Experiment evidence for release gates | Strong | Requires custom reporting |
| Cost sensitivity for a single team | Commercial evaluation needed | Often lower |
| Organization-wide chaos program | Strong | Requires more assembly |

For a broader program-level view, pair this tool-specific evaluation with a [chaos engineering resilience testing](/blog/chaos-engineering-resilience-testing) strategy. The platform does not remove the need to define tiers of experiments, ownership, stop conditions, and the difference between staging confidence and production learning.

## Agent-Friendly Workflow

AI coding agents are useful around Steadybit when the task is concrete. They can add CI jobs, normalize naming, generate scenario YAML, review environment target queries, write API smoke tests that mirror Steadybit checks, and summarize run evidence for pull requests. They are risky when asked to choose production blast radius or invent monitoring thresholds without system context.

A good agent workflow looks like this:

1. Human defines the resilience question and stop conditions.
2. Agent drafts the scenario inventory and CI job.
3. Human creates or reviews the Steadybit experiment in the UI or versioned definition.
4. Agent adds companion API tests and release-report formatting.
5. CI runs the narrow experiment after staging deploy.
6. Failures are classified as product failure, experiment infrastructure error, or invalid precondition.

Here is a small Node script that turns a Steadybit run classification into a GitHub step summary. It does not call the Steadybit API. It consumes a local JSON file exported by whatever wrapper your team uses and fails only when the run represents a resilience failure.

\`\`\`ts
import { readFileSync, appendFileSync } from 'node:fs';

type RunResult = {
  key: string;
  state: 'COMPLETED' | 'FAILED' | 'ERRORED' | 'CANCELED';
  url: string;
  failedStep?: string;
};

const result = JSON.parse(readFileSync('steadybit-run.json', 'utf8')) as RunResult;
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

if (summaryPath) {
  appendFileSync(summaryPath, \`### Steadybit run \${result.key}\\n\\n\`);
  appendFileSync(summaryPath, \`State: \${result.state}\\n\\n\`);
  appendFileSync(summaryPath, \`Run: \${result.url}\\n\\n\`);
}

if (result.state === 'FAILED') {
  throw new Error(\`Resilience hypothesis failed at \${result.failedStep ?? 'unknown step'}\`);
}

if (result.state === 'ERRORED') {
  throw new Error('Steadybit experiment infrastructure errored; inspect agent and extension health');
}
\`\`\`

That kind of wrapper is deliberately boring. It gives release automation a common vocabulary and leaves experiment execution to Steadybit.

## Frequently Asked Questions

### Is Steadybit open source?

Steadybit itself is a commercial platform, not an open-source chaos tool. The official GitHub organization contains open repositories for extensions, kits, docs, and related components, and the docs describe extension kits such as ActionKit, DiscoveryKit, and EventKit. The platform plans are commercial, with Professional and Enterprise tiers currently listed on the pricing page and a 30-day trial for evaluation.

### Should QA teams run Steadybit experiments in production?

Production experiments can be valuable, but they should come after staging experiments have stable scope, checks, observability, and rollback behavior. Start with non-production environments, narrow targets, and clear abort conditions. If production becomes appropriate, use team permissions, environment constraints, maintenance windows or low-risk periods, and an explicit incident owner. Never let an AI agent widen production blast radius without human review.

### What is the difference between a failed and errored Steadybit run?

A failed run usually means the experiment executed and a check or action reported that the hypothesis did not hold. That is product or system behavior evidence. An errored run points to a technical problem with execution, such as agent disconnection, refused connection, bad extension setup, or invalid target resolution. Treat failed runs as resilience findings and errored runs as test-infrastructure issues until proven otherwise.

### Where should Steadybit fit in a CI pipeline?

Use it after deployment to a controlled environment, not as a broad pull-request gate. The best CI pattern is a narrow post-deploy experiment for the changed service, with nightly or scheduled suites for broader scenarios. Keep pull requests focused on linting experiment definitions and companion tests. Gate release promotion on a small set of high-value experiments whose checks are stable enough to produce trustworthy failures.
`,
};
