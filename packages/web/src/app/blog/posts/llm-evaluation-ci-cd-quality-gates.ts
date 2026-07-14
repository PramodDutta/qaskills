import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Evaluation Quality Gates in CI/CD: A Practical Guide',
  description:
    'Wire LLM evaluation scores into CI/CD as quality gates: threshold pass/fail, averaging across runs for non-determinism, GitHub Actions, and cost control.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# LLM Evaluation Quality Gates in CI/CD: A Practical Guide

You can write the best eval metrics in the world and build a pristine golden dataset, but if the results never block a bad deploy, they are just decoration. The whole point of evaluation is to catch a quality regression before it reaches users, and that only happens when your scores are wired into CI/CD as a hard gate: a check that fails the build when the model gets worse.

This is harder than it sounds, for one reason: LLMs are non-deterministic. A traditional unit test either passes or fails, deterministically, every run. An LLM eval can score 0.84 on one run and 0.79 on the next with no code change at all. If you naively fail the build below 0.80, you will get random red builds that erode trust until the team disables the gate entirely. A working LLM quality gate has to handle that noise gracefully.

This guide covers exactly how: how to wire eval scores into CI, how to set thresholds that pass and fail meaningfully, how to average across multiple runs to tame non-determinism, a complete GitHub Actions example, how to block deploys only on real regressions, and how to keep the whole thing from bankrupting you on judge-model tokens. It builds on two companions worth reading first: the [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) for the data you evaluate against, and the [DeepEval pytest guide](/blog/deepeval-llm-testing-guide) for the framework used in the examples.

## Why LLM quality gates are different

A normal CI gate is binary and stable. LLM gates are neither by default, and pretending otherwise is the number one reason teams abandon eval automation.

Three properties make LLM gates special:

Non-determinism. Even at temperature 0, outputs vary across runs due to model-side effects. Metrics that use an LLM-as-judge add a second layer of variance. A single run's score is a sample, not a fact.

Cost. Every eval run spends tokens, and LLM-as-judge doubles that (you pay for the generation and the judgment). Running a large suite on every commit can cost real money, so gates must be designed with a token budget in mind.

Fuzzy pass/fail. "Correct" is rarely binary. A 0.78 faithfulness score is not obviously a pass or a fail. Thresholds are judgment calls informed by your risk tolerance, not laws of nature.

The design consequences: average multiple runs, set thresholds with margin, scope the suite you run per commit, and compare against a baseline rather than an absolute floor. The rest of this guide is those four ideas in detail.

| Concern | Unit test | LLM eval gate |
|---|---|---|
| Determinism | Fully deterministic | Noisy, sample-based |
| Cost per run | Negligible | Real token cost |
| Pass criterion | Exact | Threshold with margin |
| Failure signal | Single run | Averaged over N runs |
| Comparison | Against truth | Against a baseline |

## Wiring eval scores into CI

The mechanics are straightforward once you accept the framework: run your eval suite in a CI job, and let a below-threshold result exit non-zero so the job fails.

With a pytest-style framework like DeepEval, this is nearly free because the runner already exits non-zero on failure. The eval "test" asserts on a metric threshold, and a failed assertion fails the job:

\`\`\`python
import pytest
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase
from my_app import run_system


def load_cases():
    import json
    return [json.loads(l) for l in open("golden.jsonl")]


@pytest.mark.parametrize("case", load_cases())
def test_quality_gate(case):
    output = run_system(case["input"], context=case.get("context", []))
    tc = LLMTestCase(
        input=case["input"],
        actual_output=output,
        retrieval_context=case.get("context", []),
    )
    assert_test(tc, [
        AnswerRelevancyMetric(threshold=0.7),
        FaithfulnessMetric(threshold=0.8),
    ])
\`\`\`

If any case scores below its threshold, \`deepeval test run\` exits non-zero, and CI marks the job red. That is the entire mechanism. Everything else in this guide is about making that red mean "real regression" and not "random noise."

## Setting thresholds that mean something

A threshold is a promise: "below this, we consider quality unacceptable." Set it wrong and the gate is useless. Two failure modes:

Too strict. Threshold at 0.9 when your system reliably scores 0.85. The gate is red on every build, the team learns to ignore it, and it gets disabled. A gate that always fails protects nothing.

Too loose. Threshold at 0.4 when real quality problems show up at 0.7. The gate is green while the product degrades. A gate that never fails protects nothing either.

The right way to set a threshold is empirical. Run your suite several times on your current, known-good system and observe the distribution. Set the threshold a margin below the observed floor, so normal noise stays green but a genuine drop goes red.

| Metric | Observed range (good system) | Suggested threshold | Margin |
|---|---|---|---|
| Answer relevancy | 0.82 - 0.88 | 0.75 | Comfortable |
| Faithfulness | 0.88 - 0.93 | 0.82 | Comfortable |
| Contextual recall | 0.70 - 0.78 | 0.62 | Wider (noisier) |
| Toxicity (lower better) | 0.00 - 0.03 | < 0.10 | Safety buffer |

Two refinements make thresholds far more robust. First, prefer a baseline comparison over an absolute floor: instead of "must exceed 0.80," use "must not drop more than 0.03 below the last release's score." This adapts as your system improves and catches regressions even when absolute scores are high. Second, gate on aggregate scores per metric across the whole dataset, not on individual case pass rates, so one noisy case cannot flip the build. For how to build the dataset those scores run against, see the [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide).

## Handling non-determinism by averaging runs

This is the technique that makes LLM gates trustworthy. Because a single run's score is a noisy sample, you average several runs and gate on the mean. Three or more runs is the common floor; five is better for high-stakes gates.

The intuition: if the true quality is 0.84 and each run has a standard deviation of 0.04, a single run might read 0.78 (a false alarm) or 0.90 (false confidence). Averaging three runs cuts the noise on the estimate meaningfully, so the mean sits much closer to the true 0.84, and your pass/fail decision stops flip-flopping.

A wrapper that runs the metric N times and gates on the average:

\`\`\`python
from statistics import mean
from deepeval.metrics import FaithfulnessMetric
from deepeval.test_case import LLMTestCase


def averaged_score(metric_factory, test_case, runs=3):
    scores = []
    for _ in range(runs):
        metric = metric_factory()
        metric.measure(test_case)
        scores.append(metric.score)
    return mean(scores)


def test_faithfulness_gate(case, run_system):
    output = run_system(case["input"], context=case["context"])
    tc = LLMTestCase(
        input=case["input"],
        actual_output=output,
        retrieval_context=case["context"],
    )
    avg = averaged_score(lambda: FaithfulnessMetric(threshold=0.8), tc, runs=3)
    assert avg >= 0.8, f"faithfulness {avg:.3f} below 0.8 (avg of 3 runs)"
\`\`\`

There is a cost tradeoff here: three runs triples your token spend. That is fine for a curated gate suite of 50 to 100 cases, but it is exactly why you do not run the full suite on every commit. Balance run-count against suite-size against how often the gate fires, which the cost section covers.

A useful compromise for flaky-but-important gates: run once on every PR for a fast signal, and run the averaged, full gate on merges to main or on a nightly schedule. You get quick feedback without paying the full averaged cost on every push.

## A complete GitHub Actions quality gate

Here is an end-to-end workflow that runs the eval suite on pull requests, uploads the results, and blocks the merge on failure. It uses caching and a scoped suite to keep cost down.

\`\`\`yaml
name: llm-quality-gate
on:
  pull_request:
    paths:
      - 'app/**'
      - 'prompts/**'
      - 'golden.jsonl'

jobs:
  eval-gate:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r requirements-eval.txt

      - name: Run LLM evaluation gate
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          EVAL_RUNS: '3'
        run: deepeval test run tests/gate/ --repeat 1 | tee eval-report.txt

      - name: Upload eval report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: eval-report
          path: eval-report.txt
\`\`\`

To make the gate actually block a merge, mark the \`eval-gate\` job as a required status check in your branch protection settings. Without that, a red job is just a warning and anyone can merge past it. The \`if: always()\` on the upload step ensures you get the report even when the gate fails, which is exactly when you most want to read it.

A note on secrets: the \`OPENAI_API_KEY\` (or whichever provider key your judge model uses) must be a repository or organization secret, never hardcoded. Reference it as \${{ secrets.OPENAI_API_KEY }} so it is injected at runtime and never printed in logs.

## Blocking deploys on regressions, not noise

The subtle art is failing the build for real regressions while staying green through normal variance. Getting this wrong in either direction destroys the gate's value.

The core technique is the baseline comparison. Store the aggregate scores from your last known-good release, and on each run compare the new averaged scores against that baseline with a tolerance:

\`\`\`python
import json
from statistics import mean

TOLERANCE = 0.03  # allowed drop before we call it a regression


def check_regression(current: dict, baseline_path="baseline.json"):
    baseline = json.load(open(baseline_path))
    failures = []
    for metric, score in current.items():
        drop = baseline[metric] - score
        if drop > TOLERANCE:
            failures.append(
                f"{metric}: {score:.3f} vs baseline {baseline[metric]:.3f} "
                f"(drop {drop:.3f} > tolerance {TOLERANCE})"
            )
    if failures:
        raise SystemExit("REGRESSION DETECTED:\\n" + "\\n".join(failures))
    print("All metrics within tolerance of baseline.")
\`\`\`

This design has three virtues. It adapts: as your system improves, the baseline rises and the bar with it. It tolerates noise: a 0.02 dip stays green, only a real slide past tolerance fails. And it is explicit: the failure message names the metric, the current score, the baseline, and the drop, so the developer knows exactly what regressed.

Update the baseline deliberately, only when you have confirmed a real improvement, and commit the change through review (just like the golden dataset itself). Never let CI auto-update the baseline, or a slow drift downward will silently ratchet your quality down one tolerable step at a time. For agent systems where regressions hide in multi-step behavior, the [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide) covers gate design for tool-calling flows.

## Controlling cost

LLM evaluation gates cost money on every run, and if you are not deliberate the bill grows quietly until someone notices. The main lever is simple: judge every token you must, and no more.

Concrete cost-control tactics, roughly in order of impact:

| Tactic | How it saves | Tradeoff |
|---|---|---|
| Scope the PR suite | Run 40-80 cases on PRs, full suite nightly | Some regressions caught later |
| Cheaper judge model | Use a small model for simple metrics | Slightly noisier scores |
| Cache by content hash | Skip re-judging unchanged output | Cache invalidation care |
| Fewer runs on PRs | 1 run per PR, 3-run average on main | Noisier PR signal |
| Path filters | Only run when app or prompts change | None, pure win |
| Fail fast | Stop the suite on first hard failure | Less complete report |

The single biggest win is scoping. You do not need to run 500 cases with 3-run averaging on every push. Run a fast, representative gate suite on PRs, and reserve the heavy averaged full suite for merges to main and a nightly schedule. This can cut per-commit eval cost by an order of magnitude while still catching regressions before release.

Caching is the second big win. If a PR does not change the code path that produces a given output, you can reuse the prior judgment keyed on a hash of (input, output, metric). Many teams see a large share of cases cache-hit on incremental PRs.

Finally, choose your judge model per metric. A simple deterministic check (JSON validity, exact fact match) needs no LLM at all. A nuanced criterion may warrant a strong judge. Matching judge cost to metric difficulty keeps the bill proportional to the value. For a broader look at where these costs land across tools, the [LLM evals comparison](/blog/llm-evals-comparison-openai-promptfoo-ragas) and the [OpenAI Evals guide](/blog/openai-evals-complete-guide-2026) are useful references.

## Reporting gate results well

A gate that fails with a cryptic message trains people to ignore it. Invest in the report. A good failure output names the metric that regressed, the current and baseline scores, and ideally the specific cases that dragged the average down, with the judge's stated reason.

Post the summary where developers already look: as a PR comment, a CI annotation, or a status check description. The goal is that a developer seeing a red gate can understand what regressed and why within seconds, without digging through raw logs. Pair this with the uploaded full report (from the \`if: always()\` artifact step) for deep dives. When the gate is both trustworthy and legible, teams keep it on, which is the only way it ever protects anyone.

It also helps to trend gate results over time, not just report them per build. Store each run's aggregate scores in a small artifact or a lightweight database, and chart them per metric across releases. A single build tells you whether today's change regressed. A trend line tells you whether quality is slowly drifting down over many "within tolerance" changes that never individually tripped the gate. That slow drift is exactly the failure mode a per-build gate cannot see, and it is where a surprising number of real quality problems actually come from: not one bad deploy, but fifty small tolerable ones. Watching the trend is how you catch the ratchet before your users do.

Finally, socialize the gate. When a regression is caught before release, say so in the PR thread, so the team sees the gate earning its keep. A quality gate that quietly blocks bad deploys but never gets credit for it slowly loses political support, and the first time it produces an inconvenient red build, someone will argue to weaken it. Making its saves visible is what keeps the gate strict enough to matter.

## Frequently Asked Questions

### How do I handle LLM non-determinism in CI gates?

Average the metric across multiple runs (three or more) and gate on the mean rather than on a single run. A single run is a noisy sample that can produce false alarms or false confidence. Averaging tightens the estimate around the true score so your pass/fail decision stops flip-flopping. For high-stakes gates use five runs; for fast PR feedback, one run is acceptable if the full averaged gate runs on merges to main.

### What threshold should I set for an LLM eval gate?

Set thresholds empirically, not by guessing. Run your suite several times on your current known-good system, observe the score distribution, and set the threshold a comfortable margin below the observed floor so normal noise stays green. Even better, gate on a baseline comparison ("must not drop more than 0.03 below last release") rather than an absolute floor, so the bar rises as your system improves and catches regressions at any score level.

### How do I block a deploy when eval scores regress?

Run the eval suite in a CI job that exits non-zero on failure, then mark that job as a required status check in branch protection so a red result blocks the merge. Compare averaged scores against a stored baseline with a tolerance, and fail only when a metric drops past that tolerance. This blocks real regressions while staying green through normal variance, which keeps the team trusting the gate.

### How much do LLM evaluation gates cost to run?

Cost scales with cases times runs times judge-model tokens, and LLM-as-judge roughly doubles spend because you pay for generation and judgment. Control it by scoping a small representative suite for PRs and reserving the full averaged suite for main-branch merges and nightly jobs, caching judgments by content hash, using cheaper judge models for simple metrics, and applying path filters so evals only run when relevant files change.

### Should the eval gate run on every commit?

Not the full averaged suite. Run a fast, scoped gate (40 to 80 representative cases, single run) on pull requests for quick feedback, and run the heavier full suite with multi-run averaging on merges to main and on a nightly schedule. This tiered approach keeps per-commit cost and latency low while still catching regressions before they reach a release, which is the only place the gate truly needs to hold.

### Can I use GitHub Actions for LLM evaluation gates?

Yes, and it is the common setup. A GitHub Actions workflow checks out the repo, installs your eval framework, runs the suite with your provider key injected as a secret, and lets a non-zero exit fail the job. Add path filters so it only runs on app or prompt changes, upload the report with if: always(), and mark the job as a required status check so a failure blocks the merge.

### What is the difference between an absolute threshold and a baseline comparison?

An absolute threshold fails the build below a fixed number (for example 0.80). A baseline comparison fails when the score drops more than a tolerance below your last known-good release. The baseline approach is superior because it adapts as your system improves and catches regressions even when absolute scores are high, whereas a fixed floor can stay green while a strong system quietly degrades toward it.

### How do I keep the eval gate from being ignored?

Make it both trustworthy and legible. Trustworthy means it fails only on real regressions (average runs, use baselines with tolerance) so people stop seeing random red builds. Legible means failure messages name the regressed metric, the current and baseline scores, and the specific cases that dragged the average down, posted where developers already look. A gate that fires meaningfully and explains itself clearly is one teams keep enabled.

## Conclusion

An LLM evaluation quality gate is what turns evaluation from a research curiosity into an engineering safeguard. The mechanics are simple (fail the CI job when scores drop), but doing it well means respecting the two things that make LLM gates unlike normal tests: non-determinism and cost. Average across three or more runs so noise does not flip your build, set thresholds empirically with margin or better yet compare against a baseline, scope your PR suite and cache judgments to keep the bill bounded, and mark the job as a required check so a red gate actually blocks the merge.

Do that, and every deploy carries a promise: quality did not regress on the cases you care about. Start by wiring a single averaged metric into one required CI check this week, then grow it into a baseline-compared suite. Explore the full catalog of evaluation and QA skills at [/skills](/skills), and read the [golden dataset guide](/blog/golden-dataset-llm-evaluation-guide) next so your gate has a dataset worth defending.
`,
};
