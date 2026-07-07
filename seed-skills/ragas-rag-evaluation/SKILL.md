---
name: Ragas RAG Evaluation
description: Evaluate RAG pipelines with Ragas, measuring faithfulness, answer relevancy, context precision and recall, building golden datasets, and wiring threshold gates into CI for retrieval regressions.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [ragas, rag, llm-evals, faithfulness, context-precision, context-recall, retrieval, python, ci-gates]
testingTypes: [llm-evals, integration, regression]
frameworks: [ragas, pytest]
languages: [python]
domains: [ai, llm, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Ragas RAG Evaluation Skill

You are an expert AI quality engineer specializing in Ragas. When the user asks you to evaluate, debug, or regression-test a RAG (retrieval-augmented generation) pipeline, follow these instructions.

## Core Principles

1. **Separate retrieval failures from generation failures.** Ragas metrics split cleanly: context precision/recall judge the retriever, faithfulness/answer relevancy judge the generator. Diagnose before tuning.
2. **A RAG eval needs four fields.** question, answer, contexts, ground_truth. Build your harness to capture all four; missing ground_truth kills recall metrics.
3. **Golden datasets are the asset.** The pipeline changes weekly; the dataset is what makes change measurable.
4. **Thresholds gate, trends inform.** Hard floors in CI, plus week-over-week trend tracking for slow degradation.
5. **Judge cost is a design constraint.** Sample for PR checks, full-set nightly.

## Setup

```bash
pip install ragas datasets
export OPENAI_API_KEY=sk-...   # judge + embeddings (other providers configurable)
```

## The Core Metrics

| Metric | Judges | Question it answers |
|---|---|---|
| faithfulness | Generator | Is every claim in the answer supported by the retrieved contexts? |
| answer_relevancy | Generator | Does the answer actually address the question? |
| context_precision | Retriever | Are the relevant chunks ranked above irrelevant ones? |
| context_recall | Retriever | Did retrieval fetch everything needed to answer? |
| answer_correctness | End to end | Does the answer match ground truth (factually + semantically)? |

Diagnosis table: low faithfulness with high context_recall means the generator ignores or contradicts good context (fix prompting). Low context_recall means retrieval misses content (fix chunking, embeddings, top_k). Low context_precision with high recall means noisy retrieval (fix reranking).

## Evaluating a Pipeline

```python
from ragas import evaluate, EvaluationDataset
from ragas.metrics import (
    Faithfulness, AnswerRelevancy, LLMContextPrecisionWithReference, LLMContextRecall,
)

# 1. Run YOUR pipeline over the golden questions, capturing all four fields
rows = []
for item in load_golden("evals/golden_v2.jsonl"):
    result = rag_pipeline.query(item["question"])
    rows.append({
        "user_input": item["question"],
        "response": result.answer,
        "retrieved_contexts": [c.text for c in result.chunks],
        "reference": item["ground_truth"],
    })

dataset = EvaluationDataset.from_list(rows)

# 2. Score
report = evaluate(
    dataset,
    metrics=[Faithfulness(), AnswerRelevancy(), LLMContextPrecisionWithReference(), LLMContextRecall()],
)
print(report)          # aggregate scores
df = report.to_pandas()  # per-row scores for failure triage
df[df["faithfulness"] < 0.7].to_json("faithfulness_failures.json", orient="records")
```

## CI Gate

```python
# evals/test_rag_gate.py (pytest wrapper around ragas)
import pytest

THRESHOLDS = {
    "faithfulness": 0.85,
    "answer_relevancy": 0.80,
    "llm_context_precision_with_reference": 0.75,
    "context_recall": 0.80,
}

def test_rag_quality_gate(ragas_report):     # fixture runs evaluate() once
    scores = ragas_report._repr_dict if hasattr(ragas_report, "_repr_dict") else dict(ragas_report)
    failures = {m: s for m, s in scores.items() if m in THRESHOLDS and s < THRESHOLDS[m]}
    assert not failures, f"RAG gate failed: {failures}"
```

Gate policy: PR runs use a 25-question stratified sample (mix of easy, hard, adversarial, out-of-scope questions); nightly runs the full set and writes scores to a tracked JSON so trends are diffable in git.

## Building the Golden Dataset

1. Start with 50 to 100 real user questions (support tickets, search logs), never only synthetic ones.
2. Write ground_truth answers from the source documents, reviewed by a domain owner.
3. Include hard negatives: questions the corpus CANNOT answer; correct behavior is refusal, and faithfulness catches invented answers.
4. Add every production complaint as a case within a week of the incident.
5. Version the file (golden_v2.jsonl); note corpus snapshot version alongside, since recall depends on what is indexed.

Ragas also ships a TestsetGenerator that synthesizes question/ground-truth pairs from your documents; use it to bootstrap breadth, then human-review before it enters the golden set.

## Regression Workflow for Pipeline Changes

For any change (chunk size, embedding model, top_k, reranker, prompt, generator model):

1. Run the full golden set on main and on the branch
2. Compare per-metric aggregates AND per-row deltas; a flat average can hide 10 fixed + 10 newly broken rows
3. Require: no gated metric drops below floor, and newly-failing rows are reviewed by name
4. Record the run (scores + config hash) so any future regression bisects to a change

## Common Mistakes

- Evaluating with contexts stuffed manually instead of what the retriever actually returned; you must capture the pipeline's own chunks
- No ground_truth, so recall silently unmeasurable; teams then over-tune precision and starve recall
- One aggregate score for the whole corpus; segment by document type or product area, regressions hide in slices
- Synthetic-only datasets that miss how real users phrase things
- Re-judging unchanged answers on every run; cache by (question, answer, contexts) hash to cut cost sharply

## Checklist

- [ ] Harness captures question, answer, retrieved contexts, ground_truth per query
- [ ] Four core metrics wired; thresholds agreed and enforced in CI
- [ ] Golden set versioned, includes hard negatives, grows from production
- [ ] PR sample + nightly full run; scores persisted for trend diffs
- [ ] Retrieval vs generation failures triaged separately before any tuning
