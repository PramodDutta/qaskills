---
name: DeepEval LLM Evaluation
description: Test LLM applications with DeepEval, pytest-style unit tests for LLM outputs using G-Eval, answer relevancy, faithfulness, hallucination and custom metrics, with CI quality gates and dataset-driven regression runs.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [deepeval, llm-evals, g-eval, hallucination, answer-relevancy, faithfulness, llm-testing, pytest, ci-gates]
testingTypes: [llm-evals, unit, regression]
frameworks: [deepeval, pytest]
languages: [python]
domains: [ai, llm, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# DeepEval LLM Evaluation Skill

You are an expert AI quality engineer specializing in DeepEval. When the user asks you to test, evaluate, or gate LLM application outputs, follow these instructions.

## Core Principles

1. **Evals are unit tests.** Write them pytest-style, run them in CI, fail builds on regressions. No dashboard-only quality.
2. **Metric per failure mode.** Pick metrics for the failures that matter (hallucination, irrelevance, unfaithfulness to context), not every metric available.
3. **Thresholds are contracts.** Every metric gets an explicit threshold agreed with the team; a metric without a threshold is a vibe.
4. **Datasets over ad-hoc prompts.** Evaluate against a versioned golden dataset, grow it from production failures.
5. **LLM-as-judge needs spot checks.** Periodically hand-verify judge scores; recalibrate criteria when the judge drifts from human judgment.

## Setup

```bash
pip install deepeval
# judge model key (defaults to OpenAI; other providers configurable)
export OPENAI_API_KEY=sk-...
deepeval login   # optional: Confident AI dashboard for run history
```

## Project Structure

```
llm-app/
├── evals/
│   ├── conftest.py            # fixtures: app client, dataset loader
│   ├── datasets/
│   │   └── golden_v3.jsonl    # versioned eval cases
│   ├── test_correctness.py    # G-Eval correctness suite
│   ├── test_rag_quality.py    # faithfulness + relevancy for RAG
│   └── test_safety.py         # hallucination, bias, toxicity
└── .github/workflows/evals.yml
```

## Writing Eval Tests

```python
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    HallucinationMetric,
    GEval,
)
from deepeval.test_case import LLMTestCaseParams

def make_case(query: str) -> LLMTestCase:
    response = my_app.answer(query)          # your application under test
    return LLMTestCase(
        input=query,
        actual_output=response.text,
        retrieval_context=response.chunks,   # required for faithfulness
    )

def test_answer_relevancy():
    case = make_case("What is your refund policy for annual plans?")
    assert_test(case, [AnswerRelevancyMetric(threshold=0.8)])

def test_faithfulness_to_context():
    case = make_case("How long does shipping take to Germany?")
    assert_test(case, [FaithfulnessMetric(threshold=0.9)])

# G-Eval: custom criteria in natural language, scored by a judge model
correctness = GEval(
    name="Correctness",
    criteria="Determine whether the actual output states the same policy facts as the expected output. Penalize invented numbers or dates.",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.7,
)

def test_policy_correctness():
    case = LLMTestCase(
        input="Can I cancel within 30 days?",
        actual_output=my_app.answer("Can I cancel within 30 days?").text,
        expected_output="Yes, full refund within 30 days of purchase.",
    )
    assert_test(case, [correctness])
```

Run: `deepeval test run evals/ -n 8` (parallel) or plain `pytest evals/`.

## Dataset-Driven Regression

```python
from deepeval.dataset import EvaluationDataset

dataset = EvaluationDataset()
dataset.add_test_cases_from_json_file(
    file_path="evals/datasets/golden_v3.jsonl",
    input_key_name="input",
    expected_output_key_name="expected",
)

@pytest.mark.parametrize("case", dataset.test_cases)
def test_golden(case):
    case.actual_output = my_app.answer(case.input).text
    assert_test(case, [AnswerRelevancyMetric(threshold=0.8), correctness])
```

Rules for the golden set: 30 to 200 cases per feature; every production incident adds a case; version the file and reference the version in eval reports; never edit expected outputs to make a failing run pass without review.

## Metric Selection Guide

| Failure mode | Metric | Typical threshold |
|---|---|---|
| Answer ignores the question | AnswerRelevancyMetric | 0.7 to 0.85 |
| Answer contradicts retrieved docs | FaithfulnessMetric | 0.85 to 0.95 |
| Invented facts vs provided context | HallucinationMetric | <= 0.1 (lower is better) |
| Domain-specific correctness | GEval with written criteria | 0.7 start, calibrate |
| Retrieval brought wrong chunks | ContextualRelevancyMetric | 0.7 |
| Tone, format, policy compliance | GEval per rule | per rule |

## CI Quality Gate

```yaml
# .github/workflows/evals.yml
- name: Run LLM evals
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: deepeval test run evals/ --display-mode failing
```

Gate policy: block merge on any metric below threshold for P0 flows; run the full golden set nightly (judge calls cost money, so PR runs can use a 20-case smoke slice); alert on aggregate score drops week over week even when above threshold.

## Common Mistakes

- Testing with one hand-written prompt instead of a dataset; you are testing the demo, not the product
- FaithfulnessMetric without passing retrieval_context; the metric needs the chunks
- Thresholds copied from docs instead of calibrated against 20 human-labeled examples
- Letting judge model version float; pin it, bump deliberately, re-baseline
- Ignoring cost: cache app responses so re-runs only re-judge, and slice suites for PR vs nightly

## Checklist

- [ ] Metrics mapped to real failure modes, each with a threshold
- [ ] Golden dataset versioned, grown from production failures
- [ ] PR smoke slice + nightly full run wired in CI
- [ ] Judge model pinned; monthly human spot-check of 10 judge scores
- [ ] Eval results visible to the team (CI output or dashboard), regressions block release
