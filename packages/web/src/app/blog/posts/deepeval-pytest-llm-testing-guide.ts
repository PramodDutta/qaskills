import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval Pytest LLM Testing Complete Guide 2026',
  description:
    'Master DeepEval for pytest-native LLM testing in 2026. Test cases, metrics, hallucination detection, RAG metrics, regression testing, and CI integration with detailed Python samples.',
  date: '2026-05-15',
  category: 'AI Testing',
  content: `
# DeepEval Pytest LLM Testing Complete Guide 2026

DeepEval is the pytest-native LLM evaluation framework. Where most evaluation tools build their own runners and dashboards, DeepEval embraces pytest, making LLM evals look and feel like Python unit tests. By 2026 it has become the framework of choice for teams that want LLM testing to fit alongside their existing pytest suite, including discovery, fixtures, markers, parameterization, and the entire pytest ecosystem of plugins.

This guide covers DeepEval end to end: installation, test case authoring, metrics, hallucination detection, RAG metrics, regression testing, CI integration, and the Confident AI cloud product. We include Python samples for every common pattern and a setup checklist for new teams. By the end you should know whether DeepEval fits your team and how to start writing LLM tests in minutes. The guide assumes basic pytest familiarity.

## Key Takeaways

- DeepEval is a pytest plugin that turns LLM evaluations into normal pytest tests.
- Test cases are LLMTestCase objects; metrics evaluate them with model-graded checks.
- Built-in metrics cover hallucination, answer relevancy, faithfulness, contextual precision/recall, and many more.
- Regression testing compares current scores against a baseline.
- The Confident AI cloud product adds dashboards and hosted datasets.
- For pytest-centric teams, DeepEval has the lowest friction of any LLM eval framework.

---

## Why DeepEval

The DeepEval value proposition is integration with pytest. If your team already writes pytest tests, DeepEval feels native. You write a test function, define LLMTestCase objects, run assertions with built-in or custom metrics, and the test passes or fails like any pytest test.

This integration matters more than it sounds. Existing pytest infrastructure (CI runners, test reporting, parameterization, fixtures) all just work with DeepEval tests. Teams adopt DeepEval in hours instead of days because there is no new framework to learn.

Compared to Ragas (which is more research-oriented), OpenAI Evals (which has its own runner), and LangSmith (which is hosted), DeepEval is the most pytest-native option. The tradeoff is that DeepEval focuses on offline evaluation and lacks the production tracing features of LangSmith or Helicone.

---

## Installation

\`\`\`bash
pip install deepeval pytest openai
export OPENAI_API_KEY=sk-...
\`\`\`

DeepEval registers as a pytest plugin automatically. Verify with pytest --help and look for the deepeval section.

---

## Basic Test Case

A DeepEval test case is an LLMTestCase object with input, output, expected output, and optional retrieval context.

\`\`\`python
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric

def test_answer_relevance():
    test_case = LLMTestCase(
        input="What is the capital of France?",
        actual_output="The capital of France is Paris.",
        expected_output="Paris",
    )
    metric = AnswerRelevancyMetric(threshold=0.7)
    assert_test(test_case, [metric])
\`\`\`

Run with pytest as normal:

\`\`\`bash
pytest test_llm.py
\`\`\`

The test passes if all metrics score above their thresholds. The output shows per-metric scores and reasoning.

---

## Built-in Metrics

DeepEval ships a comprehensive set of metrics.

\`\`\`python
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
    HallucinationMetric,
    BiasMetric,
    ToxicityMetric,
    SummarizationMetric,
    GEval,
)
\`\`\`

Each metric takes an LLMTestCase and produces a score with reasoning.

| Metric | Measures |
| --- | --- |
| AnswerRelevancy | Does the answer address the question |
| Faithfulness | Is the answer grounded in retrieval context |
| ContextualPrecision | Are retrieved chunks ordered correctly |
| ContextualRecall | Do retrieved chunks cover the expected answer |
| ContextualRelevancy | Are retrieved chunks topically relevant |
| Hallucination | Does the answer contain ungrounded claims |
| Bias | Does the response contain bias |
| Toxicity | Does the response contain toxic content |
| Summarization | Quality of summarization |
| GEval | Custom metric defined in natural language |

The metrics map closely to Ragas's metrics but use pytest assertions instead of evaluation reports.

---

## GEval Custom Metrics

GEval lets you define metrics in natural language. The framework converts the definition to a set of evaluation steps and runs them with an LLM judge.

\`\`\`python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

professionalism = GEval(
    name="Professionalism",
    criteria="Determine if the actual output uses professional language appropriate for customer service.",
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.7,
)

def test_professional():
    test_case = LLMTestCase(
        input="How do I rotate my API key?",
        actual_output="Hey buddy, click that 'rotate' button thingy.",
    )
    assert_test(test_case, [professionalism])
\`\`\`

GEval is the most flexible DeepEval feature. Define any metric in plain English and the framework operationalizes it.

---

## RAG Testing

For RAG applications, include retrieval context in the test case.

\`\`\`python
def test_rag():
    test_case = LLMTestCase(
        input="What is the upload limit?",
        actual_output="Uploads are limited to 100 MB.",
        expected_output="100 MB.",
        retrieval_context=[
            "Uploads are capped at 100 MB per file.",
            "Multipart supports 5 GB.",
        ],
    )
    metrics = [
        FaithfulnessMetric(threshold=0.8),
        ContextualPrecisionMetric(threshold=0.7),
        ContextualRecallMetric(threshold=0.8),
        AnswerRelevancyMetric(threshold=0.8),
    ]
    assert_test(test_case, metrics)
\`\`\`

The four standard RAG metrics (faithfulness, contextual precision, contextual recall, answer relevancy) cover the RAG triad plus an extra precision dimension.

---

## Parameterized Tests

Use pytest's parameterize decorator to run the same test across many cases.

\`\`\`python
import pytest

@pytest.mark.parametrize("input_question, expected", [
    ("Capital of France?", "Paris"),
    ("Capital of Spain?", "Madrid"),
    ("Capital of Italy?", "Rome"),
])
def test_qa(input_question, expected):
    actual = call_llm(input_question)
    test_case = LLMTestCase(input=input_question, actual_output=actual, expected_output=expected)
    assert_test(test_case, [AnswerRelevancyMetric()])
\`\`\`

The pytest parameterize integration is seamless because DeepEval tests are normal pytest tests.

---

## Dataset Testing

For larger datasets, use EvaluationDataset.

\`\`\`python
from deepeval.dataset import EvaluationDataset

dataset = EvaluationDataset(test_cases=[
    LLMTestCase(input="...", actual_output="...", expected_output="..."),
    LLMTestCase(input="...", actual_output="...", expected_output="..."),
])

@pytest.mark.parametrize("test_case", dataset)
def test_dataset(test_case: LLMTestCase):
    assert_test(test_case, [AnswerRelevancyMetric()])
\`\`\`

Load datasets from JSON, CSV, or HuggingFace.

\`\`\`python
dataset = EvaluationDataset()
dataset.add_test_cases_from_csv_file("test_cases.csv", input_col_name="question", actual_output_col_name="answer")
\`\`\`

---

## Async and Batched Evaluation

For large suites, batched async evaluation cuts runtime.

\`\`\`python
from deepeval import evaluate

results = evaluate(test_cases=dataset.test_cases, metrics=[AnswerRelevancyMetric()])
\`\`\`

The evaluate function runs metrics concurrently across cases. Use it when running thousands of cases.

---

## Regression Testing

DeepEval can compare current scores to a baseline.

\`\`\`bash
deepeval test run test_llm.py
\`\`\`

The CLI tracks scores across runs. A subsequent run with --regression flag compares to the previous run and fails if any metric regresses.

For CI, save the baseline once on main and compare PRs against it.

---

## CI Integration

Add DeepEval tests to your CI workflow.

\`\`\`yaml
# .github/workflows/llm-tests.yml
name: LLM Tests
on: [pull_request]
jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements.txt
      - run: pytest tests/llm/
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

The integration is identical to any pytest workflow.

---

## Confident AI Cloud

DeepEval integrates with the Confident AI cloud for dashboards.

\`\`\`bash
deepeval login
deepeval test run test_llm.py
\`\`\`

After login, test results upload to the cloud dashboard. Useful for tracking trends and sharing results across the team.

The cloud product is optional. DeepEval works offline; the cloud adds collaboration features.

---

## Comparison to Alternatives

| Framework | Pytest-Native | Built-in Metrics | RAG Metrics | Dashboard |
| --- | --- | --- | --- | --- |
| DeepEval | Yes | Yes | Yes | Cloud option |
| Ragas | No | Yes | Yes | No |
| OpenAI Evals | No | Yes | Custom | Yes |
| LangChain Evaluators | Adapter | Yes | Via Ragas | Via LangSmith |
| TruLens | No | Custom | Yes | Yes |

DeepEval is the only framework that fits naturally into pytest. For teams that already invest in pytest, the friction is the lowest.

---

## When to Choose DeepEval

Choose DeepEval if:

You write pytest tests already.

You want LLM tests in the same suite as unit and integration tests.

You want a flexible custom metric system (GEval).

You want a comprehensive metric library out of the box.

Avoid DeepEval if:

You need production tracing; DeepEval is offline-focused.

You build agents with complex tool use; OpenAI Evals has better agent support.

You require self-hosted dashboards; the Confident AI dashboards are cloud-only.

---

## Setup Checklist

Install DeepEval and pytest.

Write a first test with a single test case and one metric.

Run pytest and confirm the test runs.

Add parameterize for multiple cases.

Add RAG metrics if you build RAG.

Add GEval for custom dimensions.

Integrate into CI.

Optionally: log in to Confident AI for dashboards.

---

## Common Patterns

Pattern 1: pytest-centric workflow. LLM tests live alongside unit tests. Same CI, same reporting.

Pattern 2: GEval for domain-specific quality. Define one or two GEval metrics for your domain's quality dimensions.

Pattern 3: dataset-driven testing. Maintain a dataset of test cases; load via parameterize.

Pattern 4: regression gating. Save baselines; PRs cannot regress on any metric without explicit approval.

---

## Common Pitfalls

Loose thresholds. A threshold of 0.5 passes most things and provides little signal. Tighten thresholds based on baseline.

Stale test cases. Test cases that no longer reflect product behavior mislead. Refresh from production.

Ignoring per-metric reasoning. The metrics include reasoning; read it when scores are unexpected.

Forgetting to log in for cloud. The local CLI works fine offline; if you want cloud dashboards, log in first.

Mixing test purposes. Keep pytest-style unit tests and DeepEval LLM tests in separate files. Otherwise the suite gets confusing.

---

## Migration from Other Frameworks

If you currently use Ragas and want to move to DeepEval:

Datasets convert easily; both use roughly the same fields.

Metrics map directly: Ragas faithfulness becomes DeepEval FaithfulnessMetric.

The main change is replacing the Ragas evaluate() call with pytest tests.

For teams committed to pytest, the migration is a clear win in developer experience.

---

## Further Resources

- DeepEval documentation at docs.confident-ai.com.
- Compare DeepEval to Ragas at /blog.
- Browse LLM evaluation skills at /skills.

---

## Conclusion

DeepEval is the pytest-native LLM evaluation framework. For teams that already write pytest tests, DeepEval has the lowest friction of any LLM eval framework. The metric library is comprehensive, GEval enables custom metrics, and the pytest integration is seamless. Start with a single test, add metrics as needed, integrate into CI. Browse [/skills](/skills) for related tools and the [/blog](/blog) for deeper guides.
`,
};
