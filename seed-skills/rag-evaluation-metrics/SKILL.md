---
name: RAG Evaluation Metrics
description: Measure RAG pipeline quality with context precision/recall, faithfulness, answer relevancy, and groundedness using Ragas and DeepEval, with golden datasets and pass/fail thresholds.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [rag, llm-evals, ragas, deepeval, faithfulness, context-precision, answer-relevancy, groundedness, retrieval]
testingTypes: [llm-evals, integration, regression]
frameworks: [ragas, deepeval, pytest]
languages: [python]
domains: [ai, llm, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# RAG Evaluation Metrics Skill

You are an expert in evaluating retrieval-augmented generation systems. When the user asks you to measure, test, or improve RAG quality, you compute the right metric for the right failure mode, score against a golden dataset, and enforce explicit thresholds. You never report a single "accuracy" number for a RAG system - retrieval and generation fail independently and must be measured independently.

## Core Principles

1. **Retrieval and generation are separate subsystems.** A correct answer from bad context is luck; a wrong answer from perfect context is a generation bug. Always measure both halves.
2. **Four metrics cover the RAG failure surface.** Context Precision and Context Recall grade retrieval. Faithfulness and Answer Relevancy grade generation. Together they localize *where* a pipeline breaks.
3. **Faithfulness is not relevancy.** A faithful answer makes no claims unsupported by the context. A relevant answer addresses the question. An answer can be faithful but off-topic, or on-topic but hallucinated.
4. **Groundedness == faithfulness for hallucination detection.** When the goal is "no made-up facts," measure faithfulness/groundedness; it is the single most important production guardrail.
5. **Every metric needs a threshold and a golden set.** A metric with no pass/fail line is a vanity number. Fix thresholds per metric and evaluate against curated question/ground-truth pairs.
6. **LLM-as-judge is the scoring engine - pin its model.** Ragas and DeepEval use an LLM to score. Pin the judge model and temperature so scores are reproducible across runs.
7. **Context Recall requires ground-truth contexts; Context Precision does not.** Choose metrics based on whether your golden set has reference answers, reference contexts, or both.
8. **Score distributions, not single questions.** Report the mean and the count below threshold across the dataset. One bad question is noise; 20% below threshold is a regression.

## The Four Core Metrics

| Metric | Grades | Question it answers | Needs ground truth? |
|---|---|---|---|
| Context Precision | Retrieval | Are the retrieved chunks that are relevant ranked at the top? | Reference answer or contexts |
| Context Recall | Retrieval | Did retrieval fetch all the chunks needed to answer? | Reference answer (ground truth) |
| Faithfulness / Groundedness | Generation | Is every claim in the answer supported by the retrieved context? | No (uses answer + context) |
| Answer Relevancy | Generation | Does the answer actually address the question? | No (uses question + answer) |

## Golden Dataset Structure

A golden set is the contract. Store it as versioned JSON so diffs are reviewable.

```python
# golden_dataset.py
from dataclasses import dataclass, field


@dataclass
class GoldenSample:
    question: str
    ground_truth: str                      # the ideal reference answer
    reference_contexts: list[str] = field(default_factory=list)


GOLDEN_SET: list[GoldenSample] = [
    GoldenSample(
        question="What is the refund window for digital products?",
        ground_truth="Digital products can be refunded within 14 days of purchase if unused.",
        reference_contexts=[
            "Refund policy: Digital goods are eligible for a refund within 14 days "
            "of purchase, provided the license key has not been activated."
        ],
    ),
    GoldenSample(
        question="Does the Pro plan include priority support?",
        ground_truth="Yes, the Pro plan includes 24/7 priority email and chat support.",
        reference_contexts=[
            "Pro plan benefits: unlimited projects, advanced analytics, and 24/7 "
            "priority support over email and chat."
        ],
    ),
]
```

## Evaluating with Ragas

Ragas computes all four metrics from a dataset of `question`, `answer`, `contexts`, and `ground_truth`. You produce `answer` and `contexts` by running your actual RAG pipeline.

```python
# eval_ragas.py
import os
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    context_precision,
    context_recall,
    faithfulness,
    answer_relevancy,
)
from ragas.llms import LangchainLLMWrapper
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from golden_dataset import GOLDEN_SET
from my_rag_app import rag_pipeline  # your system under test


def build_eval_dataset() -> Dataset:
    rows = {"question": [], "answer": [], "contexts": [], "ground_truth": []}
    for sample in GOLDEN_SET:
        result = rag_pipeline(sample.question)  # returns {"answer", "contexts"}
        rows["question"].append(sample.question)
        rows["answer"].append(result["answer"])
        rows["contexts"].append(result["contexts"])  # list[str], retrieved chunks
        rows["ground_truth"].append(sample.ground_truth)
    return Dataset.from_dict(rows)


def run() -> None:
    # Pin the judge model + temperature=0 for reproducible scores.
    judge = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o-mini", temperature=0))
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    dataset = build_eval_dataset()
    result = evaluate(
        dataset,
        metrics=[context_precision, context_recall, faithfulness, answer_relevancy],
        llm=judge,
        embeddings=embeddings,
    )

    df = result.to_pandas()
    print(df[["question", "context_precision", "context_recall",
              "faithfulness", "answer_relevancy"]])
    print("\nMeans:\n", df[["context_precision", "context_recall",
                            "faithfulness", "answer_relevancy"]].mean())


if __name__ == "__main__":
    assert os.environ.get("OPENAI_API_KEY"), "set OPENAI_API_KEY"
    run()
```

## Evaluating with DeepEval

DeepEval frames each metric as an assertable test case, which slots cleanly into pytest. It is the better choice when you want metric failures to fail a CI build.

```python
# test_rag_deepeval.py
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    FaithfulnessMetric,
    AnswerRelevancyMetric,
)

from golden_dataset import GOLDEN_SET
from my_rag_app import rag_pipeline

JUDGE = "gpt-4o-mini"


def _build_case(sample) -> LLMTestCase:
    result = rag_pipeline(sample.question)
    return LLMTestCase(
        input=sample.question,
        actual_output=result["answer"],
        expected_output=sample.ground_truth,
        retrieval_context=result["contexts"],
    )


@pytest.mark.parametrize("sample", GOLDEN_SET, ids=lambda s: s.question[:40])
def test_rag_quality(sample):
    case = _build_case(sample)
    metrics = [
        ContextualPrecisionMetric(threshold=0.8, model=JUDGE),
        ContextualRecallMetric(threshold=0.8, model=JUDGE),
        FaithfulnessMetric(threshold=0.9, model=JUDGE),      # strictest: no hallucinations
        AnswerRelevancyMetric(threshold=0.75, model=JUDGE),
    ]
    # Fails the test (and the build) if any metric is below its threshold.
    assert_test(case, metrics)
```

Run it like any pytest suite: `deepeval test run test_rag_deepeval.py` or plain `pytest test_rag_deepeval.py`.

## Recommended Thresholds

Start here and tighten as the pipeline matures. Faithfulness is always the highest bar because hallucination is the most damaging failure.

```python
THRESHOLDS = {
    "faithfulness": 0.90,        # strictest - production hallucination guard
    "context_precision": 0.80,   # good retrievers rank relevant chunks first
    "context_recall": 0.80,      # missing context is a retrieval/chunking bug
    "answer_relevancy": 0.75,    # answers should stay on-topic
}


def assert_thresholds(means: dict[str, float]) -> None:
    failures = [
        f"{m}: {means[m]:.3f} < {t:.2f}"
        for m, t in THRESHOLDS.items()
        if means.get(m, 0.0) < t
    ]
    if failures:
        raise AssertionError("RAG metrics below threshold:\n  " + "\n  ".join(failures))
```

## Diagnosing With the Metric Matrix

Use the pair of scores to localize the defect instead of guessing:

```python
def diagnose(scores: dict[str, float]) -> str:
    retrieval_ok = (scores["context_precision"] >= 0.8
                    and scores["context_recall"] >= 0.8)
    generation_ok = (scores["faithfulness"] >= 0.9
                     and scores["answer_relevancy"] >= 0.75)

    if retrieval_ok and generation_ok:
        return "Healthy."
    if not retrieval_ok and generation_ok:
        return ("Retrieval problem: fix chunking, embeddings, top_k, or reranking. "
                "Generation is faithful to whatever it is given.")
    if retrieval_ok and not generation_ok:
        return ("Generation problem: context is good but the model hallucinates or "
                "drifts. Tighten the prompt, lower temperature, add 'answer only "
                "from context' instructions.")
    return "Both layers failing - debug retrieval first; generation cannot recover from bad context."
```

Always debug retrieval before generation: a generator cannot produce a faithful answer from context that lacks the fact.

## Best Practices

1. **Pin the judge model and set temperature to 0.** LLM-as-judge scores drift run to run otherwise. Record the judge model in the eval report.
2. **Hold faithfulness to the highest threshold (>= 0.9).** It is the direct measure of hallucination and the metric users feel most.
3. **Curate the golden set by hand, then grow it from production failures.** Every real-world bad answer becomes a new golden sample (with the correct `ground_truth`).
4. **Report distribution, not just the mean.** Track "count below threshold" - a 0.85 mean can hide ten 0.4 outliers.
5. **Separate the retrieval eval from the generation eval in your report.** Two tables, not one blended score, so the diagnosis is immediate.
6. **Version the golden dataset alongside the prompt and retriever config.** A score is only meaningful relative to a fixed dataset version.
7. **Use DeepEval when you want CI gating; use Ragas for exploratory metric sweeps.** They share the same conceptual metrics.
8. **Sanity-check the judge on a few samples manually.** If a human disagrees with the LLM judge on faithfulness, your threshold is meaningless.

## Anti-Patterns to Avoid

1. **Reporting one "accuracy" number for the whole pipeline.** It hides whether retrieval or generation failed and is impossible to act on.
2. **Evaluating generation without checking faithfulness.** A fluent, relevant, completely fabricated answer scores well on relevancy alone.
3. **Using the same model as both generator and judge with temperature > 0.** Scores become non-reproducible and self-flattering.
4. **Measuring Context Recall without ground-truth contexts or reference answers.** The metric is undefined; you will get garbage scores.
5. **Tiny golden sets (under ~20 samples).** Means are noisy and a single bad question swings the verdict.
6. **Treating a 0.8 mean as "passing" while ignoring the tail.** The worst 10% of answers are what generate support tickets.
7. **Changing chunking, embeddings, and the prompt at once, then re-scoring.** You cannot attribute the score delta to any single change.

## When to Trigger This Skill

Trigger when the user asks to:
- Evaluate or "score" a RAG / retrieval-augmented pipeline
- Measure faithfulness, groundedness, hallucination rate, context precision/recall, or answer relevancy
- Set up Ragas or DeepEval for a RAG system
- Build a golden/eval dataset for retrieval QA
- Decide pass/fail thresholds for LLM answer quality
- Diagnose whether a RAG failure is in retrieval or generation

For *regression gating in CI over time* (detecting drift across builds), pair this with the RAG Regression Testing skill. For non-RAG agent evaluation, use the AI Agent Evaluation skill instead.
