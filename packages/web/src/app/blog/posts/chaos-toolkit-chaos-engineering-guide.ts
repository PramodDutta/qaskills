import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chaos Toolkit Guide: Declarative Chaos Experiments for QA Teams',
  description: 'chaos toolkit guide for QA teams: write declarative experiments, run them in CI, validate hypotheses, capture journals, and diagnose drift safely.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Chaos Toolkit Guide: Declarative Chaos Experiments for QA Teams

Chaos Toolkit is an active open-source CLI for declaring and running chaos engineering experiments as JSON or YAML. I verified the current PyPI release as 1.21.0, published on September 27, 2026. The GitHub repository is active, and its current project metadata requires Python 3.12 or newer. Some older documentation pages still mention Python 3.8+, so use the repository and package metadata when choosing a runtime for new CI images.

The practical answer for QA teams is this: use chaos toolkit when you want experiments in source control, a neutral experiment format, and provider extensions for platforms such as Kubernetes or AWS. It is especially useful when Claude Code, Cursor, Copilot, or another AI coding agent needs a concrete file to edit instead of vague instructions like "test resilience." The experiment file gives the agent a target: steady-state hypothesis, method, rollbacks, secrets, and runtime flags.

Chaos Toolkit is not a hosted chaos platform and not a Kubernetes operator by itself. The core CLI exposes commands such as chaos run, chaos validate, chaos discover, chaos init, info, and settings. I could not confirm a separate current core subcommand named chaos verify in the official CLI reference, so this guide uses validate for syntax checks and run for actual steady-state verification. For the strategy behind chaos work, pair this guide with [chaos engineering resilience testing](/blog/chaos-engineering-resilience-testing). For Kubernetes-specific chaos comparison, see [LitmusChaos Kubernetes chaos testing guide](/blog/litmuschaos-kubernetes-chaos-testing-guide).

## The Current Shape Of Chaos Toolkit

Chaos Toolkit, often abbreviated CTK in its own materials, centers on a declarative experiment document. The document names what normal looks like, what action or probe to apply, and what to do afterward. The CLI runs that document and writes a journal, which is a JSON record of the experiment, steady-state checks, method activities, rollback activities, status, timing, and deviation flag.

That journal is a major reason QA teams should care. A manual game-day note can say "we killed a pod and it recovered." A Chaos Toolkit journal can show which probe ran, what its tolerance was, which action ran, what the result returned, whether the steady state deviated, and whether rollbacks ran. That becomes reviewable evidence in a PR, incident review, release gate, or resilience backlog.

| Current item | Verified status | QA planning impact |
| --- | --- | --- |
| Core package | chaostoolkit 1.21.0 on PyPI, September 27, 2026 | Pin or range this version deliberately in CI |
| Runtime metadata | Current repository pyproject requires Python >=3.12 | Build new runners on Python 3.12+ even if old docs mention 3.8+ |
| Experiment format | JSON is specified, YAML loading is supported by implementations | Store YAML for readability or JSON for strict tooling |
| CLI commands | Core docs list run, validate, discover, init, info, settings | Use validate plus dry runs before destructive runs |
| Reports | chaos report comes from chaostoolkit-reporting, not the base CLI | Install reporting only where HTML, Markdown, or PDF output is needed |

What people get wrong is thinking "declarative" means "non-programming." Chaos Toolkit experiments still call real functions, process commands, HTTP probes, or extension activities. The declarative file is the orchestration layer. You still need tested provider code, credentials, safe targets, and assertions with meaningful tolerances.

## Experiment Anatomy Without Hand-Waving

The experiment specification says an experiment must declare title, description, and method. It should declare steady-state-hypothesis and rollbacks. It may also declare tags, secrets, configuration, controls, runtime, contributions, and extension data. The steady-state hypothesis contains probes with tolerances. The method contains actions and probes. Rollbacks are actions that attempt to undo the condition.

Here is a small file-backed experiment that calls local Python functions. It checks that a checkout health endpoint returns HTTP 200, injects a short dependency slowdown through a local test helper, checks health again, and calls a rollback helper. The values are intentionally configuration driven so CI can supply staging URLs without editing the experiment.

\`\`\`json
{
  "title": "checkout remains healthy during dependency latency",
  "description": "Inject a short dependency latency condition and verify checkout health stays acceptable.",
  "tags": ["checkout", "staging", "latency"],
  "configuration": {
    "checkout_url": "http://127.0.0.1:8080/health",
    "fault_url": "http://127.0.0.1:9090/faults/dependency-latency"
  },
  "steady-state-hypothesis": {
    "title": "checkout health endpoint returns 200",
    "probes": [
      {
        "name": "checkout-health-is-ok",
        "type": "probe",
        "tolerance": 200,
        "provider": {
          "type": "python",
          "module": "experiments.checkout",
          "func": "status_code",
          "arguments": {
            "url": "\${checkout_url}"
          }
        }
      }
    ]
  },
  "method": [
    {
      "name": "enable-latency-fault",
      "type": "action",
      "provider": {
        "type": "python",
        "module": "experiments.checkout",
        "func": "enable_fault",
        "arguments": {
          "url": "\${fault_url}",
          "milliseconds": 750,
          "duration_seconds": 60
        }
      }
    }
  ],
  "rollbacks": [
    {
      "name": "disable-latency-fault",
      "type": "action",
      "provider": {
        "type": "python",
        "module": "experiments.checkout",
        "func": "disable_fault",
        "arguments": {
          "url": "\${fault_url}"
        }
      }
    }
  ]
}
\`\`\`

The corresponding Python module uses only the standard library. In a real team repo, put this under a package that your CI virtual environment can import. With the layout below, the module lives at resilience/providers/experiments/checkout.py, so export PYTHONPATH=resilience/providers before running chaos commands, which makes the experiments.checkout module path resolve.

\`\`\`python
from __future__ import annotations

import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def status_code(url: str) -> int:
    request = Request(url, method="GET")
    try:
        with urlopen(request, timeout=5) as response:
            return int(response.status)
    except HTTPError as error:
        return int(error.code)


def enable_fault(url: str, milliseconds: int, duration_seconds: int) -> dict[str, int]:
    payload = json.dumps({
        "latency_ms": milliseconds,
        "duration_seconds": duration_seconds
    }).encode("utf-8")
    request = Request(
        url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"}
    )
    with urlopen(request, timeout=5) as response:
        return {"status": int(response.status)}


def disable_fault(url: str) -> dict[str, int]:
    request = Request(url, method="DELETE")
    with urlopen(request, timeout=5) as response:
        return {"status": int(response.status)}
\`\`\`

The example is deliberately boring. That is good. A chaos experiment file should make review easy. Save the drama for the failure mode, not the file format.

## Steady-State Hypotheses That QA Can Defend

The steady-state hypothesis is not a smoke test. It is the statement that normal behavior is present before the method runs and, by default, still present afterward. If the before check fails, the method does not run. That protects you from injecting faults into an already-broken system and then pretending the result says something about resilience.

| Weak hypothesis | Better hypothesis | Why it is stronger |
| --- | --- | --- |
| Service is up | Checkout health returns 200 and dependency probe returns under 300 ms | Defines both availability and latency |
| Pods exist | Ready replicas equal desired replicas before and after pod disruption | Matches Kubernetes recovery expectation |
| API works | Synthetic checkout creates an order and verifies it is persisted | Asserts side effect, not only status code |
| Queue drains eventually | Oldest message age remains below 120 seconds during worker loss | Ties resilience to operational SLO |

Use tolerances that match the probe result shape. A scalar tolerance should be exact enough to fail on real drift. For example, a probe returning 200 can use tolerance 200. A richer probe can return a structure, but then you need a tolerance mechanism that understands it. When the tolerance is vague, an AI agent will often add broad matching and make the experiment pass while the application silently degraded.

For HTTP checks, be careful with status-only probes. If a checkout POST returns 201 but does not persist the order, status code passed and user outcome failed. Your probe should fetch the created entity or query the downstream ledger. Resilience tests are expensive, so their assertions need to prove the thing the business cares about.

## Installation And Project Layout

Install Chaos Toolkit in a virtual environment controlled by the repo or CI job. The project metadata currently requires Python 3.12+, so use setup-python with a 3.12 or newer version in CI. Install only the extensions you need. A small project may need only chaostoolkit and a local provider module. Kubernetes experiments need chaostoolkit-kubernetes. AWS experiments may use chaostoolkit-aws, while AWS-native FIS experiments might be better controlled through AWS FIS directly.

\`\`\`bash
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install "chaostoolkit==1.21.0"
chaos --version
\`\`\`

A maintainable repo layout keeps experiments separate from provider helpers and generated journals. Do not commit journals from local dry runs unless they are fixtures for tests.

\`\`\`text
resilience/
  experiments/
    checkout-latency.json
    worker-loss.yaml
  providers/
    experiments/
      __init__.py
      checkout.py
  journals/
    .gitkeep
  reports/
    .gitkeep
\`\`\`

For agent-assisted work, add a short README beside the experiments that says which files may be edited, which environment variables are allowed, and which experiments can run in CI. Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the experiment repository still needs local ownership and review.

## Validate, Dry Run, Then Run

The command sequence for a serious workflow is validate, dry run, run in a safe environment, inspect the journal, then decide whether the experiment is eligible for a broader schedule. The core CLI reference lists chaos validate and chaos run. The run command accepts JSON or YAML sources, can write a journal to a specific path, and supports flags such as dry execution, no-validation, hypothesis strategy, rollback strategy, and variable overrides.

\`\`\`bash
. .venv/bin/activate
export PYTHONPATH="$PWD/resilience/providers"

chaos validate resilience/experiments/checkout-latency.json

chaos run \\
  --dry \\
  --journal-path resilience/journals/checkout-latency-dry.json \\
  resilience/experiments/checkout-latency.json

chaos run \\
  --journal-path resilience/journals/checkout-latency-\${RUN_ID}.json \\
  --rollback-strategy=always \\
  resilience/experiments/checkout-latency.json
\`\`\`

The dry run is not a safety guarantee. It validates flow without executing activities. It is useful for proving that the file loads and that the CLI can plan execution. It does not prove credentials, network access, provider function behavior, or rollback success. The first real run still belongs in a sandbox or staging environment.

| Command | What it proves | What it does not prove |
| --- | --- | --- |
| chaos validate | Experiment syntax and schema are acceptable | Target system is healthy or credentials work |
| chaos run --dry | The execution plan can be walked without actions | Fault injection is safe or rollback works |
| chaos run | Activities execute and journal is written | Business outcome is acceptable unless probes assert it |
| chaos report | Journal can be rendered for humans | The experiment was meaningful |

Use --no-validation sparingly. It exists, but skipping validation in CI removes one of the cheapest checks you have. A better default is to validate every experiment on pull request and reserve actual runs for scheduled or manual workflows.

## Runtime Strategies For Hypotheses And Rollbacks

By default, Chaos Toolkit checks the steady-state hypothesis before and after the method. The run command can change that with --hypothesis-strategy. Current docs list default, before-method-only, after-method-only, during-method-only, and continuously. For during-method-only or continuously, --hypothesis-frequency controls the pace, and --fail-fast can end the experiment as soon as the hypothesis deviates.

Rollbacks also have runtime strategies. The run docs list default, always, never, and deviated. For CI and controlled staging, always is often the safest because the cleanup runs even if the method or after-check fails. For investigative work, never can be useful, but only when an operator intentionally wants to inspect the system in the faulted state.

\`\`\`bash
chaos run \\
  --hypothesis-strategy continuously \\
  --hypothesis-frequency 10 \\
  --fail-fast \\
  --rollback-strategy=always \\
  --journal-path resilience/journals/checkout-continuous.json \\
  resilience/experiments/checkout-latency.json
\`\`\`

The subtle QA point is that continuous hypotheses can change the meaning of a test. A before-and-after experiment asks, "Did the system recover by the end?" A continuous fail-fast experiment asks, "Did the system remain inside tolerance the whole time?" Both are valid, but they represent different release risks. Pick intentionally.

## Extensions: Kubernetes, AWS, And Discovery

Chaos Toolkit extensions add probes and actions for target platforms. The Kubernetes extension provides activities for Kubernetes resources such as pods, deployments, services, replicasets, statefulsets, nodes, and CRDs. The AWS extension aggregates AWS activities. The extension docs also describe chaos discover, which can install or inspect an extension and generate a discovery report that chaos init can use to bootstrap experiments.

| Extension path | Install command | Good use case | Extra caution |
| --- | --- | --- | --- |
| Kubernetes | pip install chaostoolkit-kubernetes | Delete pods, inspect deployment readiness, test service recovery | Use a namespace and service account scoped for chaos |
| AWS | pip install -U chaostoolkit-aws | Exercise AWS APIs through Python provider actions | Compare with AWS FIS before duplicating native actions |
| Reporting | pip install -U chaostoolkit-reporting | Convert journals to HTML, Markdown, or PDF | It is not installed with the base CLI |
| Custom local module | Importable Python package in repo | Encode product-specific probes and reversible actions | Unit test provider functions outside chaos runs |

The discover command can explore capabilities, but it can also install a package unless you pass --no-install. In locked-down CI, install dependencies explicitly and use --no-install for discovery. That keeps network access and dependency review in the dependency installation phase instead of inside experiment authoring.

\`\`\`bash
python -m pip install "chaostoolkit==1.21.0" chaostoolkit-kubernetes

chaos discover \\
  --no-install \\
  --discovery-path resilience/discovery/kubernetes.json \\
  chaostoolkit-kubernetes

chaos init \\
  --discovery-path resilience/discovery/kubernetes.json \\
  --experiment-path resilience/experiments/generated-kubernetes.json
\`\`\`

Generated experiments are starting points, not approved tests. Have an engineer replace generic tolerances with service-specific probes before a generated file enters a pipeline.

## CI Integration For Pull Requests And Scheduled Runs

CI should treat chaos experiments like test code with a danger rating. Validate on every PR. Run dry flows where safe. Run real experiments only in a controlled environment with credentials, approval, and known test data. The workflow below validates all experiment files, then runs one selected staging experiment when manually dispatched.

\`\`\`yaml
name: chaos-toolkit

on:
  pull_request:
  workflow_dispatch:
    inputs:
      experiment:
        description: "Experiment file under resilience/experiments"
        required: true
        default: "checkout-latency.json"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"

      - name: Install Chaos Toolkit
        run: |
          python -m pip install --upgrade pip
          python -m pip install "chaostoolkit==1.21.0"

      - name: Validate experiments
        run: |
          for file in resilience/experiments/*.json; do
            chaos validate "\${file}"
          done

  run-staging:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    environment: staging-chaos
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"

      - name: Install experiment dependencies
        run: |
          python -m pip install --upgrade pip
          python -m pip install "chaostoolkit==1.21.0" chaostoolkit-reporting

      - name: Run selected experiment
        env:
          RUN_ID: \${{ github.run_id }}
          PYTHONPATH: resilience/providers
        run: |
          chaos run \\
            --rollback-strategy=always \\
            --journal-path "resilience/journals/journal-\${RUN_ID}.json" \\
            "resilience/experiments/\${{ inputs.experiment }}"

      - uses: actions/upload-artifact@v7
        with:
          name: chaos-journal-\${{ github.run_id }}
          path: resilience/journals/*.json
\`\`\`

The workflow uses current GitHub Actions majors and Python 3.12. In production, also add environment-specific credentials and a pre-run health gate. A practical pre-run gate checks that staging synthetic tests are green before chaos begins, because injecting a fault into an unhealthy staging environment produces noisy evidence.

## Journals And Reports As Test Artifacts

The journal is the canonical machine-readable result. The journal specification requires experiment, status, start, end, duration, and deviated. It should also include steady_states, run, and rollbacks. For QA review, store journals as CI artifacts and parse them for status, deviation, and rollback results.

\`\`\`javascript
import { readFileSync } from 'node:fs';

const journalPath = process.argv[2];
if (!journalPath) {
  throw new Error('Usage: node assert-chaos-journal.mjs <journal.json>');
}

const journal = JSON.parse(readFileSync(journalPath, 'utf8'));

if (journal.status !== 'completed') {
  throw new Error(\`Chaos experiment did not complete: \${journal.status}\`);
}

if (journal.deviated !== false) {
  throw new Error('Steady state deviated during the experiment');
}

if (!Array.isArray(journal.run) || journal.run.length === 0) {
  throw new Error('Journal has no method activity results');
}

console.log('Chaos journal passed basic QA gates');
\`\`\`

If you need a human report, install chaostoolkit-reporting. The official docs say chaos report is not installed with the base CLI because of its operating-system-dependent dependencies. Once installed, it can export HTML, Markdown, or PDF from one or more journals.

\`\`\`bash
python -m pip install chaostoolkit-reporting

chaos report \\
  --export-format=html5 \\
  resilience/journals/checkout-latency.json \\
  resilience/reports/checkout-latency.html
\`\`\`

Reports are helpful for stakeholders, but do not make them the source of truth. Parse the journal in CI, publish the report for humans, and link follow-up issues to the exact experiment file and journal artifact.

## Failure Mode: The Experiment Passes While The Product Is Broken

This is the most dangerous Chaos Toolkit failure mode because it looks like maturity. The run status is completed, the journal says deviated false, and the dashboard screenshot looks quiet. Later, someone discovers the checkout flow accepted orders but never sent them to fulfillment during the fault window.

The diagnosis usually points to a shallow steady-state hypothesis. The probe checked GET /health, but the actual risk lived in a side effect. The rollback ran, but the experiment never verified downstream persistence. The method action succeeded, but it targeted a fake dependency path that production code no longer uses.

Fix it by turning the hypothesis into a user journey with side-effect assertions:

1. Create a test order through the same public API path a user uses.
2. Fetch the order by ID and assert stable fields.
3. Verify the downstream effect, such as queue publication or ledger entry.
4. Clean up the test data in a rollback or fixture teardown.
5. Fail if any step returns an unexpected status or missing entity.

Do not pad the experiment with more actions until the probe tells the truth. One meaningful probe beats five infrastructure actions when the question is user impact.

## Authoring With AI Coding Agents

AI coding agents are excellent at converting an incident narrative into a draft experiment, but they need constraints. Give the agent the exact service, the failure mode, the steady-state signal, the rollback expectation, and the command it must run. Ask it to edit one experiment file and one provider module at a time.

Use this review checklist before accepting agent output:

| Review item | Reject if |
| --- | --- |
| Provider imports | The code references packages not installed in CI |
| Probe assertion | The tolerance checks only a status code when side effects matter |
| Rollback | Cleanup is absent, irreversible, or never called by the selected strategy |
| Secrets | Values are hard-coded in experiment JSON instead of injected securely |
| Scope | The action targets production or all namespaces without explicit approval |
| Journal handling | CI discards the journal after the run |

The biggest agent-specific mistake is allowing the agent to "fix" a failing experiment by weakening the hypothesis. A failure is often the point. Make the agent diagnose whether the failure is setup, target mismatch, missing permission, provider bug, or real resilience drift before changing tolerances.

## Chaos Toolkit Versus Platform-Native Tools

Chaos Toolkit is strongest as a portable experiment language and runner. Platform-native tools are often stronger at deep integration with one environment. AWS FIS, for example, has native AWS actions, IAM integration, CloudWatch stop conditions, and action-minute pricing. Kubernetes-native tools may provide controllers, CRDs, dashboards, or steady scheduling.

| Use case | Chaos Toolkit fit | Alternative to consider |
| --- | --- | --- |
| Source-controlled experiment language across teams | Strong | Keep CTK as the orchestrator |
| AWS-managed fault actions with CloudWatch stop conditions | Moderate | AWS FIS may be safer and more native |
| Kubernetes experiments with CRDs and cluster-native scheduling | Moderate | LitmusChaos or another Kubernetes-native platform |
| Custom product probes and reversible business actions | Strong | Local test harness if no chaos runner is needed |
| Executive game-day reporting | Moderate with reporting plugin | Hosted platform if dashboards and RBAC matter |

The good architecture is often mixed. Use the platform-native tool to inject the fault when it has safer primitives, then use Chaos Toolkit or your test framework to assert the user journey. The tool boundary should follow safety and evidence, not logo preference.

## Frequently Asked Questions

### Is Chaos Toolkit still maintained?

Yes. PyPI lists chaostoolkit 1.21.0 as the current release on September 27, 2026, and the GitHub organization and repository are active. One caveat is documentation drift: some site pages still mention older Python requirements, while current repository metadata requires Python 3.12 or newer. New installations should use Python 3.12+ and pin the package version intentionally.

### Does Chaos Toolkit have a chaos verify command?

I could not confirm a separate current core chaos verify subcommand in the official CLI reference. The core command list includes run, validate, discover, init, info, and settings. Use chaos validate to check experiment syntax, chaos run --dry to rehearse flow without executing activities, and chaos run to execute the experiment and verify the steady-state hypothesis through probes.

### Should experiments be written in JSON or YAML?

Use JSON when strict tooling, schema validation, and machine edits matter most. Use YAML when human review is the priority and your team is disciplined about formatting. The experiment specification is JSON-based, but the run command accepts JSON or YAML sources. Either way, keep generated journals separate from experiment definitions and review changes like test code.

### Can Chaos Toolkit run in every pull request?

Validation can run in every pull request. Real fault injection usually should not. A sane pipeline validates all experiment files on PRs, runs dry flows where helpful, and reserves real experiments for staging schedules or manual workflows with approvals. If a real experiment must run per PR, make the target disposable and assert cleanup from the journal and platform state.
`,
};
