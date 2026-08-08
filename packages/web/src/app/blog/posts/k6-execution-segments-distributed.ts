import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Execution Segments Distributed: Split Load Cleanly Across Runners',
  description:
    'k6 execution segments distributed load: partition VUs and iterations across pods, avoid double traffic, and verify shards cleanly in CI pipelines.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# k6 Execution Segments Distributed: Split Load Cleanly Across Runners

Horizontal scale for load generation is easy to get wrong. Spin three identical k6 containers with the same script and the same options, and you do not get a neat third of the traffic each: you get three full copies, triple the intended arrival rate, and a "performance incident" that is really a generator misconfiguration. **k6 execution segments distributed** work is how you partition one logical test across many runners so each instance executes a disjoint slice of VUs and iterations while you keep one coherent view of the results. Thresholds are the catch: each \`k6 run\` process evaluates its own metric stream, so per-shard thresholds are local. Whole-run enforcement needs a central metrics backend, k6 Cloud, or a post-run merge step that evaluates the combined output.

This guide targets QA and performance engineers automating k6 in Kubernetes, GitHub Actions matrices, or bare VMs. You will use k6's execution segment flags to shard work, keep scenarios deterministic, aggregate metrics without double counting mistakes, and catch the failure mode where a shard silently runs the full segment. We stick to documented k6 concepts: execution segments, sequence, scenarios, and thresholds. For tool choice context, see [k6 vs JMeter 2026](/blog/k6-vs-jmeter-2026). For reading the results that matter after the run, see [performance testing p99 tail latency analysis](/blog/performance-testing-p99-tail-latency-analysis).

## What an execution segment is

In k6, an execution segment describes **which portion of the planned execution** a given instance should run. Instead of each machine replaying 100% of VUs, you assign fractions (or segment sequences) so the union of instances approximates the original test plan.

Conceptually:

- The full test is the segment \`0:1\` (the whole interval from 0 to 1).
- Two equal workers might take \`0:0.5\` and \`0.5:1\`.
- Four equal workers take \`0:0.25\`, \`0.25:0.5\`, \`0.5:0.75\`, \`0.75:1\`.

k6 exposes this via CLI flags such as \`--execution-segment\` and \`--execution-segment-sequence\` (see current k6 documentation for the exact flag strings and version behavior: https://grafana.com/docs/k6/latest/ ). Always confirm against the docs for your installed k6 version before pinning flags in production pipelines.

The point for testers: **segments are not the same as OS process priority**, and they are not a network mesh feature. They are a deterministic partition of the execution plan.

## Why naive replica counts break tests

| Launch pattern | Intended load | Actual load | Symptom |
| --- | --- | --- | --- |
| 1 runner, VUs=100 | 100 VUs | 100 VUs | baseline |
| 3 runners, same script, no segments | 100 VUs | ~300 VUs | artificial meltdown |
| 3 runners, segments 0:1/3, 1/3:2/3, 2/3:1 | 100 VUs | ~100 VUs | correct scale-out |
| 3 runners, all set to 0:0.5 | 100 VUs | ~150 VUs | partial overlap |
| 2 runners both 0:1 | 100 VUs | ~200 VUs | classic double traffic |

Overlapping segments are as dangerous as missing flags. Your CI must assert segment assignments are disjoint and cover the sequence you intend.

## Minimal script with a clear scenario

Use a script that makes shard mistakes obvious: a tagged request, a modest fixed iteration plan, and thresholds that will trip if load doubles.

\`\`\`javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    browse: {
      executor: "constant-vus",
      vus: 60,
      duration: "2m",
      tags: { surface: "browse" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1200"],
  },
};

const BASE = __ENV.BASE_URL || "https://httpbin.test.k6.io";

export default function () {
  const res = http.get(\`\${BASE}/get\`, {
    tags: { name: "get" },
  });
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
  sleep(1);
}
\`\`\`

Local single-node run:

\`\`\`bash
k6 run script.js
\`\`\`

## Two-node split with execution segments

Equal halves (verify flag names for your k6 version against official docs):

\`\`\`bash
# Runner A
k6 run --execution-segment "0:1/2" --execution-segment-sequence "0,1/2,1" script.js

# Runner B
k6 run --execution-segment "1/2:1" --execution-segment-sequence "0,1/2,1" script.js
\`\`\`

Both runners should receive the same segment **sequence** so partitions line up. The segment argument selects this instance's slice. If you omit a consistent sequence across nodes, you risk misaligned partitions.

Three-way split sketch:

\`\`\`bash
SEQ="0,1/3,2/3,1"

# node 0
k6 run --execution-segment "0:1/3" --execution-segment-sequence "\${SEQ}" script.js

# node 1
k6 run --execution-segment "1/3:2/3" --execution-segment-sequence "\${SEQ}" script.js

# node 2
k6 run --execution-segment "2/3:1" --execution-segment-sequence "\${SEQ}" script.js
\`\`\`

Shell note: always write \`\${SEQ}\` (and \`\${BASE_URL}\`) with braces when concatenating. Patterns like \`$CI_PIPELINE_ID_$CI_NODE_INDEX\` collapse to empty because the shell treats the whole token as one variable name. Prefer:

\`\`\`bash
export RUN_TAG="\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"
\`\`\`

## Kubernetes Job pattern

A common layout is a Job (or multiple Jobs) where each pod gets \`SEGMENT_FROM\`, \`SEGMENT_TO\`, and a shared \`SEGMENT_SEQUENCE\` from the controller.

\`\`\`yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: k6-shard-0
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: k6
          image: grafana/k6:latest
          env:
            - name: BASE_URL
              value: https://api.example.test
            - name: SEGMENT
              value: "0:1/3"
            - name: SEGMENT_SEQUENCE
              value: "0,1/3,2/3,1"
          command: ["k6", "run"]
          args:
            - "--execution-segment"
            - "\$(SEGMENT)"
            - "--execution-segment-sequence"
            - "\$(SEGMENT_SEQUENCE)"
            - "/scripts/script.js"
          volumeMounts:
            - name: scripts
              mountPath: /scripts
      volumes:
        - name: scripts
          configMap:
            name: k6-scripts
\`\`\`

For real deployments, generate one Job per shard from Helm or kustomize so segment values are not hand-edited. Store the intended shard map in ConfigMap data that a pre-test validation pod checks.

## Validation helper: disjoint coverage

Before launch, compute shards in CI and fail if they overlap or leave gaps. Fractions as rational strings are easier to reason about than floats.

\`\`\`typescript
type Shard = { id: string; from: number; to: number };

export function assertCoverage(shards: Shard[], epsilon = 1e-9): void {
  const sorted = [...shards].sort((a, b) => a.from - b.from);
  if (sorted.length === 0) {
    throw new Error("no shards");
  }
  if (Math.abs(sorted[0].from - 0) > epsilon) {
    throw new Error(\`coverage must start at 0, got \${sorted[0].from}\`);
  }
  let cursor = 0;
  for (const s of sorted) {
    if (s.to <= s.from) {
      throw new Error(\`\${s.id} has empty range\`);
    }
    if (Math.abs(s.from - cursor) > epsilon) {
      throw new Error(
        \`gap or overlap before \${s.id}: cursor=\${cursor} from=\${s.from}\`,
      );
    }
    cursor = s.to;
  }
  if (Math.abs(cursor - 1) > epsilon) {
    throw new Error(\`coverage must end at 1, got \${cursor}\`);
  }
}

// Three equal shards
assertCoverage([
  { id: "0", from: 0, to: 1 / 3 },
  { id: "1", from: 1 / 3, to: 2 / 3 },
  { id: "2", from: 2 / 3, to: 1 },
]);
\`\`\`

Generate k6 CLI args from the same source of truth:

\`\`\`typescript
export function segmentArgs(from: string, to: string, sequence: string): string[] {
  return [
    "--execution-segment",
    \`\${from}:\${to}\`,
    "--execution-segment-sequence",
    sequence,
  ];
}

export function equalShards(n: number): { from: string; to: string; sequence: string }[] {
  if (n < 1) throw new Error("n>=1");
  const points: string[] = [];
  for (let i = 0; i <= n; i++) {
    points.push(i === 0 ? "0" : i === n ? "1" : \`\${i}/\${n}\`);
  }
  const sequence = points.join(",");
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ from: points[i], to: points[i + 1], sequence });
  }
  return out;
}
\`\`\`

## Executors and what segmentation means for each

Not every executor feels the same when sharded. Mentally map:

| Executor family | What is partitioned | Tester implication |
| --- | --- | --- |
| Shared iterations | total iterations across VUs | shards split iteration budget |
| Per-VU iterations | iterations each VU runs | VUs assigned to shards |
| Constant / ramping VUs | VU occupancy over time | each shard runs a fraction of VUs |
| Arrival-rate (constant/ramping) | iteration start rate | rate splits across instances |

Arrival-rate scenarios are where triple-launch mistakes hurt most: three full copies of \`rate: 1000\` is 3000 iters/s. Always re-read options after enabling segments and confirm with a dry run against a metrics sink you control.

## Dry-run and smoke proof before the big test

Run a 30-second shard smoke against a dedicated echo service and sum the request counts across shards. The sum should approximate the single-node baseline, not 3x.

\`\`\`javascript
import http from "k6/http";
import { Counter } from "k6/metrics";

const shardHits = new Counter("shard_hits");

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-arrival-rate",
      rate: 30,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 30,
    },
  },
};

export default function () {
  http.get(__ENV.BASE_URL + "/get");
  shardHits.add(1);
}
\`\`\`

Collect end-of-test summaries from each shard (JSON output) and add \`root_group.checks\` / HTTP counters in a small Node reducer:

\`\`\`typescript
import fs from "node:fs";

type Summary = {
  metrics: Record<string, { values?: Record<string, number>; count?: number }>;
};

export function sumHttpReqs(paths: string[]): number {
  let total = 0;
  for (const p of paths) {
    const s = JSON.parse(fs.readFileSync(p, "utf8")) as Summary;
    const m = s.metrics["http_reqs"];
    const count = m?.values?.count ?? m?.count ?? 0;
    total += count;
  }
  return total;
}
\`\`\`

Emit machine-readable summaries with k6's summary export mechanisms supported by your version (for example end-of-test JSON via \`handleSummary\` writing a file). Example \`handleSummary\`:

\`\`\`javascript
export function handleSummary(data) {
  return {
    "summary.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";
\`\`\`

Confirm the import URL and library version against current k6 JS lib docs before pinning.

## Thresholds across distributed runners

Each k6 process evaluates thresholds on **its local** metrics unless you use a centralized metric path (k6 Cloud, Prometheus remote write + separate evaluation, or post-processing). That creates a subtle bug: each shard passes thresholds on a third of the traffic while the merged system would fail, or the reverse.

Strategies:

1. **Post-merge evaluation:** disable hard fail on shards (\`|| true\` only in smoke, not ideal) or use thresholds carefully; merge summaries and evaluate SLOs in a final job.
2. **Central metrics backend:** send all shards to Prometheus/Grafana and evaluate recording rules on the union.
3. **Conservative local thresholds:** set per-shard thresholds only for errors that are scale-invariant (for example, failure rate), and evaluate latency percentiles on the merged stream.

| Metric | Local shard meaning | Merged meaning |
| --- | --- | --- |
| \`http_req_failed\` rate | often similar if traffic homogeneous | primary reliability signal |
| \`p99\` latency | noisy, fewer samples | needs merged or central eval |
| iteration count | fraction of total | sum should match plan |
| data_received | fraction | sum |

For p99 interpretation after merge, apply the same tail-latency discipline you use on single-node runs: tails need enough samples, and generator skew can fake tails when one shard is hot and another is idle.

## Realistic failure mode: the matrix job that forgot the segment

**Symptom:** A GitHub Actions matrix with three containers shows roughly 3x \`http_reqs\` versus the last single-node baseline. API autoscale kicks in. Error rate climbs. Team blames the build under test.

**Diagnosis:**

1. Print the full k6 CLI in each job log. If \`--execution-segment\` is absent, you found it.
2. Compare per-job VU counts and iteration rates in the text summary.
3. Check whether the matrix only changed \`CI_NODE_INDEX\` env but never mapped index to a segment.
4. Verify all jobs used the same \`SEGMENT_SEQUENCE\`.
5. Confirm you did not also multiply \`vus\` in the script when adding shards.

**Fix pattern:** generate args from \`equalShards(matrix.total)\` and \`matrix.index\`; unit-test that generator; fail the workflow if any shard process started without the segment flags (wrapper script).

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

INDEX="\${SHARD_INDEX:?}"
TOTAL="\${SHARD_TOTAL:?}"

# Illustrative mapping for equal shards; keep in sync with unit tests
FROM="\${INDEX}/\${TOTAL}"
TO="$((INDEX + 1))/\${TOTAL}"
if [[ "\${INDEX}" -eq 0 ]]; then FROM="0"; fi
if [[ "\${INDEX}" -eq $((TOTAL - 1)) ]]; then TO="1"; fi

SEQ=$(python3 - <<'PY'
import os
total = int(os.environ["SHARD_TOTAL"])
parts = ["0"] + [f"{i}/{total}" for i in range(1, total)] + ["1"]
# fix: range should be 1..total-1 for interior points
parts = ["0"] + [f"{i}/{total}" for i in range(1, total)] + ["1"]
print(",".join(parts))
PY
)

echo "Running segment \${FROM}:\${TO} sequence \${SEQ}"
k6 run \\
  --execution-segment "\${FROM}:\${TO}" \\
  --execution-segment-sequence "\${SEQ}" \\
  script.js
\`\`\`

(The wrapper is illustrative; harden fraction edges with the same TypeScript generator you unit-test rather than ad-hoc bash arithmetic.)

## What people get wrong

**Assuming k6 Cloud and self-distributed segments are interchangeable.** Managed cloud distribution hides some partitioning details. Self-hosted segments require you to own disjointness, clocks, and metric merge. Do not copy Cloud UI mental models into raw CLI without reading flags.

**Sharding arrival-rate tests without rebalancing preAllocatedVUs.** Each instance still needs enough VUs to sustain its fraction of the rate. Starved VUs produce \`dropped_iterations\`, which looks like SUT slowness but is generator exhaustion.

**Using wall-clock barriers instead of segments.** Sleeping until "all pods ready" does not partition execution; it only synchronizes start. You still need segments (or unique scenario offsets) to avoid full copies.

**Comparing tools without matching generator topology.** A bake-off against another load tool is meaningless if one engine ran distributed correctly and the other ran triple load by accident.

## Clock skew, ramp alignment, and start storms

Distributed runners that start minutes apart smear ramps. Prefer:

- A job controller that starts all shards within a tight window.
- Identical \`duration\` and ramp settings so shapes align.
- Avoid depending on absolute wall clock inside the script for load shape (use k6 executors).

If you must stage a global start, a shared "start after timestamp" can help, but test it: misconfigured timestamps cause zero traffic or sudden cliffs.

\`\`\`javascript
import { sleep } from "k6";

export function setup() {
  const startAt = Number(__ENV.START_AT_UNIX || 0);
  if (startAt > 0) {
    const waitMs = startAt * 1000 - Date.now();
    if (waitMs > 0) {
      // sleep() takes seconds. Without this the barrier computes a delay and
      // then starts immediately, which is the bug it was meant to prevent.
      sleep(waitMs / 1000);
    }
  }
  return { started: Date.now() };
}
\`\`\`

For production, use orchestration readiness rather than reinventing barriers in every script.

## Data parameterization across shards

If each VU picks users from a CSV, shards can collide on the same credentials and create artificial contention (or optimistic concurrency storms on the same accounts).

Patterns:

1. **Partition the data file** the same way you partition execution (rows 0:1/3, etc.).
2. **Offset IDs by shard index:** \`userId = shardIndex * 1_000_000 + vuId\`.
3. **Shared read-only catalog** is fine; shared write identities are not.

\`\`\`javascript
const SHARD = Number(__ENV.SHARD_INDEX || 0);
const VUS_PER_SHARD = 1000; // illustrative

export function userIdForVu(vu) {
  return SHARD * VUS_PER_SHARD + vu;
}
\`\`\`

## Observability: label metrics by shard

When remote-writing metrics, attach \`shard_id\`, \`segment\`, and \`test_run_id\`. Without labels, you cannot detect a dead shard (traffic low) versus a healthy split.

\`\`\`bash
export TEST_RUN_ID="\${CI_PIPELINE_ID}_\${CI_JOB_ID}"
k6 run \\
  --tag test_run_id="\${TEST_RUN_ID}" \\
  --tag shard="\${SHARD_INDEX}" \\
  --execution-segment "\${FROM}:\${TO}" \\
  --execution-segment-sequence "\${SEQ}" \\
  script.js
\`\`\`

## CI sketch with a matrix

\`\`\`yaml
jobs:
  k6-distributed:
    strategy:
      matrix:
        shard: [0, 1, 2]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: run shard
        env:
          SHARD_INDEX: \${{ matrix.shard }}
          SHARD_TOTAL: "3"
          BASE_URL: \${{ vars.BASE_URL }}
          CI_PIPELINE_ID: \${{ github.run_id }}
          CI_NODE_INDEX: \${{ matrix.shard }}
        run: |
          ./scripts/k6-shard.sh
      - name: upload summary
        uses: actions/upload-artifact@v4
        with:
          name: summary-\${{ matrix.shard }}
          path: summary.json
  k6-merge:
    needs: k6-distributed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - name: merge and evaluate
        run: node ./scripts/merge-k6-summaries.js
\`\`\`

## Security and safety rails

Distributed load against shared staging can still be a denial-of-service if segments are wrong. Rails:

- Hard cap \`MAX_VUS\` and \`MAX_RATE\` in a wrapper that reads the script options and multiplies by shard count only after segment validation.
- Require an allowlisted \`BASE_URL\`.
- Separate generator namespaces from production credentials.
- Announce test windows when fan-out exceeds a threshold.

## Choosing when to distribute at all

| Situation | Single runner | Distributed segments |
| --- | --- | --- |
| Low rate API smoke | usually enough | unnecessary complexity |
| CPU-heavy client work (crypto, large JSON) | saturates one box | good fit |
| High fan-out to many targets | network/CPU limits | good fit |
| Need exact low-rate pacing | simpler on one node | careful rate splits |
| Quick local debug | always | no |

Distribution fixes **generator capacity**, not SUT bugs. If p99 is bad at 50 VUs on one machine, more shards will not help the product. Scale the system under test only after you have proven the generator is honest.

A practical decision rule for PR versus nightly pipelines: keep PR performance smoke on a single runner with a capped VU count so feedback stays under a few minutes. Promote the same script to distributed segments only when the nightly (or pre-release) profile exceeds what one box can sustain without CPU steal on the generator. That promotion should be a config change (shard count + segment map), not a rewrite of the scenario logic. If promoting requires different think times or different endpoints, you no longer have a comparable baseline.

When you do promote, freeze three artifacts beside the summaries: the segment map JSON, the script content hash, and the SUT version or image digest. Without those, a later "we got slower" conversation cannot separate generator topology drift from product regression. Teams that skip the artifact pack often "fix" performance by changing shard count until the chart looks flat, which is the inverse of engineering.

Also watch for **asymmetric hardware**. One large runner plus two tiny runners with equal segments will not produce equal load if the tiny runners cannot keep their fraction of an arrival-rate scenario. Prefer identical generator instance types, or weight segments by measured capacity only after a calibration run that records achieved rate versus intended rate per shard.

## End-to-end checklist

- [ ] Document intended total VUs/rate for the logical test.
- [ ] Generate disjoint segments from a single function under unit test.
- [ ] Pass identical segment sequence to every runner.
- [ ] Tag metrics with run id and shard id.
- [ ] Smoke-compare summed traffic to single-node baseline.
- [ ] Merge latency percentiles centrally or post-process.
- [ ] Partition test data identities per shard.
- [ ] Print full CLI in logs for audit.
- [ ] Cap maximum fan-out in the wrapper.
- [ ] Read p99 with enough samples after merge.

## Frequently Asked Questions

### What does k6 execution segments distributed testing solve that replica count does not?

Replica count without segments multiplies the full execution plan. Execution segments partition one plan across runners so total VUs, iterations, and arrival rates stay near the design point. You distribute **generator capacity**, not accidental load. Without segments, scaling runners is a load multiplication bug wearing a DevOps costume.

### Can I rely on each shard's p99 threshold for the whole system?

Usually not. Each shard sees fewer samples and a partial view. Failure rate can be roughly local, but tail latency should be evaluated on merged metrics or a central backend. Use shard-local thresholds for coarse abort conditions only, then apply the real SLO checks on the union as described in your p99 analysis process.

### How do I prove shards did not overlap?

Unit-test the shard map for disjoint coverage of \`[0,1)\` / \`0:1\`, log the segment flags every run, and compare summed request counts to a single-node baseline within a tolerance band. Overlap shows up as inflated throughput and sometimes as duplicated user IDs if data was not partitioned.

### Do I need distributed segments to compare k6 with JMeter?

Only if the comparison claims the same load shape at a scale that needs multiple generators. A fair bake-off requires equal effective arrival rates, think times, and data contention. Fix topology first, then compare tools. Otherwise you are comparing accidents, not engines.
`,
};
