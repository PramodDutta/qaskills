---
name: RAG Regression Testing
description: Gate RAG pipelines in CI with versioned golden eval sets, per-metric thresholds, baseline drift detection, and a build that fails when retrieval or answer quality regresses.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [rag, regression-testing, llm-evals, ci, golden-dataset, drift-detection, ragas, deepeval, baseline]
testingTypes: [regression, llm-evals, integration]
frameworks: [ragas, deepeval, pytest]
languages: [python]
domains: [ai, llm, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# RAG Regression Testing Skill

You are an expert in shipping RAG systems without quality regressions. When the user asks you to add CI gates, detect drift, or stop a build from merging when answer quality drops, you build a versioned golden eval set, compare every run against a committed baseline, and fail the build on absolute-threshold breaches or relative drops. You treat prompts and retriever configs as versioned artifacts, because a prompt change is a behavior change.

## Core Principles

1. **A RAG pipeline regresses silently.** Code tests stay green while answer quality rots from a model update, a prompt tweak, a chunking change, or an index rebuild. Only an eval gate catches this.
2. **The golden set is the regression contract.** Every metric is scored against a fixed, committed dataset. Changing the dataset is a deliberate, reviewed event - never an accident.
3. **Gate on two conditions: absolute floor and relative drop.** Fail if any metric falls below its hard floor, *and* fail if it drops more than N points versus the committed baseline - even while still "passing."
4. **Baselines are committed artifacts.** Store `baseline_metrics.json` in the repo. A score is only meaningful as a delta against a known-good baseline.
5. **Version the prompt and retriever, not just the code.** Tag each eval run with prompt and retriever versions so a regression can be traced to the exact change that caused it.
6. **Pin everything that scores.** Judge model, judge temperature, embedding model, and `top_k`. An unpinned judge makes "regression" indistinguishable from judge noise.
7. **Fail fast and loud in CI; allow an explicit baseline-update path.** The only way to move the baseline is a reviewed PR that regenerates and commits it.
8. **Quarantine, do not delete, flaky golden samples.** Mark them, investigate, fix the data or the pipeline - never silently drop a hard question to make the gate pass.

## Repository Layout

```
rag-evals/
  golden/
    dataset.v3.json            # versioned golden set; bump filename on change
  baseline/
    baseline_metrics.json      # committed known-good scores
  config/
    eval_config.py             # pinned models, thresholds, drift budget
  run_eval.py                  # produces scores, writes report.json
  gate.py                      # compares scores vs baseline + floors -> exit code
  update_baseline.py           # regenerates baseline (run intentionally)
.github/
  workflows/
    rag-regression.yml
```

## Pinned Evaluation Config

```python
# config/eval_config.py
from dataclasses import dataclass


@dataclass(frozen=True)
class EvalConfig:
    # Everything that influences a score is pinned.
    judge_model: str = "gpt-4o-mini"
    judge_temperature: float = 0.0
    embedding_model: str = "text-embedding-3-small"
    top_k: int = 5

    # Identifies the system under test for traceability.
    prompt_version: str = "answer-v4"
    retriever_version: str = "hybrid-bm25+dense-v2"

    dataset_path: str = "rag-evals/golden/dataset.v3.json"
    baseline_path: str = "rag-evals/baseline/baseline_metrics.json"


# Absolute floors: build fails if a metric drops below these, ever.
HARD_FLOORS = {
    "faithfulness": 0.88,
    "context_precision": 0.78,
    "context_recall": 0.78,
    "answer_relevancy": 0.72,
}

# Drift budget: build fails if a metric drops more than this vs baseline,
# even if still above the hard floor. Catches slow erosion.
MAX_REGRESSION = {
    "faithfulness": 0.03,
    "context_precision": 0.05,
    "context_recall": 0.05,
    "answer_relevancy": 0.05,
}

CONFIG = EvalConfig()
```

## Running the Eval and Producing a Report

```python
# run_eval.py
import json
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    context_precision, context_recall, faithfulness, answer_relevancy,
)
from ragas.llms import LangchainLLMWrapper
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from config.eval_config import CONFIG
from my_rag_app import rag_pipeline


def load_golden(path: str) -> list[dict]:
    with open(path) as f:
        return json.load(f)["samples"]


def main() -> None:
    golden = load_golden(CONFIG.dataset_path)
    rows = {"question": [], "answer": [], "contexts": [], "ground_truth": []}
    for s in golden:
        out = rag_pipeline(s["question"], top_k=CONFIG.top_k)
        rows["question"].append(s["question"])
        rows["answer"].append(out["answer"])
        rows["contexts"].append(out["contexts"])
        rows["ground_truth"].append(s["ground_truth"])

    judge = LangchainLLMWrapper(
        ChatOpenAI(model=CONFIG.judge_model, temperature=CONFIG.judge_temperature)
    )
    result = evaluate(
        Dataset.from_dict(rows),
        metrics=[context_precision, context_recall, faithfulness, answer_relevancy],
        llm=judge,
        embeddings=OpenAIEmbeddings(model=CONFIG.embedding_model),
    )

    df = result.to_pandas()
    means = {
        m: round(float(df[m].mean()), 4)
        for m in ["context_precision", "context_recall", "faithfulness", "answer_relevancy"]
    }
    report = {
        "metrics": means,
        "n_samples": len(golden),
        "below_floor_counts": {
            m: int((df[m] < 0.5).sum())  # count of egregious per-sample failures
            for m in means
        },
        "prompt_version": CONFIG.prompt_version,
        "retriever_version": CONFIG.retriever_version,
        "judge_model": CONFIG.judge_model,
    }
    with open("report.json", "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
```

## The Gate: Floors + Drift Detection

```python
# gate.py
import json
import sys

from config.eval_config import CONFIG, HARD_FLOORS, MAX_REGRESSION


def load(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def main() -> int:
    report = load("report.json")
    current = report["metrics"]
    baseline = load(CONFIG.baseline_path)["metrics"]

    failures: list[str] = []

    for metric, score in current.items():
        floor = HARD_FLOORS.get(metric)
        if floor is not None and score < floor:
            failures.append(f"[FLOOR]  {metric}={score:.3f} < hard floor {floor:.2f}")

        base = baseline.get(metric)
        budget = MAX_REGRESSION.get(metric)
        if base is not None and budget is not None:
            drop = base - score
            if drop > budget:
                failures.append(
                    f"[DRIFT]  {metric} dropped {drop:.3f} "
                    f"(baseline {base:.3f} -> {score:.3f}, budget {budget:.2f})"
                )

    if failures:
        print("RAG REGRESSION DETECTED:\n  " + "\n  ".join(failures))
        print(f"\nprompt={report['prompt_version']} retriever={report['retriever_version']}")
        return 1

    print("RAG eval passed. No regression vs baseline.")
    for m, s in current.items():
        print(f"  {m}: {s:.3f} (baseline {baseline.get(m, float('nan')):.3f})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

## Updating the Baseline (Intentional Only)

```python
# update_baseline.py
"""Run ONLY when a quality change is intended and reviewed.
The resulting baseline_metrics.json must be committed in the same PR."""
import json
import shutil

from config.eval_config import CONFIG

# run_eval.py must have been run first to produce report.json
with open("report.json") as f:
    report = json.load(f)

shutil.copy(CONFIG.baseline_path, CONFIG.baseline_path + ".bak")
with open(CONFIG.baseline_path, "w") as f:
    json.dump({"metrics": report["metrics"],
               "prompt_version": report["prompt_version"],
               "retriever_version": report["retriever_version"]}, f, indent=2)
print("Baseline updated. Commit this file with a justification in the PR.")
```

## CI Workflow (GitHub Actions)

```yaml
# .github/workflows/rag-regression.yml
name: RAG Regression Gate

on:
  pull_request:
    paths:
      - "rag-evals/**"
      - "src/prompts/**"
      - "src/retriever/**"
      - "src/rag/**"
  workflow_dispatch:

concurrency:
  group: rag-eval-${{ github.ref }}
  cancel-in-progress: true

jobs:
  rag-eval-gate:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install deps
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt   # ragas, datasets, langchain-openai, etc.

      - name: Run RAG evaluation
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: python rag-evals/run_eval.py

      - name: Gate on thresholds + drift
        run: python rag-evals/gate.py   # non-zero exit fails the job

      - name: Upload eval report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: rag-eval-report
          path: report.json

      - name: Comment metrics on PR
        if: always() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const r = JSON.parse(fs.readFileSync('report.json', 'utf8'));
            const rows = Object.entries(r.metrics)
              .map(([k, v]) => `| ${k} | ${v.toFixed(3)} |`).join('\n');
            const body = `### RAG Eval (\`${r.prompt_version}\` / \`${r.retriever_version}\`)\n`
              + `| metric | score |\n|---|---|\n${rows}`;
            await github.rest.issues.createComment({
              owner: context.repo.owner, repo: context.repo.repo,
              issue_number: context.issue.number, body,
            });
```

The gate runs on PRs that touch prompts, retriever, or the eval set. A merge is blocked until the gate passes - so the only way to ship a quality change is to also commit the new baseline.

## Detecting Drift Over Time

For nightly scheduled runs against production traffic samples, append each run's metrics to a time series and alert on a moving-window drop:

```python
# drift_alert.py
import statistics


def detect_trend_drift(history: list[dict], metric: str, window: int = 7) -> str | None:
    """history: list of {date, metrics:{...}} newest last."""
    series = [h["metrics"][metric] for h in history if metric in h["metrics"]]
    if len(series) < window + 1:
        return None
    recent = statistics.mean(series[-3:])
    baseline_window = statistics.mean(series[-(window + 1):-3])
    drop = baseline_window - recent
    if drop > 0.04:
        return (f"{metric} trending down: {baseline_window:.3f} -> {recent:.3f} "
                f"over {window} days (drop {drop:.3f})")
    return None
```

## Best Practices

1. **Commit the baseline; never compute it at runtime.** A regression is a delta from a known-good, reviewed file - not from yesterday's accidental score.
2. **Gate on both a hard floor and a drift budget.** Floors catch cliffs; drift budgets catch slow erosion that stays "green."
3. **Version the golden dataset in the filename (`dataset.v3.json`).** Bumping the version is a reviewable, deliberate act.
4. **Tag every report with prompt and retriever versions.** When the gate fails, you know exactly which artifact regressed.
5. **Make baseline updates a separate, justified PR step.** Require a written reason in the PR description for any baseline move.
6. **Scope the gate to RAG-relevant paths, and publish the report.** Use `paths:` to keep paid LLM-judge calls off unrelated PRs; upload `report.json` as an artifact and comment scores on the PR.
7. **Run a nightly scheduled eval against fresh data for trend drift.** PR gates catch deliberate changes; scheduled runs catch upstream model drift.

## Anti-Patterns to Avoid

1. **No committed baseline.** Comparing against "last run" lets a slow daily 0.5% decline accumulate into a disaster, each step individually passing.
2. **Floor-only gating.** A metric sliding from 0.95 to 0.89 (still above a 0.88 floor) is a real regression a drift budget would catch.
3. **Editing the golden set in the same PR as a pipeline change.** You can no longer tell whether the score moved because the system changed or the test changed.
4. **Unpinned judge or embedding model in CI.** Judge noise gets misread as regression, and the gate becomes flaky and ignored.
5. **Deleting hard golden questions to make the build green.** That is removing the smoke detector because it keeps going off.
6. **Silencing the gate (`continue-on-error: true`) to unblock a deadline.** A non-blocking quality gate is theater.

## When to Trigger This Skill

Trigger when the user asks to:
- Add a CI gate or build check for RAG / LLM answer quality
- Detect quality drift or regression in a RAG pipeline over time
- Set up a golden eval set with baselines and thresholds for CI
- Fail a build when faithfulness, retrieval, or relevancy drops
- Version prompts and retrievers for regression traceability
- Wire Ragas/DeepEval into GitHub Actions or another CI system

For the *definitions and scoring* of the underlying metrics (faithfulness, context precision/recall, answer relevancy), use the RAG Evaluation Metrics skill. This skill assumes those metrics exist and focuses on gating and drift over time.
