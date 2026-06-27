import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Gremlin Chaos Engineering Tutorial: Fault Injection for QA (2026)",
  description: "A hands-on Gremlin chaos engineering tutorial for 2026 — install the agent, inject CPU, memory, latency and blackhole faults, and gate releases on resilience.",
  date: "2026-06-26",
  category: "Performance",
  content: `# Gremlin Chaos Engineering Tutorial: Fault Injection for QA (2026)

Gremlin is a hosted chaos engineering platform that injects controlled faults — CPU pressure, memory exhaustion, network latency, packet loss, blackholes, process kills, and host shutdowns — into your infrastructure so you can prove a system survives turbulence *before* a real incident proves it cannot. You install a lightweight agent (\`gremlind\`), pick a target and a blast radius, run an experiment from the web app, the CLI, or the REST API, and watch your dashboards. A first attack is one line: \`gremlin attack cpu -l 60 -c 1\`. This tutorial walks through installation, every fault type, blast-radius safety, reading results, and wiring chaos into CI as a QA gate.

One note before the commands: every command, flag, and API payload below is real and matches Gremlin's current tooling. Where a fault has many type-specific flags, the canonical way to see them for *your* installed version is \`gremlin help attack-container <type>\` — run it rather than guessing.

## What Gremlin Actually Does

Chaos engineering is the discipline of running planned experiments against a system to build confidence in its ability to withstand failure. Gremlin productizes that discipline: instead of writing custom fault-injection scripts, you get a managed agent, a catalog of fault types, a hard "Halt" button, and a control plane that records what ran and when.

The architecture has three parts:

1. **The agent (\`gremlind\`)** — a daemon you install on each host, container host, or Kubernetes node. It registers with Gremlin's control plane and executes faults locally.
2. **The control plane** — Gremlin's hosted backend (\`app.gremlin.com\`) that you drive via web UI, CLI, or API. It schedules experiments and enforces your team's blast-radius limits.
3. **Faults (attacks)** — the actual disruptions, grouped into **resource** (CPU, memory, IO, disk), **state** (shutdown, process killer, time travel), and **network** (latency, packet loss, blackhole, DNS) categories.

Because the agent runs the fault and the control plane only orchestrates, Gremlin can stop an experiment instantly: a halt revokes the running attack across every targeted agent. That safety contract is what separates a chaos *platform* from \`kill -9\` in a loop.

## Installing the Gremlin Agent

Gremlin authenticates each agent against a **Team ID** and a **Team Secret** (or a certificate pair). Grab both from \`https://app.gremlin.com/settings/teams\`. The agent reads them from \`/etc/gremlin/config.yaml\` or from environment variables — and when both are set, the environment variables win.

### On a Linux virtual machine

\`\`\`bash
# Debian/Ubuntu: add the repo and install the agent + CLI
sudo apt-get install -y apt-transport-https dirmngr
echo "deb https://deb.gremlin.com/ release non-free" \\
  | sudo tee /etc/apt/sources.list.d/gremlin.list
sudo apt-get update && sudo apt-get install -y gremlin gremlind

# Authenticate (writes /etc/gremlin/config.yaml)
sudo gremlin init
\`\`\`

A minimal \`/etc/gremlin/config.yaml\` looks like this — any change requires restarting the \`gremlind\` service:

\`\`\`yaml
# /etc/gremlin/config.yaml
identifier: web-node-01          # how this agent shows up in the UI
team_id: e7352a6b-a9a0-513c-81e4-980f680a70c4
team_secret: <your-team-secret>
tags:
  service: checkout
  env: staging
\`\`\`

Prefer environment variables in CI and container images, where mounting a secrets file is awkward:

\`\`\`bash
export GREMLIN_TEAM_ID="e7352a6b-a9a0-513c-81e4-980f680a70c4"
export GREMLIN_TEAM_SECRET="<your-team-secret>"
export GREMLIN_IDENTIFIER="web-node-01"
gremlin check        # validates config + connectivity to the control plane
\`\`\`

\`gremlin check\` is the first thing to run after install: it confirms the agent can reach the control plane and that your credentials are valid. If it passes, the host shows up under **Clients** in the web app.

### On Kubernetes with Helm

For clusters, install the agent as a DaemonSet so every node can be targeted:

\`\`\`bash
helm repo add gremlin https://helm.gremlin.com
helm repo update
helm install gremlin gremlin/gremlin \\
  --namespace gremlin --create-namespace \\
  --set gremlin.secret.managed=true \\
  --set gremlin.secret.teamID=$GREMLIN_TEAM_ID \\
  --set gremlin.secret.clusterID=my-staging-cluster \\
  --set gremlin.secret.teamSecret=$GREMLIN_TEAM_SECRET
\`\`\`

The \`tags\` (or Kubernetes labels) you set here are what you'll later use to scope the blast radius, so label deliberately by \`service\`, \`env\`, and \`region\`.

## Your First Fault: CPU

With an agent registered, the fastest sanity check is a CPU attack. The \`gremlin attack\` subcommand runs a localized experiment on the host you're shelled into:

\`\`\`bash
# Saturate 1 core for 60 seconds
gremlin attack cpu -l 60 -c 1
\`\`\`

\`-l\` (\`--length\`) is the duration in seconds; \`-c\` is the number of cores to consume. The agent reports progress, and you watch the host's CPU graph spike, then recover when the experiment ends. To target a single Docker container on the host instead of the whole machine, use \`attack-container\` with the container ID:

\`\`\`bash
# Same CPU attack, scoped to one container
gremlin attack-container a1a9ee7eb256 cpu -l 60 -c 1
\`\`\`

That container-ID form is the model for *every* fault: \`gremlin attack-container <CONTAINER> <TYPE> [options]\`. When you're unsure which flags a type accepts, ask the CLI directly:

\`\`\`bash
gremlin help attack-container cpu      # type-specific flags for THIS version
\`\`\`

If an experiment misbehaves, you don't wait for \`-l\` to elapse. Roll it back immediately:

\`\`\`bash
gremlin status            # list active experiments and their IDs
gremlin rollback          # interrupt the active host experiment
gremlin rollback-container # interrupt active container experiments
\`\`\`

## The Fault Catalog

Gremlin's value is breadth. Each fault probes a different failure mode, and a real resilience program runs several. The API/CLI type names are stable; these are the ones you'll reach for:

| Category | Fault type | What it injects | Resilience question it answers |
|---|---|---|---|
| Resource | \`cpu\` | Sustained CPU load on N cores | Does autoscaling / shedding kick in? |
| Resource | \`memory\` | Allocates RAM to starve the host | Does the OOM killer take the right process? |
| Resource | \`io\` | Heavy disk read/write pressure | Do disk-bound services degrade gracefully? |
| Resource | \`disk\` | Fills disk to a target percentage | Does "disk full" page or crash? |
| State | \`shutdown\` | Reboots or halts the host | Does the cluster reschedule the workload? |
| State | \`process_killer\` | Kills a matching process | Does the supervisor restart it? |
| State | \`time_travel\` | Shifts system clock | Do TLS certs / tokens / cron break? |
| Network | \`latency\` | Adds delay to matching packets | Do timeouts and retries behave? |
| Network | \`packet_loss\` | Drops/corrupts a % of packets | Is the protocol loss-tolerant? |
| Network | \`blackhole\` | Drops all matching traffic | Does a dependency outage cascade? |
| Network | \`dns\` | Blocks DNS resolution | Does name-resolution failure degrade cleanly? |

The three you should run first, in order, are **CPU** (cheapest, safest), **latency** (most realistic for distributed systems), and **blackhole** (the strongest test of dependency isolation).

## Network Faults: Latency and Blackhole

Network faults are where chaos engineering earns its keep, because most outages in distributed systems are partial network failures, not clean crashes. The **latency** fault injects delay into packets matched by host and port:

\`\`\`bash
# Add latency to traffic on port 443 for 120s
gremlin attack-container <CONTAINER> latency \\
  -l 120 -p 443 -h api.internal.example.com
\`\`\`

Here \`-l\` is length, \`-p\` scopes the affected port, and \`-h\` restricts the fault to a specific hostname so you don't slow down *everything*. Run \`gremlin help attack-container latency\` to see the delay-magnitude flag and protocol options for your build, since those are the knobs you'll tune to find the threshold where retries pile up.

The **blackhole** fault is the dependency-outage simulator: it drops inbound and outbound traffic matching the IP, port, or hostname you specify. This is how you verify a circuit breaker actually opens:

\`\`\`bash
# Cut off the payments dependency for 60s
gremlin attack-container <CONTAINER> blackhole \\
  -l 60 -p 5432 -h payments-db.internal
\`\`\`

A healthy service responds to a blackholed dependency with a fast, bounded failure (a tripped circuit breaker and a fallback), not a thread pool that fills with hanging connections. If your "graceful degradation" turns into a cascading timeout storm, you just found a real bug in a controlled window — which is the entire point.

## Blast Radius: The Safety Contract

The number-one rule of chaos engineering is **start small and contain the blast radius**. Gremlin enforces this through targeting. When you run an experiment from the control plane, you choose:

- **Target type** — \`Random\` (Gremlin picks N hosts/containers matching a filter) or \`Exact\` (you name them).
- **Magnitude** — a *percentage* or *count* of matching targets to hit.
- **Filters** — \`tags\`, hostnames, Kubernetes labels.

The discipline is to ramp magnitude across runs: hit **one** container, confirm the system absorbs it, then 10%, then 50%. Never start at 100%. Pair every experiment with a stop condition — a dashboard threshold or SLO breach that triggers an immediate halt. That "abort if error rate exceeds X" rule is what makes production chaos defensible to your on-call team.

This staged, hypothesis-driven approach is the core of the discipline; the [chaos engineering and resilience testing guide](/blog/chaos-engineering-resilience-testing) covers the full GameDay process — forming a hypothesis, defining the steady state, and writing the abort criteria — that should wrap around every Gremlin run.

## Driving Gremlin via the REST API

Everything the CLI and UI do is also available over Gremlin's REST API, which is how you script experiments into pipelines and dashboards. The base URL is \`https://api.gremlin.com/v1\`, requests carry a bearer token, and you create an attack by POSTing a \`command\` (the fault) plus a \`target\` (the blast radius) to \`/attacks/new\`:

\`\`\`bash
curl -X POST \\
  --header "Content-Type: application/json" \\
  --header "Authorization: $GREMLIN_BEARER_TOKEN" \\
  "https://api.gremlin.com/v1/attacks/new?teamId=$GREMLIN_TEAM_ID" \\
  --data '{
    "command": { "type": "cpu", "args": ["-c", "1", "--length", "30"] },
    "target":  { "type": "Random", "percent": 1,
                 "containers": { "labels": { "service": "checkout" } } }
  }'
\`\`\`

The \`command.type\` is any fault from the catalog, and \`command.args\` takes the *same flags you'd pass on the CLI* — that symmetry means you prototype a fault with \`gremlin attack ...\` and then lift the exact args into the API call. The \`target\` block is where blast radius lives: here it's a random 1% of containers labeled \`service: checkout\`. To pin exact hosts instead:

\`\`\`json
{
  "command": { "type": "blackhole", "args": ["--length", "60", "-p", "443"] },
  "target":  { "type": "Exact", "hosts": { "ids": ["web-node-01", "web-node-02"] } }
}
\`\`\`

The endpoint returns an attack GUID; poll the API (or your observability stack) for status, and call the halt endpoint to abort. Because the API is the integration point, it's also how you fail a deploy when an experiment breaches an SLO — covered next.

## Wiring Chaos into CI as a QA Gate

The QA payoff is treating resilience like any other test: a stage in the pipeline that injects a fault, watches an SLO, and **fails the build** if the system can't take the hit. Gremlin's own recommended pattern for CI/CD is to POST an attack via the API, then poll both your observability tool and the Gremlin API for state — so a scheduled GitHub Actions workflow looks like this:

\`\`\`yaml
name: chaos-gate
on:
  schedule:
    - cron: '0 3 * * 1'   # weekly, Monday 03:00 UTC, against staging
  workflow_dispatch: {}

jobs:
  latency-experiment:
    runs-on: ubuntu-latest
    env:
      GREMLIN_BEARER_TOKEN: \${{ secrets.GREMLIN_BEARER_TOKEN }}
      GREMLIN_TEAM_ID: \${{ secrets.GREMLIN_TEAM_ID }}
    steps:
      - name: Inject latency on the checkout service
        run: |
          ATTACK=$(curl -sf -X POST \\
            -H "Content-Type: application/json" \\
            -H "Authorization: $GREMLIN_BEARER_TOKEN" \\
            "https://api.gremlin.com/v1/attacks/new?teamId=$GREMLIN_TEAM_ID" \\
            --data '{
              "command": { "type": "latency", "args": ["--length", "120", "-p", "443"] },
              "target":  { "type": "Random", "percent": 25,
                           "tags": { "service": "checkout", "env": "staging" } }
            }')
          echo "Started attack $ATTACK"

      - name: Assert the SLO held during the fault
        run: |
          # Query your metrics backend; fail if p99 latency or error rate breached
          ./scripts/check-slo.sh --window 120s --max-error-rate 0.01 --max-p99 800
\`\`\`

The pattern is deliberate: scope the attack to **staging** with a bounded \`percent\`, run a *known* fault, and let an independent SLO check decide pass/fail. Because the experiment hits the live stack — load balancers, retries, circuit breakers, autoscaling — it catches resilience regressions a unit test never could.

Two adjacent practices make this gate trustworthy. First, you must know your baseline latency percentiles *before* you inject latency, or you can't tell a regression from normal jitter — see the [p95 and p99 percentiles guide](/blog/performance-test-percentiles-p95-p99-guide) for measuring the steady state Gremlin perturbs. Second, chaos complements rather than replaces load testing: run a load test to establish capacity, then inject faults under that load. If you're choosing a load generator to pair with Gremlin, the [k6 vs JMeter comparison](/compare/k6-vs-jmeter) breaks down the options.

## A Practical First-Week Plan

You don't roll out chaos engineering by blackholing production on day one. A sane ramp:

1. **Install + verify** the agent on a single staging host; run \`gremlin check\`.
2. **CPU smoke test** — \`gremlin attack cpu -l 60 -c 1\` against one host. Confirm halt works.
3. **Latency, one target** — add 200 ms to one service, watch retries and timeouts.
4. **Blackhole a dependency** — cut one downstream, confirm the circuit breaker opens.
5. **Ramp magnitude** — repeat the most valuable experiment at 10%, then 50%, with a stop condition.
6. **Automate** — move the winning experiment into a scheduled CI gate against staging.

Each step expands the blast radius only after the previous one passed. That cadence is the difference between disciplined resilience testing and an unplanned outage with extra steps. For agent-driven workflows that bundle chaos, load, and SLO checks into a coding assistant, browse the [QA skills directory](/skills).

## Frequently Asked Questions

### Is Gremlin free, and is there an open-source alternative?

Gremlin is a commercial SaaS product with paid tiers; pricing is per-host/per-month and there has historically been a limited free option for evaluation, so check the current plans on their site. If you need fully open-source fault injection, look at Chaos Mesh and LitmusChaos for Kubernetes, AWS Fault Injection Service for AWS-native workloads, or Toxiproxy for network faults. Gremlin's differentiators are the managed agent, the catalog breadth, and the enforced blast-radius and halt controls.

### How is a Gremlin attack stopped if something goes wrong?

Every experiment has a hard duration set by \`--length\`, after which the agent reverts the fault automatically. For an immediate stop you halt the attack — \`gremlin rollback\` (or \`rollback-container\`) from the CLI, the "Halt" button in the web app, or the halt API endpoint — which revokes the running fault across all targeted agents at once. This instant-abort capability is the core safety contract, so always confirm it works on a small experiment before scaling magnitude.

### Can I run Gremlin in production, or only in staging?

Both, but you earn production. Start in staging, validate that experiments behave and that halt works, then run carefully scoped production experiments during business hours with on-call engineers watching and an automatic stop condition tied to an SLO. The whole point of chaos engineering is to find weaknesses under real conditions, which only production fully reproduces — but you get there by ramping blast radius slowly, never by starting at 100%.

### What's the difference between Gremlin's CPU attack and a load test?

A load test drives realistic *traffic* through your application to measure capacity and latency under demand; a CPU attack directly consumes host *resources* to simulate noisy neighbors, runaway processes, or resource exhaustion regardless of traffic. They answer different questions — "can we handle 10k RPS?" versus "what happens when a core is pinned during normal traffic?" — and they're strongest together: inject a Gremlin fault *while* a load test runs to see how the system behaves when capacity is degraded mid-load.

### Which Gremlin fault should QA teams start with?

Start with the CPU fault: it's the cheapest, safest, and most reversible, and it verifies your halt and rollback controls without touching the network. Once you trust the tooling, move to a latency fault scoped to a single service and port, because partial network slowness is the most common real-world failure mode in distributed systems. Save blackhole and shutdown faults for after you've validated graceful degradation, since they simulate full dependency or host loss.

### How do I find the exact flags for a fault type?

Run \`gremlin help attack-container <type>\` (for example \`gremlin help attack-container latency\`) on the host where the agent is installed — it prints the type-specific options for the exact agent version you're running, which is more reliable than any static reference. The same flag names are reused in the REST API through the \`command.args\` array, so a fault you prototype on the CLI lifts directly into an API call. Keeping the CLI and API in sync this way is what lets you move smoothly from manual experiments to automated CI gates.
`,
};
