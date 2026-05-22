import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAI Evals Best Practices: Production Patterns for 2026',
  description:
    'Production-tested best practices for OpenAI Evals in 2026. Covers dataset curation, grader calibration, statistical significance, CI gating, cost optimization, observability, multi-tier suites, prompt version control, A/B testing patterns, and how leading teams structure their LLM quality programs.',
  date: '2026-05-21',
  category: 'Best Practices',
  content: `
Most teams adopt OpenAI Evals enthusiastically, build a few eval datasets, run them once or twice, and then watch them gather dust. The framework is excellent, but using it well requires more than installing a Python package. It requires habits: how you curate examples, how you calibrate graders, how you treat eval results as data, and how you tie evaluation to product decisions.

This article captures the practices I have seen succeed across dozens of production LLM systems in 2026. None of them are difficult on their own, but together they separate teams that ship reliable AI products from teams that ship hope.

## Key Takeaways

- Evals are an operational practice, not a one-time setup. Treat them like tests in a healthy software organization.
- Dataset curation is the single highest-leverage activity. Allocate dedicated time for it.
- Calibrate model graders against human judgment before trusting them in CI. A grader that disagrees with humans is worse than no grader at all.
- Run evals in tiers: cheap smoke tests on every commit, full suites nightly, deep dives weekly.
- Track eval results as time-series data, not single numbers. Trends reveal more than absolute scores.
- Tie eval improvements to user-visible metrics. A quality program that does not move product outcomes loses funding fast.

---

## Treat Evals as Production Infrastructure

The teams who get the most value from evals treat them like a production system. They have on-call coverage for eval pipeline failures. They run synthetic monitoring against the eval API. They version-control dataset changes the same way they version-control code changes.

The teams who struggle treat evals like a side project. They build them once, lose the original maintainer, and slowly drift into a state where nobody trusts the results.

The difference is mostly cultural. If your engineering organization has a strong testing culture, evals will slot in naturally. If your organization treats tests as someone else's problem, evals will face the same fate.

---

## Dataset Curation

A great dataset is the difference between an eval that catches real problems and an eval that produces noise. Three principles drive great datasets.

### Principle 1: Examples Come from Production

Synthetic examples have their place, but they cannot replace real user traffic. Every team I have worked with that achieves high signal-to-noise ratio in their evals does the same thing: they sample production logs weekly, anonymize the inputs, and add the interesting ones to the eval dataset.

\`\`\`python
import random
from production_logs import sample_recent_traffic

# Sample 200 production interactions from last 7 days
samples = sample_recent_traffic(days=7, n=200)

# Filter for interesting cases
interesting = [
    s for s in samples
    if s.user_feedback in ("thumbs_down", "explicit_complaint")
    or s.latency_ms > 5000
    or s.tool_error_count > 0
]

# Anonymize and add to dataset
for sample in interesting:
    eval_dataset.add({
        "input": anonymize(sample.input),
        "context": anonymize(sample.context),
        "tags": sample.tags,
        "added_from": "production-2026-05-21",
    })
\`\`\`

### Principle 2: Tag Aggressively

Every example should carry tags that let you slice results. Without tags, you cannot tell whether your accuracy dropped because of code generation regressions or because of summarization regressions. With tags, you can isolate the problem in minutes.

Useful tag dimensions:

- **Capability**: classification, summarization, code-generation, tool-use, math
- **Difficulty**: easy, medium, hard, edge-case
- **Source**: production, synthetic, redteam, customer-reported
- **Risk**: low, medium, high (for prioritizing improvements)
- **Stage**: smoke, regression, deep-dive

### Principle 3: Refresh Continuously

Datasets decay. A dataset that perfectly represented your product six months ago no longer does. Schedule monthly dataset refreshes where you remove examples that have become trivial, add examples representing new failure modes, and rebalance tags.

| Metric | Target |
|--------|--------|
| Refresh cadence | Monthly |
| Examples added per refresh | 10-20% of total |
| Examples removed per refresh | 5-10% of total |
| Production traffic ratio | At least 60% from real users |

---

## Grader Calibration

Model graders are useful, but they introduce their own errors. A grader that scores 80 percent of outputs as "good" when humans score them at 70 percent is biased. Calibrate before deploying.

The calibration procedure:

1. Sample 100 examples from your dataset
2. Have a human rate each one on the same scale your grader uses
3. Run your grader on the same 100 examples
4. Compute agreement metrics: percent exact match, mean absolute error, Cohen's kappa

\`\`\`python
from sklearn.metrics import cohen_kappa_score
import numpy as np

human_scores = [...]  # ratings from human reviewers
grader_scores = [...]  # ratings from model grader

exact_match = np.mean(np.array(human_scores) == np.array(grader_scores))
mae = np.mean(np.abs(np.array(human_scores) - np.array(grader_scores)))
kappa = cohen_kappa_score(human_scores, grader_scores)

print(f"Exact match: {exact_match:.1%}")
print(f"Mean absolute error: {mae:.2f}")
print(f"Cohen's kappa: {kappa:.2f}")
\`\`\`

Targets for production deployment:

- Exact match: 70 percent or higher
- Mean absolute error: 0.5 or lower on a 5-point scale
- Cohen's kappa: 0.6 or higher (substantial agreement)

If your grader does not hit these targets, rewrite the grading prompt and retry. If multiple iterations fail to converge, the task may not be suitable for a model grader.

### Reducing Grader Bias

Common biases in model graders:

- **Length bias**: longer outputs get higher scores regardless of quality
- **Confidence bias**: outputs that sound confident get higher scores
- **Self-preference**: graders prefer outputs from the same model family

Mitigations:

\`\`\`python
grader_prompt = """
You are an objective evaluator.

IMPORTANT:
- Length does not equal quality. Score short, correct answers as highly as long ones.
- Confident wording does not equal correctness. Verify facts.
- Do not favor any particular style or format.

Question: {{input}}
Response: {{output}}
Ideal: {{ideal}}

Score on a scale of 1-5 based ONLY on factual correctness and task completion.
"""
\`\`\`

---

## Statistical Significance

A single eval run is a sample. Treat it that way.

If your accuracy is 85 percent on a 100-example dataset, the 95 percent confidence interval is roughly 78 to 91 percent. Two consecutive runs at 84 and 86 percent are not different. Two runs at 75 and 92 percent are different.

\`\`\`python
from statsmodels.stats.proportion import proportion_confint

n = 100
successes = 85
ci_low, ci_high = proportion_confint(successes, n, alpha=0.05, method="wilson")
print(f"Accuracy: {successes/n:.1%} (95% CI: {ci_low:.1%} - {ci_high:.1%})")
\`\`\`

For regression detection, use a two-proportion z-test:

\`\`\`python
from statsmodels.stats.proportion import proportions_ztest

baseline_successes = 850
baseline_total = 1000
candidate_successes = 820
candidate_total = 1000

stat, p_value = proportions_ztest(
    [baseline_successes, candidate_successes],
    [baseline_total, candidate_total],
)
print(f"p-value: {p_value:.4f}")
\`\`\`

A p-value below 0.05 means the difference is statistically significant. Otherwise, it could easily be noise.

---

## Tiered Eval Suites

Running 1000 examples on every commit is wasteful. Running 10 examples nightly is useless. Run different sized suites at different cadences.

| Tier | Examples | Cadence | Cost | Purpose |
|------|----------|---------|------|---------|
| Smoke | 20-50 | Every commit | <$0.50 | Catch catastrophic regressions |
| Standard | 200-500 | Every PR merge | $2-$10 | Catch typical regressions |
| Full | 1000-5000 | Nightly | $20-$100 | Statistical confidence |
| Deep dive | 5000+ | Weekly | $100-$500 | Pre-release sign-off |

The smoke tier is your fast feedback loop. It should run in under 90 seconds and cost less than a coffee. The deep dive is your safety net before high-stakes deployments.

\`\`\`python
# Configure tiers in a single file
TIERS = {
    "smoke": {
        "dataset": "datasets/smoke.jsonl",
        "model": "gpt-5-mini",
        "grader_model": "gpt-5-mini",
        "max_examples": 50,
    },
    "standard": {
        "dataset": "datasets/standard.jsonl",
        "model": "gpt-5",
        "grader_model": "gpt-5",
        "max_examples": 500,
    },
    "full": {
        "dataset": "datasets/full.jsonl",
        "model": "gpt-5",
        "grader_model": "gpt-5",
        "max_examples": None,
    },
}
\`\`\`

---

## CI Gating

The point of CI evals is to prevent bad changes from merging. The gate has to be calibrated correctly: too tight and engineers fight the system; too loose and regressions slip through.

\`\`\`yaml
- name: Run smoke evals
  run: |
    oaievals run smoke \\
      --baseline main \\
      --regression-threshold 0.03 \\
      --report-json results.json
\`\`\`

A 3 percent regression threshold is a reasonable starting point. Tighter thresholds (1 percent) work for mature, stable products. Looser thresholds (5 percent) are appropriate during rapid iteration.

### Failure Reporting

When CI evals fail, the report should make the failure actionable.

\`\`\`typescript
import { EvalRunner, GitHubReporter } from '@openai/evals';

const runner = new EvalRunner({ /* config */ });
const result = await runner.run();

const reporter = new GitHubReporter({
  token: process.env.GITHUB_TOKEN,
  prNumber: parseInt(process.env.PR_NUMBER!),
});

if (result.regressionDetected) {
  await reporter.postComment({
    title: 'LLM Quality Regression Detected',
    body: \`
Baseline accuracy: \${(result.baseline.accuracy * 100).toFixed(1)}%
Candidate accuracy: \${(result.candidate.accuracy * 100).toFixed(1)}%
Regression: \${(result.regression * 100).toFixed(1)}%

Top failing examples:
\${result.topFailures.slice(0, 5).map(f =>
  \`- "\${f.input.slice(0, 60)}..." (expected: \${f.ideal.slice(0, 40)}...)\`,
).join('\\n')}
    \`,
  });
}
\`\`\`

---

## Observability and Time Series

Treat eval results as time-series data. A single run tells you one number; a trend tells you a story.

\`\`\`python
from datetime import datetime
import sqlite3

conn = sqlite3.connect("eval_history.db")
conn.execute("""
    CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY,
        timestamp TEXT,
        model TEXT,
        dataset TEXT,
        accuracy REAL,
        mean_latency_ms INTEGER,
        cost_usd REAL,
        commit_sha TEXT
    )
""")

def record_run(result, commit_sha):
    conn.execute(
        "INSERT INTO runs VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)",
        (
            datetime.utcnow().isoformat(),
            result.model,
            result.dataset_name,
            result.accuracy,
            result.mean_latency_ms,
            result.cost_usd,
            commit_sha,
        ),
    )
    conn.commit()
\`\`\`

Pipe this data into a dashboard. Grafana, Datadog, or even a simple matplotlib plot are all fine. The point is making the trend visible.

### Alerting

Set up automated alerts on:

- Accuracy drops more than 2 standard deviations below the 30-day moving average
- Cost per run increases by more than 50 percent week over week
- Latency p95 increases by more than 30 percent
- Eval run failures (exceptions, not low scores)

---

## A/B Testing Prompts

The right way to compare prompt variants is to run them against the same eval dataset. Run all variants in parallel, control for confounders, and use statistical tests on the results.

\`\`\`python
variants = {
    "control": "You are a helpful assistant.",
    "v2-concise": "You are a concise assistant. Limit responses to 3 sentences.",
    "v3-structured": "You are a structured assistant. Always respond in markdown with headers.",
}

results = {}
for name, prompt in variants.items():
    eval.system_prompt = prompt
    results[name] = eval.run()

# Statistical comparison
baseline = results["control"]
for name, result in results.items():
    if name == "control":
        continue
    p_value = compare_proportions(
        baseline.successes, baseline.total,
        result.successes, result.total,
    )
    print(f"{name}: \\u0394={result.accuracy - baseline.accuracy:+.1%} (p={p_value:.3f})")
\`\`\`

---

## Tying Evals to Product Metrics

The hardest discipline is making sure eval improvements translate to product improvements. Every quarter, validate the link.

1. Take an eval improvement that shipped (e.g., accuracy went from 82 to 89 percent)
2. Look at the corresponding user metric (task completion, satisfaction, conversion)
3. Confirm the metric moved in the expected direction

If it did not, your eval is measuring something that does not matter to users. Adjust the dataset, the grading criteria, or both.

The teams that maintain this discipline keep their eval programs funded. The teams that do not eventually have their eval programs cut as "engineering overhead."

---

## Common Anti-Patterns

### The Goodhart Trap

When an eval becomes a target, it stops being a measure. Engineers optimize for the eval rather than for user value. Combat this by rotating which evals are KPIs, refreshing datasets aggressively, and validating against user metrics.

### The Hero Eval

One person owns all the evals. When they leave, the program collapses. Distribute ownership: each capability should have at least two engineers who understand its evals.

### The Vanity Dashboard

A dashboard with green numbers that nobody acts on. Evals should produce action: a failed gate blocks a merge, a regression triggers an incident, a drift triggers a review. If nothing happens when scores change, you are doing vanity testing.

### The Eternal Suite

A suite that grows monotonically as engineers add examples but never removes them. Within a year it costs hundreds of dollars per run and provides no more signal than a 200-example version. Prune aggressively.

---

## Recommended Cadences

| Activity | Cadence |
|----------|---------|
| Smoke eval runs | Every commit |
| Standard eval runs | Every PR merge |
| Full eval runs | Nightly |
| Dataset refresh | Monthly |
| Grader calibration | Quarterly |
| Eval-to-product correlation check | Quarterly |
| Suite pruning | Quarterly |
| Tier and threshold review | Annually |

---

## Getting Started with QA Agent Skills

Build production-grade eval pipelines faster with QA skills tailored for LLM testing:

\`\`\`bash
npx @qaskills/cli add openai-evals
npx @qaskills/cli add llm-evaluation
npx @qaskills/cli add ai-agent-testing
\`\`\`

Browse 450+ QA skills at [qaskills.sh/skills](/skills) to systematize your LLM quality program.
`,
};
