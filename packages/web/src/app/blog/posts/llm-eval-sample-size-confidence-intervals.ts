import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Eval Sample Size Confidence Intervals: Stop Shipping on a 30-Prompt Vibes Check',
  description:
    'LLM eval sample size confidence intervals for agent quality gates: Wilson math, stratified sets, CI scripts, and flake-proof release floors.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# LLM Eval Sample Size Confidence Intervals: Stop Shipping on a 30-Prompt Vibes Check

A demo that passes 27 of 30 hand-picked prompts feels like progress. Statistically, it is almost silent. With a true pass rate near 90%, a sample of 30 can swing several points either way from pure sampling noise, before you even count judge variance or model nondeterminism. **LLM eval sample size confidence intervals** are how QA and platform teams turn "looks better on my laptop" into a gate with a stated error bar, a required N, and a rule for when two eval runs are actually different.

This guide is written for test-automation engineers and AI quality owners who already run prompt suites, golden sets, or agent scenarios. You will compute Wilson score intervals for pass/fail metrics, size experiments before you collect data, stratify hard cases so one easy bucket cannot mask regressions, and wire thresholds into CI without inventing fake precision. We stay with standard binomial and bootstrap ideas you can implement in a short TypeScript or Python helper. No fabricated industry benchmarks: when a number is illustrative, it is labeled as such.

For broader agent harness design, see the [agentic AI testing guide 2026](/blog/agentic-ai-testing-guide-2026). When tools enter through MCP, evaluation must also cover tool contracts; pair this sampling work with [MCP servers test automation 2026](/blog/mcp-servers-test-automation-2026).

## What you are estimating (and what you are not)

Most offline LLM evals reduce each case to a binary or graded outcome:

- **Binary:** pass/fail from exact match, unit tests on code output, rubric threshold, or LLM-as-judge vote collapsed to pass.
- **Bounded score:** 0-1 or 1-5 from a rubric, sometimes averaged.
- **Structured:** several binary checks per case (schema valid, citation present, no PII), then a case pass if all checks pass.

Sample size math is cleanest on **independent Bernoulli trials**: each eval case is a trial, success means the system passed that case. If one "case" is really a long agent trajectory with shared state, independence is weaker; treat trajectories as the unit, not individual tool calls, unless you design otherwise.

Confidence intervals answer: "Given this sample, what range of true pass rates is plausible?" They do not answer: "Will production users be happy?" Coverage, representativeness, and construct validity are separate. A tight interval around a biased set is precise and wrong.

## Why 30 examples lie to you (illustrative)

Suppose the true pass rate is 0.90. Draws of size 30 are still wide. An illustrative Wilson 95% interval for 27/30 successes is roughly 0.74 to 0.97 (compute with the helper below for your environment). That range can hide both a real regression to 0.80 and a real improvement to 0.95. Shipping because the point estimate moved from 0.87 to 0.90 on N=30 is theater.

| Successes / N | Point estimate | Approx. 95% Wilson interval (illustrative) | Decision usefulness |
| --- | --- | --- | --- |
| 27/30 | 0.90 | ~0.74 - 0.97 | Too wide for release gates |
| 90/100 | 0.90 | ~0.83 - 0.95 | Borderline for coarse gates |
| 270/300 | 0.90 | ~0.86 - 0.93 | Usable for medium stakes |
| 900/1000 | 0.90 | ~0.88 - 0.92 | Better for high stakes |

Read the table as intuition, not as a universal law. Recompute for your observed rate; intervals are widest near 0.5 and narrower near 0 or 1 for the same N.

## Wilson score interval for pass rates

The Wilson score interval is a standard choice for binomial proportions, better behaved than the normal approximation (\`p ± z * sqrt(p(1-p)/n)\`) at small N or extreme p. Implement it once; reuse it in every eval report.

\`\`\`typescript
export function wilsonInterval(
  successes: number,
  n: number,
  z = 1.959963984540054, // ~95% two-sided
): { low: number; high: number; pHat: number } {
  if (n <= 0) {
    throw new Error("n must be positive");
  }
  if (successes < 0 || successes > n) {
    throw new Error("successes out of range");
  }

  const pHat = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = pHat + z2 / (2 * n);
  const margin =
    z * Math.sqrt((pHat * (1 - pHat) + z2 / (4 * n)) / n);

  return {
    pHat,
    low: (center - margin) / denom,
    high: (center + margin) / denom,
  };
}

// Example: 270 passes out of 300
const w = wilsonInterval(270, 300);
console.log(w);
\`\`\`

Report \`pHat\`, \`low\`, \`high\`, \`n\`, and the confidence level on every eval artifact. Dashboards that show only a percentage without N train teams to overread noise.

## Choosing N before you run the suite

Two common design questions:

1. **Precision:** How large must N be so a 95% interval half-width is at most E when the true rate is near p?
2. **Comparison:** How large must N be to detect a drop from p0 to p1 with stated power?

A simple sample-size approximation for a desired margin of error E on a proportion (normal-based, good enough for planning) is:

\`\`\`text
n ≈ (z^2 * p * (1 - p)) / E^2
\`\`\`

Use p=0.5 for a conservative plan when you do not know p; use a historical p when you do.

\`\`\`typescript
export function planSampleSize(opts: {
  p: number;
  margin: number;
  z?: number;
}): number {
  const z = opts.z ?? 1.959963984540054;
  const p = opts.p;
  if (opts.margin <= 0 || opts.margin >= 1) {
    throw new Error("margin must be between 0 and 1");
  }
  const n = (z * z * p * (1 - p)) / (opts.margin * opts.margin);
  return Math.ceil(n);
}

// Illustrative: want ±0.03 margin near p=0.9 at 95%
console.log(planSampleSize({ p: 0.9, margin: 0.03 })); // planning number only
\`\`\`

For A/B style comparisons of two systems (base model vs candidate) on the **same** case set, prefer paired designs: each case yields (pass_base, pass_cand). McNemar-style tests or bootstrap on paired differences often need fewer cases than two independent proportions for the same sensitivity. Planning details belong in your stats notebook; the QA gate should still publish intervals on each arm and on the delta.

## Stratified sampling: the anti-gaming design

A flat random sample from a repo of easy prompts will report high pass rates forever. Stratify by failure mode risk:

| Stratum | Example content | Target share of N | Why it exists |
| --- | --- | --- | --- |
| Core happy path | common user intents | 40% | protects baseline UX |
| Tool / MCP boundary | invalid args, timeouts | 20% | catches integration regressions |
| Safety / policy | jailbreaks, PII asks | 15% | high cost of miss |
| Long context | multi-file, multi-turn | 15% | length regressions |
| Adversarial format | weird unicode, huge JSON | 10% | parser and guard edges |

Allocate N per stratum, compute Wilson **per stratum**, and define release rules on the **worst material stratum** or on a weighted objective, not only on the global mean. Global mean alone lets an easy 40% bucket hide a safety collapse.

\`\`\`typescript
type StratumResult = {
  name: string;
  successes: number;
  n: number;
  minLow: number; // release floor for interval low bound
};

export function stratumGate(results: StratumResult[]): {
  ok: boolean;
  reports: Array<StratumResult & { low: number; high: number; pHat: number }>;
} {
  const reports = results.map((r) => {
    const iv = wilsonInterval(r.successes, r.n);
    return { ...r, ...iv };
  });
  const ok = reports.every((r) => r.low >= r.minLow);
  return { ok, reports };
}
\`\`\`

## Nondeterminism multiplies the sample problem

Even with temperature 0, providers can change, tools can race, and judges can flip. Treat repeated runs carefully:

- **Same case, K repeats:** estimate per-case pass probability, then aggregate (for example, case passes if ≥2 of 3 runs pass). Report K in the artifact.
- **Do not pretend N = cases * K independent for confidence intervals** if repeats are highly correlated. A conservative approach is to define the unit as the case after aggregation, so N stays equal to the number of cases.
- **Seed and provider version pinning** reduce variance; still publish intervals rather than single-shot percentages.

Illustrative aggregation:

\`\`\`typescript
type CaseRun = { caseId: string; passes: boolean[] };

export function aggregateCases(
  runs: CaseRun[],
  kNeeded: number,
): { successes: number; n: number } {
  let successes = 0;
  for (const c of runs) {
    const passCount = c.passes.filter(Boolean).length;
    if (passCount >= kNeeded) successes += 1;
  }
  return { successes, n: runs.length };
}
\`\`\`

## LLM-as-judge noise: measure it before you enlarge N

If the dominant error is judge flip-flopping, buying more prompt cases does not fix the metric. Run a repeated-judge study on a fixed subset:

1. Freeze model outputs for M cases.
2. Score each output J times with the judge prompt.
3. Estimate disagreement rate.
4. If disagreement is high, improve rubric, use majority vote, or replace judge with deterministic checks for that slice.

| Source of variance | Symptom | Mitigation |
| --- | --- | --- |
| Sampling of cases | scores move when set reshuffles | larger N, stratification, fixed eval snapshots |
| Model sampling | same case flips | temperature policy, K-of-J aggregation |
| Judge sampling | same transcript flips | rubric tighten, majority vote, dual judge |
| Tool environment | MCP/server flake | isolate tools, fake clocks, contract tests |
| Prompt drift | silent template edits | pin prompt versions in eval config |

## Bootstrap intervals for non-binary scores

When each case yields a score in [0, 1], a mean with bootstrap percentile intervals is a practical approach without heavy parametric assumptions.

\`\`\`typescript
export function bootstrapMeanInterval(
  scores: number[],
  opts?: { draws?: number; seed?: number },
): { mean: number; low: number; high: number } {
  const draws = opts?.draws ?? 2000;
  if (scores.length === 0) {
    throw new Error("scores empty");
  }

  // Simple LCG for reproducible draws in CI without extra deps
  let state = opts?.seed ?? 42;
  const rand = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  const means: number[] = [];
  const n = scores.length;
  for (let d = 0; d < draws; d++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rand() * n);
      sum += scores[idx];
    }
    means.push(sum / n);
  }
  means.sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const loIdx = Math.floor(0.025 * draws);
  const hiIdx = Math.min(draws - 1, Math.floor(0.975 * draws));
  return { mean, low: means[loIdx], high: means[hiIdx] };
}
\`\`\`

Use bootstrap when averages matter (toxicity score, similarity). Use Wilson when leadership asks "what percent of tasks succeed?"

## CI gate shapes that match the math

Bad gate: \`pass_rate >= 0.9\` on whatever N the folder happens to contain.

Better gates:

1. **Minimum N:** fail if \`n < nMin\` for any required stratum.
2. **Interval floor:** fail if Wilson lower bound \`< L\` (for example, L=0.85 on core stratum). This automatically demands more evidence when point estimates sit near the cliff.
3. **Regression vs baseline:** fail if the candidate's interval is entirely below the baseline interval, or if a paired delta's interval is entirely negative by more than tolerance.
4. **Non-inferiority:** allow ship if candidate lower bound is above baseline lower bound minus ε (illustrative ε=0.02), used when you accept tiny losses for cost wins.

\`\`\`typescript
export type EvalArtifact = {
  name: string;
  successes: number;
  n: number;
  nMin: number;
  lowerBoundMin: number;
};

export function evaluateGate(a: EvalArtifact): { pass: boolean; reason: string } {
  if (a.n < a.nMin) {
    return {
      pass: false,
      reason: \`\${a.name}: n=\${a.n} < nMin=\${a.nMin}\`,
    };
  }
  const { low, pHat, high } = wilsonInterval(a.successes, a.n);
  if (low < a.lowerBoundMin) {
    return {
      pass: false,
      reason: \`\${a.name}: Wilson low=\${low.toFixed(4)} < \${a.lowerBoundMin} (pHat=\${pHat.toFixed(4)}, high=\${high.toFixed(4)}, n=\${a.n})\`,
    };
  }
  return {
    pass: true,
    reason: \`\${a.name}: ok pHat=\${pHat.toFixed(4)} CI=[\${low.toFixed(4)}, \${high.toFixed(4)}] n=\${a.n}\`,
  };
}
\`\`\`

Wire into Vitest or a plain Node script in CI:

\`\`\`typescript
import { describe, expect, it } from "vitest";

describe("llm eval gates", () => {
  it("core stratum meets interval floor", () => {
    const result = evaluateGate({
      name: "core",
      successes: 270,
      n: 300,
      nMin: 200,
      lowerBoundMin: 0.85,
    });
    expect(result.pass, result.reason).toBe(true);
  });
});
\`\`\`

Run a single gate while debugging with \`vitest run -t "core stratum"\`.

## Realistic failure mode: the "green" eval after a silent distribution shift

**Symptom:** Global pass rate holds at ~0.91 on N=500. Support tickets about tool failures spike. Product insists quality is fine because the dashboard is flat.

**Diagnosis:**

1. Split results by stratum. Tool boundary stratum dropped from ~0.88 to ~0.70 while happy path rose slightly (prompt tweak helped easy cases).
2. Check confidence intervals: tool stratum Wilson low now sits under the floor; global mean still clears a weak gate.
3. Inspect case weights: was the suite rebalanced accidentally (more easy cases added)?
4. Confirm judge prompt did not change in the same commit as the model.
5. Diff MCP server versions and fixture clocks; tool flakes can look like model regressions.

**Fix pattern:** enforce per-stratum interval floors; freeze suite composition with a lockfile of case IDs and content hashes; require eval config version in the artifact JSON. What people get wrong is treating the global average as a sufficient statistic. It is not.

## Power, p-hacking, and eval peeking

Repeatedly re-running a candidate until the gate passes is the LLM version of p-hacking. Mitigations:

- Pre-register the suite, N, and rule in the PR template.
- Allow at most one official eval run per commit SHA per suite version (reruns only for infra failure, labeled as such).
- Separate **exploration** sets from **release** sets. Exploration can be small and biased; release must meet N and interval rules.
- Log every run to an append-only store (object storage JSON lines) with model version, prompt hashes, and case set hash.

\`\`\`json
{
  "commit": "abc123",
  "suite": "agent-release-v4",
  "suiteHash": "sha256:...",
  "model": "provider-model-id",
  "promptVersions": { "system": "2026-08-01", "judge": "2026-07-15" },
  "strata": [
    { "name": "core", "successes": 270, "n": 300 },
    { "name": "tools", "successes": 160, "n": 200 }
  ]
}
\`\`\`

## Cost control without starving N

LLM eval is expensive. Ways to keep N honest without boiling the budget:

| Tactic | Effect on inference cost | Risk if misused |
| --- | --- | --- |
| Stratified downsample of easy cases | lowers cost | under-tests happy path if cut too hard |
| Cascade: cheap deterministic checks first | skips LLM when format fails | must not skip safety-only cases |
| Shadow smaller N on PR, full N nightly | fast PR signal | PR can miss rare strata if too small |
| Cache model outputs when only judge changes | big savings | stale outputs if tools changed |
| Shared public golden set + private holdout | reuse industry cases | contamination if in training data |

A practical pattern: PR gate uses N_pr with interval floors calibrated to be slightly looser but still requires minimums per critical stratum; nightly uses N_full with tight floors. Never let PR N drop below the size where a single flake flips the gate randomly without detection: if one case is ~1/N of the score, know that fraction.

## Pairing with agent and MCP test automation

Agent runs often fail for non-model reasons: wrong tool selected, schema violation, auth error. Count those as system failures in the binary metric, but tag them so model-only regressions remain visible. Contract tests against MCP servers should stay in a deterministic suite; do not spend LLM samples to rediscover that a required JSON field is missing. Apply the same tool-automation patterns you use for MCP contract suites, and reserve LLM samples for behaviors that need generation.

Agent scenario design should define the unit of evaluation (trajectory vs single turn) before you compute N. Mixing units silently invalidates intervals and makes Wilson bounds look tighter than the experiment supports.

## Reporting template for humans who will overread the number

Every eval comment on a PR should include:

1. Suite name + content hash.
2. Model and decoding parameters.
3. Per-stratum \`successes/n\`, \`pHat\`, Wilson 95% interval.
4. Gate rule in prose ("fail if any stratum Wilson low < threshold or n < nMin").
5. Comparison to baseline commit with the same suite hash.
6. Known infra anomalies (provider outage, retried cases).

Markdown example:

\`\`\`markdown
### Eval: agent-release-v4 (sha256:9f2c...)

| Stratum | Pass | n | pHat | 95% Wilson | Floor |
| --- | --- | --- | --- | --- | --- |
| core | 270 | 300 | 0.900 | [0.862, 0.929] | low≥0.85 |
| tools | 160 | 200 | 0.800 | [0.739, 0.850] | low≥0.75 |
| safety | 95 | 100 | 0.950 | [0.889, 0.979] | low≥0.90 |

Gate: PASS
Baseline: def456 (no significant paired drop on core)
\`\`\`

## What people get wrong about "statistical significance" in LLM evals

They paste a t-test on overlapping, non-independent scores, declare p<0.05, and ship. Problems: multiple comparisons across many prompts, peeking, nonstable judges, and tiny effects with no user value. Prefer precommitted interval gates and paired deltas with intervals. If you need formal hypothesis tests, involve someone who will model dependence correctly; do not invent a one-line test from memory in the harness.

Also wrong: equating **confidence level** (95%) with **probability the model is good**. A 95% interval means roughly that the procedure covers the true parameter 95% of the time under its assumptions, not that you are 95% sure users will like the release.

## Minimal Python twin for data teams

If your eval lake lives in Python, keep the same Wilson definition so TS gates and notebooks do not disagree.

\`\`\`python
import math
from dataclasses import dataclass

@dataclass
class WilsonResult:
    p_hat: float
    low: float
    high: float

def wilson(successes: int, n: int, z: float = 1.959963984540054) -> WilsonResult:
    if n <= 0:
        raise ValueError("n must be positive")
    if successes < 0 or successes > n:
        raise ValueError("successes out of range")
    p = successes / n
    z2 = z * z
    denom = 1 + z2 / n
    center = p + z2 / (2 * n)
    margin = z * math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)
    return WilsonResult(p_hat=p, low=(center - margin) / denom, high=(center + margin) / denom)
\`\`\`

## Agent workflows and skill packs

When coding agents change prompts or tools, require them to run the eval script and paste the interval table, not a vibes summary. Ready-made QA skills for eval harnesses can install from qaskills.sh with the qaskills CLI so agents load the same gate definitions humans use.

## Checklist for your next eval redesign

- [ ] Define the unit of analysis (case, trajectory, session).
- [ ] Split into strata with explicit target shares.
- [ ] Choose binary vs score metrics per stratum.
- [ ] Plan N for desired margin on the hardest material stratum.
- [ ] Implement Wilson (and bootstrap if needed) in one shared library.
- [ ] Gate on lower bounds + nMin, not point estimates alone.
- [ ] Pin suite hash, prompt versions, model id in artifacts.
- [ ] Separate exploration from release sets.
- [ ] Measure judge disagreement before scaling N.
- [ ] Record paired comparisons against a baseline commit.

## Frequently Asked Questions

### How many samples do I need for LLM eval sample size confidence intervals?

Enough that the Wilson lower bound (or bootstrap lower bound) for each **release-critical stratum** sits above your product floor under expected pass rates. As a planning heuristic, margins of ±0.03 near high pass rates often need hundreds of cases per critical stratum, not dozens; recompute with \`planSampleSize\` for your p and margin. Safety strata may demand tighter floors even if N costs more. There is no universal N that fits every product.

### Can I use the same confidence interval methods for streaming token metrics?

Not directly as binomial Wilson. Token-level metrics need different aggregation (per-case averages, then bootstrap across cases). Always bootstrap or interval-estimate at the case level so N equals the number of tasks, not the number of tokens. Token counts inflate N and produce falsely narrow intervals.

### Do temperature zero runs remove the need for confidence intervals?

No. Temperature zero reduces one noise source but leaves sampling over cases, judge variance, tool timing, and provider-side changes. You still need intervals for the finite eval set. Temperature zero can, however, reduce the need for multi-repeat aggregation on some tasks.

### Should we fail CI when the interval is wide but the point estimate is high?

Yes, if the width implies you lack evidence for the claim you are making. A wide interval with a high midpoint means "maybe great, maybe not." Minimum N and lower-bound floors encode that honesty. Alternatively, mark the suite as exploratory and block release on a larger nightly set instead of lying with a green check on insufficient data.
`,
};
