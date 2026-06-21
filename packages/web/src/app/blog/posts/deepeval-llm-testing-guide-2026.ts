import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval Tutorial: LLM Testing in Python (2026)',
  description:
    'Test LLM apps with DeepEval — install, metrics (G-Eval, faithfulness, hallucination, answer relevancy), pytest integration, datasets, and RAG evaluation. Runnable Python.',
  date: '2026-06-21',
  category: 'Guide',
  content: `
# DeepEval Tutorial: LLM Testing in Python (2026)

Shipping an LLM feature without evaluation is like deploying code with no tests — it works on the demo input and breaks on everything else. DeepEval is the framework that fixes this for Python teams. It brings the discipline of unit testing to large language model applications, letting you assert that your model's output meets a measurable quality bar before it reaches users. If you already write \`pytest\` tests, DeepEval will feel immediately familiar: you build test cases, run metrics against them, and let the suite pass or fail the build.

This tutorial is a complete, runnable walkthrough of DeepEval in 2026. You will install it, learn the anatomy of an \`LLMTestCase\`, and work through the core metrics — \`AnswerRelevancyMetric\`, \`FaithfulnessMetric\`, \`HallucinationMetric\`, \`ContextualPrecisionMetric\`, \`ContextualRecallMetric\`, and the powerful \`GEval\` metric for custom criteria. You will see how \`assert_test()\` and the \`deepeval test run\` CLI integrate with pytest, how to manage datasets with \`EvaluationDataset\` and \`Golden\` objects, how to evaluate in bulk with \`evaluate()\`, how to choose a judge model and set thresholds, and how to evaluate a RAG pipeline using the RAG triad. We finish with CI usage and the common pitfalls that trip up first-time users.

Everything here is real, copy-pasteable Python. By the end you will have a working eval suite you can wire into your continuous integration so that quality regressions — a prompt change that increases hallucination, a retriever tweak that drops recall — get caught automatically. If you are assembling a broader testing toolkit for your AI agents, the [QA skills directory](/skills) on QASkills.sh has ready-to-install evaluation and testing skills that complement what you will build here. Let us start at the beginning: getting DeepEval installed and running its first metric.

## Installing DeepEval

DeepEval is distributed on PyPI. Install it into a virtual environment, then set the API key for whichever model you will use as the judge — DeepEval's LLM-graded metrics call an evaluator model to reason about correctness.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
pip install -U deepeval

# DeepEval uses an LLM as the judge for most metrics.
export OPENAI_API_KEY="sk-..."
\`\`\`

Verify the install and run a one-off metric to confirm everything is wired up:

\`\`\`python
# smoke_test.py
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric

test_case = LLMTestCase(
    input="What is the capital of France?",
    actual_output="The capital of France is Paris.",
)

metric = AnswerRelevancyMetric(threshold=0.7)
metric.measure(test_case)
print(metric.score, metric.reason)
\`\`\`

Run it with \`python smoke_test.py\`. You should see a score near 1.0 and a short explanation. The \`measure()\` method is the standalone way to score a single metric; in real suites you will usually use \`assert_test()\` or \`evaluate()\` instead, both covered below.

## Anatomy of an LLMTestCase

The \`LLMTestCase\` is the atom of DeepEval. Almost every metric operates on one. It has four fields you will use constantly:

- **\`input\`** — the prompt or user query your application received.
- **\`actual_output\`** — what your application actually produced. This is the thing under test.
- **\`expected_output\`** — an optional reference answer, used by metrics that compare against a gold answer.
- **\`retrieval_context\`** — an optional list of retrieved text chunks, required for RAG metrics like faithfulness and contextual precision/recall.

\`\`\`python
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="When was the QASkills CLI released?",
    actual_output="The QASkills CLI launched in early 2026.",
    expected_output="The QASkills CLI was released in 2026.",
    retrieval_context=[
        "QASkills.sh shipped its CLI in 2026 for AI coding agents.",
    ],
)
\`\`\`

The key discipline is that \`actual_output\` must come from running your real application, not a hardcoded string. The whole point is to evaluate what your system produces. In practice you wrap your app call in a function and feed its return value into the test case.

## Core Metric: Answer Relevancy

\`AnswerRelevancyMetric\` measures whether the output actually addresses the input — does the answer respond to the question, or does it drift, pad, or ignore part of the ask? It is one of the most broadly useful metrics because it catches generic, off-topic, or evasive responses.

\`\`\`python
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric

metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-5", include_reason=True)

test_case = LLMTestCase(
    input="How do I reset my password?",
    actual_output=(
        "Click 'Forgot password' on the login page, enter your email, "
        "and follow the reset link we send you."
    ),
)

metric.measure(test_case)
print(metric.score)   # e.g. 0.95
print(metric.reason)  # explanation of the verdict
\`\`\`

The \`threshold\` defines the pass/fail line: a score at or above it passes. \`include_reason=True\` asks the judge to return a natural-language justification, which is invaluable when debugging why a case failed.

## Core Metric: Faithfulness

\`FaithfulnessMetric\` checks whether the output is grounded in the provided \`retrieval_context\` — that is, whether every claim in the answer is actually supported by the retrieved material. This is the primary defense against hallucination in RAG systems: a model can produce a fluent, relevant answer that nonetheless invents facts not present in the context.

\`\`\`python
from deepeval.test_case import LLMTestCase
from deepeval.metrics import FaithfulnessMetric

metric = FaithfulnessMetric(threshold=0.8, model="gpt-5")

test_case = LLMTestCase(
    input="What is the refund window?",
    actual_output="You can request a refund within 30 days of purchase.",
    retrieval_context=[
        "Refunds are available within 30 days of the original purchase date.",
    ],
)

metric.measure(test_case)
print(metric.score, metric.reason)
\`\`\`

Faithfulness requires \`retrieval_context\`. If the answer states "within 14 days" while the context says "30 days," the score drops and the reason flags the unsupported claim.

## Core Metric: Hallucination

\`HallucinationMetric\` is distinct from faithfulness. It compares the output against a provided \`context\` and scores how much of the output contradicts or fabricates beyond that ground truth. Lower hallucination is better, and DeepEval inverts the scoring so the threshold still reads as "pass if good." Use it when you have authoritative context and want to penalize any invented content.

\`\`\`python
from deepeval.test_case import LLMTestCase
from deepeval.metrics import HallucinationMetric

metric = HallucinationMetric(threshold=0.3)  # lower is stricter

test_case = LLMTestCase(
    input="Describe the product warranty.",
    actual_output="The product has a 2-year warranty and free lifetime support.",
    context=[
        "The product includes a 2-year limited warranty.",
    ],
)

metric.measure(test_case)
print(metric.score, metric.reason)
\`\`\`

Here "free lifetime support" is not in the context, so the metric flags fabrication. Note this metric uses \`context\` (ground-truth facts) rather than \`retrieval_context\`.

## Custom Criteria with G-Eval

\`GEval\` is the most flexible metric in DeepEval. Instead of a fixed dimension, you describe your evaluation criteria in plain English, list which test-case fields the judge should consider, and DeepEval turns that into a scored rubric using chain-of-thought reasoning. This lets you encode bespoke quality bars — tone, completeness, format compliance, brand voice — that no built-in metric captures.

\`\`\`python
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.metrics import GEval

correctness = GEval(
    name="Correctness",
    criteria=(
        "Determine whether the actual output is factually correct and "
        "complete relative to the expected output. Penalize missing key "
        "details and any contradictions."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    model="gpt-5",
    threshold=0.7,
)

test_case = LLMTestCase(
    input="List the QASkills CLI install command.",
    actual_output="Run: npx qaskills add <skill>",
    expected_output="Install a skill with: qaskills add <skill>",
)

correctness.measure(test_case)
print(correctness.score, correctness.reason)
\`\`\`

The \`evaluation_params\` list tells the judge which fields matter. G-Eval is the right tool when your quality definition is nuanced and human-judgment-like rather than a simple match.

## Metric Reference Table

The table below summarizes the most-used DeepEval metrics, what each measures, which test-case fields it needs, and whether it uses an LLM judge. "Higher is better" applies to all except hallucination, where the score reflects fabrication and a lower raw value is better.

| Metric | Measures | Required fields | LLM judge |
|---|---|---|---|
| \`AnswerRelevancyMetric\` | Does output address the input | input, actual_output | Yes |
| \`FaithfulnessMetric\` | Output grounded in retrieval context | input, actual_output, retrieval_context | Yes |
| \`HallucinationMetric\` | Fabrication beyond ground truth | input, actual_output, context | Yes |
| \`ContextualPrecisionMetric\` | Relevant chunks ranked first | input, actual_output, expected_output, retrieval_context | Yes |
| \`ContextualRecallMetric\` | All needed info retrieved | input, expected_output, retrieval_context | Yes |
| \`ContextualRelevancyMetric\` | Retrieved chunks on-topic | input, actual_output, retrieval_context | Yes |
| \`GEval\` | Custom plain-English criteria | configurable | Yes |
| \`ToxicityMetric\` | Harmful or toxic content | input, actual_output | Yes |

## Pytest Integration with assert_test

DeepEval's CI superpower is that it behaves like pytest. The \`assert_test()\` helper takes a test case and a list of metrics, runs them, and raises an assertion error if any metric falls below its threshold. Drop these into a normal test file and they participate in your existing test run.

\`\`\`python
# test_chatbot.py
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric


def get_answer(question: str) -> tuple[str, list[str]]:
    # Replace with your real RAG application call.
    answer = "You can request a refund within 30 days of purchase."
    context = ["Refunds are available within 30 days of purchase."]
    return answer, context


@pytest.mark.parametrize(
    "question",
    [
        "What is the refund window?",
        "How long do I have to get a refund?",
    ],
)
def test_refund_answers(question):
    answer, context = get_answer(question)
    test_case = LLMTestCase(
        input=question,
        actual_output=answer,
        retrieval_context=context,
    )
    assert_test(
        test_case,
        [
            AnswerRelevancyMetric(threshold=0.7),
            FaithfulnessMetric(threshold=0.8),
        ],
    )
\`\`\`

Run it with the DeepEval CLI, which adds tracing and richer output, or with plain pytest:

\`\`\`bash
deepeval test run test_chatbot.py
# or
pytest test_chatbot.py -v
\`\`\`

Because it is parametrized like any pytest test, you can scale to hundreds of cases, and you can speed the suite up with parallel workers — see our [pytest-xdist parallel testing guide](/blog/pytest-xdist-parallel-testing-guide) for running these evals across multiple cores.

## Datasets and Goldens

For anything beyond a handful of cases, manage your examples as an \`EvaluationDataset\` made of \`Golden\` objects. A \`Golden\` holds the input and expected output (and optionally context) without an actual output — you fill in \`actual_output\` at evaluation time by running your app. This separates "the questions and their gold answers" from "what the model produced this run."

\`\`\`python
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric
from deepeval import evaluate


def my_app(question: str) -> str:
    # Your real application call.
    return "The capital of France is Paris."


goldens = [
    Golden(input="What is the capital of France?", expected_output="Paris"),
    Golden(input="What is the capital of Japan?", expected_output="Tokyo"),
]

dataset = EvaluationDataset(goldens=goldens)

# Convert goldens into test cases by running the app.
test_cases = [
    LLMTestCase(input=g.input, actual_output=my_app(g.input),
                expected_output=g.expected_output)
    for g in dataset.goldens
]
\`\`\`

Datasets can be loaded from CSV or JSON, generated synthetically, or synced to Confident AI for team management and historical tracking. The golden pattern keeps your reference set stable while the model output varies run to run.

## Bulk Evaluation with evaluate()

When you want to score many test cases at once and get an aggregate report rather than a hard pass/fail, use \`evaluate()\`. It runs every metric against every test case and returns structured results, which is ideal for a one-shot quality sweep, a model comparison, or generating a report outside of pytest.

\`\`\`python
from deepeval import evaluate
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric

results = evaluate(
    test_cases=test_cases,
    metrics=[
        AnswerRelevancyMetric(threshold=0.7),
        FaithfulnessMetric(threshold=0.8),
    ],
)

for r in results.test_results:
    print(r.name, "PASS" if r.success else "FAIL")
\`\`\`

Use \`evaluate()\` for exploratory runs and reporting; use \`assert_test()\` inside pytest when you want failures to break the build. Many teams use both — \`evaluate()\` for nightly quality dashboards and \`assert_test()\` for the per-commit gate.

## Choosing a Judge Model and Setting Thresholds

Most DeepEval metrics are LLM-as-judge, so the judge model materially affects your scores. Set it explicitly per metric with the \`model=\` argument and pin a specific version so results stay comparable across runs. A stronger judge gives more reliable verdicts at higher cost; a mid-tier judge is fine for routine CI and cheaper at scale.

Thresholds are policy decisions, not defaults to accept blindly. Start conservative and calibrate against a labeled sample: if a 0.7 relevancy threshold passes answers your reviewers consider bad, raise it. The table contrasts judge choices.

| Judge choice | Reliability | Cost | Good for |
|---|---|---|---|
| Top-tier model (e.g. gpt-5) | Highest | Highest | Release gating, calibration |
| Mid-tier model | Good | Moderate | Routine CI on every commit |
| Smaller/cheaper model | Variable | Lowest | Large bulk sweeps, smoke checks |

Whatever you pick, keep it fixed. Changing judges mid-project makes historical scores incomparable and can mask real regressions.

## Evaluating RAG with the RAG Triad

For retrieval-augmented generation, no single metric is enough. The **RAG triad** decomposes quality into three questions so you can tell *where* a failure originates: is retrieval pulling the wrong chunks, or is the generator misusing good chunks? The table maps each metric to the failure it isolates.

| RAG metric | Question it answers | Diagnoses |
|---|---|---|
| \`ContextualRecallMetric\` | Did we retrieve everything needed? | Retriever misses |
| \`ContextualPrecisionMetric\` | Are relevant chunks ranked first? | Retriever ranking |
| \`ContextualRelevancyMetric\` | Are retrieved chunks on-topic? | Retriever noise |
| \`FaithfulnessMetric\` | Is the answer grounded in context? | Generator hallucination |
| \`AnswerRelevancyMetric\` | Does the answer address the query? | Generator drift |

\`\`\`python
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    ContextualRecallMetric,
    ContextualPrecisionMetric,
    FaithfulnessMetric,
    AnswerRelevancyMetric,
)
from deepeval import evaluate

test_case = LLMTestCase(
    input="What is the refund window?",
    actual_output="You can request a refund within 30 days.",
    expected_output="Refunds are available within 30 days of purchase.",
    retrieval_context=[
        "Refunds are available within 30 days of the purchase date.",
        "Shipping is free over $50.",
    ],
)

evaluate(
    test_cases=[test_case],
    metrics=[
        ContextualRecallMetric(threshold=0.7),
        ContextualPrecisionMetric(threshold=0.7),
        FaithfulnessMetric(threshold=0.8),
        AnswerRelevancyMetric(threshold=0.7),
    ],
)
\`\`\`

If recall is low, fix retrieval; if faithfulness is low while recall is high, fix the generation prompt. This decomposition is what makes DeepEval especially strong for RAG debugging.

## CI Usage and Common Pitfalls

Wiring DeepEval into continuous integration is straightforward because it runs through pytest. A minimal GitHub Actions step installs DeepEval, sets the judge model's API key as a secret, and runs the suite; any metric below threshold fails the job.

\`\`\`yaml
# .github/workflows/evals.yml
name: LLM Evals
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -U deepeval pytest
      - run: deepeval test run tests/evals
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
\`\`\`

Watch for these common pitfalls. First, do not hardcode \`actual_output\` — it must come from your real app, or the eval tests nothing. Second, remember that judge-based metrics cost money and add latency; keep the per-commit suite small and run the full sweep nightly. Second, scores vary slightly between runs because the judge is itself an LLM, so avoid razor-thin thresholds and pin your judge version. Finally, give RAG metrics the right fields — faithfulness needs \`retrieval_context\`, hallucination needs \`context\` — or they will error or mislead. For how DeepEval stacks up against config-driven alternatives, see our [Promptfoo vs DeepEval comparison](/blog/promptfoo-vs-deepeval-2026) and the broader [OpenAI Evals guide](/blog/openai-evals-complete-guide-2026).

## Frequently Asked Questions

### What is DeepEval used for?
DeepEval is a Python framework for testing and evaluating LLM applications the way pytest tests regular code. You build test cases from your app's real output and run metrics — answer relevancy, faithfulness, hallucination, contextual precision/recall, and custom G-Eval criteria — that score quality and pass or fail against thresholds. It is used to catch prompt and model regressions, validate RAG pipelines, and gate deploys in CI.

### Do I need an API key to use DeepEval?
For most metrics, yes, because they use an LLM as the judge to reason about correctness, and that judge needs API access — typically an OpenAI key, though DeepEval supports other providers. You set it as an environment variable. Purely deterministic checks you write in Python need no key, but the signature metrics like faithfulness, answer relevancy, and G-Eval all call an evaluator model.

### What is the difference between faithfulness and hallucination metrics?
\`FaithfulnessMetric\` checks whether every claim in the answer is supported by the supplied \`retrieval_context\`, making it the core RAG groundedness check. \`HallucinationMetric\` compares the output against an authoritative \`context\` of ground-truth facts and penalizes fabricated or contradictory content. They use different fields and serve different roles: faithfulness for "is the answer grounded in what we retrieved," hallucination for "does the answer invent facts beyond known truth."

### How does G-Eval work in DeepEval?
\`GEval\` lets you define evaluation criteria in plain English rather than picking a fixed metric. You write a \`criteria\` description, list the test-case fields the judge should consider via \`evaluation_params\`, and DeepEval uses chain-of-thought reasoning with an LLM to produce a 0–1 score and explanation. It is ideal for nuanced, human-like judgments such as tone, completeness, or format compliance that no built-in metric captures directly.

### How do I integrate DeepEval with pytest?
Write normal pytest functions, build an \`LLMTestCase\` from your app's output inside each test, and call \`assert_test(test_case, [metrics])\`. If any metric is below its threshold, the call raises an assertion error and the test fails. Run the file with \`deepeval test run\` for richer tracing or plain \`pytest\`. Because they are ordinary tests, you can parametrize them and run them in your existing CI pipeline.

### Can DeepEval evaluate RAG systems?
Yes, and it is one of its strengths. DeepEval models \`retrieval_context\` as a first-class field and offers the RAG triad — contextual recall, contextual precision, and contextual relevancy for the retriever, plus faithfulness and answer relevancy for the generator. Running all five lets you isolate whether a failure comes from retrieval (wrong or missing chunks) or generation (hallucination or drift), which makes debugging RAG pipelines far more precise.

### How much does it cost to run DeepEval?
The framework is free and open source; your cost is the model API usage of the judge. LLM-graded metrics make one or more evaluator calls per test case, so cost scales with the number of cases and metrics times the judge's per-token price. Keep CI cheap by running a small curated subset on every commit with a mid-tier judge, and reserve the full suite and a top-tier judge for nightly or release builds.

### Why do my DeepEval scores change between runs?
Because the judge is itself an LLM, its verdicts are not perfectly deterministic, so scores can vary slightly run to run even with identical inputs. To reduce noise, pin a specific judge model version, avoid thresholds that sit right at the margin, and calibrate thresholds against a labeled sample. For critical gates, use a stronger, more consistent judge and consider averaging across a few runs.

## Conclusion

DeepEval turns LLM quality from a gut feeling into a measurable, automated test. You have now installed it, built test cases, run the core metrics, written custom G-Eval criteria, managed datasets with goldens, evaluated in bulk, chosen a judge model, set thresholds, and decomposed a RAG pipeline with the triad — all in plain Python that slots into pytest and CI. With a small golden dataset and a handful of metrics asserting on every pull request, regressions like rising hallucination or dropping recall get caught before users ever see them.

The next step is to make evaluation a standing part of your workflow. Browse the [QA skills directory](/skills) on QASkills.sh for ready-to-install DeepEval, RAG-quality, and prompt-testing skills that plug straight into your AI coding agent, so testing your LLM features becomes as routine as testing the rest of your code.
`,
};
