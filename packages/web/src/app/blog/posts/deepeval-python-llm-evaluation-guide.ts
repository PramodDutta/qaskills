import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval Tutorial 2026: LLM Unit Testing in Python with Pytest',
  description:
    'Learn DeepEval, the pytest for LLMs. Write LLM unit tests in Python with assert_test, GEval, and AnswerRelevancyMetric, plus CI integration and best practices.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# DeepEval Tutorial 2026: LLM Unit Testing in Python with Pytest

Shipping features backed by large language models introduces a testing problem that traditional assertions cannot solve. A function that adds two numbers either returns 4 or it does not. But an LLM asked to summarize a support ticket can produce a thousand different correct answers and a thousand different wrong ones. The output is non-deterministic, semantically graded, and impossible to pin down with \`assertEqual\`. This is exactly the gap DeepEval fills.

DeepEval is an open-source Python framework that brings unit testing discipline to LLM applications. If you already know pytest, you already know most of DeepEval. It runs on top of pytest, uses the same \`deepeval test run\` command flow, and lets you write assertions like \`assert_test(test_case, [metric])\` that pass or fail a build based on measurable quality thresholds. Under the hood it ships more than a dozen research-backed metrics, including answer relevancy, faithfulness, hallucination detection, contextual precision and recall for RAG pipelines, and the flexible \`GEval\` metric that lets you define custom evaluation criteria in plain English.

This guide is a hands-on DeepEval tutorial for 2026. You will learn how to install the framework, write your first LLM unit test, use \`GEval\` and \`AnswerRelevancyMetric\`, evaluate retrieval-augmented generation systems, run everything inside pytest, and wire the whole thing into a CI pipeline so regressions never reach production. Everything here is real, runnable Python. If you are broadly leveling up your quality engineering, browse the [QA skills](/skills) directory for agent-ready testing playbooks, and see our companion piece on [testing AI generated code](/blog/testing-ai-generated-code-sdet-playbook).

## Why LLM Applications Need a Different Testing Approach

Deterministic software testing rests on one assumption: the same input yields the same output. LLMs break that assumption on purpose. Temperature settings, model updates, prompt drift, and context changes all shift outputs. You cannot snapshot-test a chatbot response and expect it to match next week.

Instead, LLM testing asks graded questions. Is the answer relevant to the question? Is it grounded in the retrieved context, or did the model hallucinate? Does it follow the tone and format the product requires? DeepEval answers these with metrics that return a score between 0 and 1 and a pass/fail verdict against a threshold you set. This turns fuzzy quality into a number you can gate a deployment on, which is the same principle behind good [API testing](/blog/api-testing-complete-guide) contracts.

## Installing DeepEval and Setting Up Your Environment

DeepEval installs from PyPI. Most metrics use an LLM as a judge, so you also need an API key for whatever model you choose as the evaluator. OpenAI is the default, but DeepEval supports Anthropic, local models via Ollama, Azure, and custom judge models.

\`\`\`bash
# Install DeepEval into your project's virtualenv
pip install -U deepeval

# Set your evaluator model key (OpenAI is the default judge)
export OPENAI_API_KEY="sk-your-key-here"

# Optional: log in to Confident AI for a hosted dashboard
deepeval login

# Verify the install
deepeval --version
\`\`\`

Create a \`requirements-dev.txt\` or add \`deepeval\` to your dev dependencies so CI installs the same version. Pin the version to avoid metric-behavior drift between local and CI runs.

## Your First LLM Unit Test with assert_test

The core building block in DeepEval is the \`LLMTestCase\`. It holds the \`input\` (what you sent the model), the \`actual_output\` (what the model returned), and optionally the \`expected_output\`, \`retrieval_context\`, and \`context\`. You pair a test case with one or more metrics and call \`assert_test\`.

\`\`\`python
# test_first_llm.py
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric


def test_answer_is_relevant():
    # In a real test you would call your own LLM app here
    test_case = LLMTestCase(
        input="What is the capital of France?",
        actual_output="The capital of France is Paris.",
    )

    metric = AnswerRelevancyMetric(threshold=0.7)

    # Passes the build if the relevancy score >= 0.7, fails otherwise
    assert_test(test_case, [metric])
\`\`\`

Run it exactly like pytest, but through DeepEval so the reporting and caching work:

\`\`\`bash
deepeval test run test_first_llm.py
\`\`\`

DeepEval prints a per-metric score, the reason the judge model gave, and a green or red verdict. If the score falls below the threshold, the test fails and the process exits non-zero, which is what makes it CI-friendly.

## Understanding the LLMTestCase Object

Every metric reads specific fields off the test case. Getting these right is the single most common source of confusing failures, so it is worth memorizing which field feeds which metric.

| Field | Purpose | Required by |
|-------|---------|-------------|
| \`input\` | The prompt or user question | Most metrics |
| \`actual_output\` | The model's real response | All metrics |
| \`expected_output\` | A reference or gold answer | GEval (optional), custom checks |
| \`retrieval_context\` | Chunks your retriever returned | Faithfulness, Contextual Precision/Recall |
| \`context\` | Ideal ground-truth context | Hallucination, Contextual Recall |
| \`tools_called\` | Tools the agent invoked | Tool correctness metrics |

A frequent mistake is passing retrieved chunks as \`context\` instead of \`retrieval_context\`. The \`context\` field represents ideal ground truth for hallucination checks, while \`retrieval_context\` is what your live RAG system actually pulled. Mixing them produces scores that look wrong but are technically correct for the field you populated.

## Using GEval for Custom Evaluation Criteria

The built-in metrics cover common cases, but real products have bespoke quality rules. \`GEval\` uses the LLM-as-a-judge technique with chain-of-thought to evaluate any criteria you can describe in natural language. You give it a name, a criteria string or explicit evaluation steps, and the list of test-case parameters it should read.

\`\`\`python
# test_geval_correctness.py
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.metrics import GEval


def test_medical_answer_is_correct_and_safe():
    correctness = GEval(
        name="Correctness",
        criteria=(
            "Determine whether the actual output is factually correct "
            "and does not contradict the expected output."
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=0.8,
    )

    test_case = LLMTestCase(
        input="Is ibuprofen safe to take on an empty stomach?",
        actual_output=(
            "Ibuprofen can irritate the stomach lining, so it is best "
            "taken with food or milk to reduce the risk of stomach upset."
        ),
        expected_output=(
            "Ibuprofen should be taken with food to avoid stomach irritation."
        ),
    )

    assert_test(test_case, [correctness])
\`\`\`

For higher reliability, prefer explicit \`evaluation_steps\` over a single \`criteria\` string. Steps reduce judge variance because the model follows a fixed rubric instead of improvising one.

\`\`\`python
tone_metric = GEval(
    name="Professional Tone",
    evaluation_steps=[
        "Check whether the output uses polite, professional language.",
        "Penalize slang, sarcasm, or dismissive phrasing.",
        "Reward clear, empathetic responses appropriate for support.",
    ],
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.75,
)
\`\`\`

## Testing RAG Pipelines with Faithfulness and Relevancy

Retrieval-augmented generation is where LLM testing earns its keep. A RAG answer can be fluent, confident, and completely fabricated. DeepEval ships a suite of metrics designed precisely for this: \`FaithfulnessMetric\` checks that the output is grounded in the retrieved context, \`ContextualPrecisionMetric\` and \`ContextualRecallMetric\` grade the retriever itself, and \`AnswerRelevancyMetric\` grades the final answer.

\`\`\`python
# test_rag_pipeline.py
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    FaithfulnessMetric,
    AnswerRelevancyMetric,
    ContextualRelevancyMetric,
)


def test_rag_answer_is_grounded():
    test_case = LLMTestCase(
        input="What is the return window for online orders?",
        actual_output=(
            "You can return online orders within 30 days of delivery "
            "for a full refund."
        ),
        retrieval_context=[
            "Online orders may be returned within 30 days of the "
            "delivery date. Refunds are issued to the original payment method.",
        ],
    )

    assert_test(
        test_case,
        [
            FaithfulnessMetric(threshold=0.8),
            AnswerRelevancyMetric(threshold=0.7),
            ContextualRelevancyMetric(threshold=0.7),
        ],
    )
\`\`\`

If your model answered "within 60 days" while the context said 30, \`FaithfulnessMetric\` would fail and tell you the exact unsupported claim. That precision is what makes DeepEval far more useful than eyeballing outputs. The same grounding discipline applies when you validate service boundaries in [API contract testing](/blog/api-contract-testing-microservices).

## Comparing DeepEval Metrics at a Glance

Choosing the right metric matters. Here is how the most common ones map to what they measure and what fields they consume.

| Metric | What it measures | Needs retrieval_context | Best for |
|--------|------------------|-------------------------|----------|
| AnswerRelevancyMetric | Is the answer on-topic? | No | Chatbots, Q&A |
| FaithfulnessMetric | Is the answer grounded in context? | Yes | RAG systems |
| HallucinationMetric | Does output contradict ground truth? | No (uses context) | Fact-heavy apps |
| ContextualPrecisionMetric | Are relevant chunks ranked high? | Yes | Retriever tuning |
| ContextualRecallMetric | Was all needed context retrieved? | Yes | Retriever tuning |
| GEval | Any custom criteria | Optional | Tone, format, safety |
| ToolCorrectnessMetric | Did the agent call the right tools? | No | Agentic apps |

## Running Batch Evaluations with the evaluate Function

Beyond single assertions, DeepEval offers the \`evaluate\` function for running a whole dataset at once outside the pytest lifecycle. This is ideal for offline experiments, comparing two prompt versions, or generating a report before a release.

\`\`\`python
# batch_eval.py
from deepeval import evaluate
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric

dataset = [
    LLMTestCase(
        input="How do I reset my password?",
        actual_output="Click 'Forgot password' on the login page and follow the email link.",
    ),
    LLMTestCase(
        input="What payment methods do you accept?",
        actual_output="We accept Visa, Mastercard, American Express, and PayPal.",
    ),
]

results = evaluate(
    test_cases=dataset,
    metrics=[AnswerRelevancyMetric(threshold=0.7)],
)

for r in results.test_results:
    print(r.name, "->", "PASS" if r.success else "FAIL")
\`\`\`

The \`evaluate\` function returns a structured results object you can inspect, log, or push to the Confident AI dashboard for tracking scores over time.

## Parametrizing LLM Tests with Pytest

Because DeepEval runs on pytest, all of pytest's power is available, including \`@pytest.mark.parametrize\`. This lets you run the same metric across many inputs without duplicating code, which is the standard way to build a real regression suite.

\`\`\`python
# test_parametrized.py
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric


@pytest.mark.parametrize(
    "question,answer",
    [
        ("What are your business hours?", "We are open 9am to 6pm, Monday to Friday."),
        ("Do you ship internationally?", "Yes, we ship to over 40 countries worldwide."),
        ("How long is shipping?", "Standard shipping takes 3 to 5 business days."),
    ],
)
def test_faq_answers_are_relevant(question, answer):
    test_case = LLMTestCase(input=question, actual_output=answer)
    assert_test(test_case, [AnswerRelevancyMetric(threshold=0.7)])
\`\`\`

Combine this with a golden dataset stored as JSON or CSV, load it in a fixture, and you have a maintainable evaluation suite that scales with your product. For deeper pytest technique, our [pytest complete guide](/blog/pytest-testing-complete-guide) covers fixtures, markers, and plugins in depth.

## Managing Cost and Flakiness in LLM Evals

Because metrics call a judge LLM, evaluations cost money and can be slightly non-deterministic. Three practices keep this under control. First, cache results with DeepEval's built-in \`-c\` flag so unchanged test cases are not re-scored. Second, pick a cheaper judge model for the bulk of tests and reserve a stronger judge for critical safety checks. Third, set thresholds with a margin below observed scores so normal judge variance does not cause spurious red builds.

\`\`\`bash
# Use cached results where possible and run tests in parallel
deepeval test run test_suite.py -c -n 4
\`\`\`

Treat flaky LLM tests the same way you treat any [flaky tests](/blog/fix-flaky-tests-guide): quarantine, investigate the variance, and tighten the metric or widen the threshold rather than deleting the check.

## Building a Golden Dataset for Regression Testing

Single test cases are a starting point, but a durable evaluation suite needs a golden dataset: a curated collection of representative inputs paired with metrics that runs on every change. DeepEval provides the \`EvaluationDataset\` and \`Golden\` primitives so you can store cases separately from test code, load them from JSON or CSV, and grow the set over time as you discover edge cases in production.

\`\`\`python
# golden_dataset.py
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric

# Goldens hold inputs and optional expected outputs, not model responses
goldens = [
    Golden(input="How do I cancel my subscription?"),
    Golden(input="What is your refund policy?"),
    Golden(input="Can I change my plan mid-cycle?"),
]

dataset = EvaluationDataset(goldens=goldens)


def run_my_app(prompt: str) -> str:
    # Replace with a real call to your LLM application
    return "Your subscription can be cancelled anytime from account settings."


# Convert each golden into a test case by invoking the app under test
for golden in dataset.goldens:
    dataset.add_test_case(
        LLMTestCase(input=golden.input, actual_output=run_my_app(golden.input))
    )
\`\`\`

Storing goldens as data rather than code means non-engineers such as product managers or support leads can contribute new cases through a spreadsheet, and your suite stays comprehensive without constant developer effort. Every production incident becomes a new golden that guards against the same failure recurring.

## Choosing and Configuring the Judge Model

Because most DeepEval metrics rely on an LLM to grade outputs, the judge model you choose has a direct effect on cost, speed, and accuracy. A stronger judge produces more reliable verdicts but costs more per call; a weaker judge is cheap but noisier. DeepEval lets you pass a model to any metric, so you can mix judges within a single suite, reserving the expensive one for safety-critical checks.

\`\`\`python
# custom_judge.py
from deepeval.metrics import AnswerRelevancyMetric, GEval
from deepeval.test_case import LLMTestCaseParams

# Use a cheaper model for high-volume relevancy checks
relevancy = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o-mini")

# Use a stronger judge for a critical safety criterion
safety = GEval(
    name="Safety",
    evaluation_steps=[
        "Fail if the output gives dangerous or harmful instructions.",
        "Fail if the output encourages self-harm or illegal activity.",
        "Otherwise pass.",
    ],
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.9,
    model="gpt-4o",
)
\`\`\`

You can also register a fully custom judge, including a local model served through Ollama, by implementing DeepEval's model interface. This is the standard way to run evaluations offline or keep sensitive prompts off third-party APIs entirely, which matters for regulated domains covered in our [security testing guide](/blog/security-testing-ai-generated-code).

## Integrating DeepEval into CI/CD

The payoff of writing LLM unit tests is stopping regressions automatically. Because \`deepeval test run\` exits non-zero on failure, it plugs straight into any CI system. Here is a GitHub Actions workflow that runs the eval suite on every pull request.

\`\`\`yaml
# .github/workflows/llm-eval.yml
name: LLM Evaluation
on: [pull_request]

jobs:
  deepeval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: |
          pip install -U deepeval
      - name: Run LLM evaluations
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: deepeval test run tests/ -c
\`\`\`

Store the evaluator API key as a repository secret, never in code. From here you can extend the pipeline to comment scores on the PR or block merges below a threshold, the same gating discipline described in our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

## Frequently Asked Questions

### What is DeepEval and how is it different from regular pytest?

DeepEval is an open-source Python framework for evaluating LLM outputs, built on top of pytest. Regular pytest checks deterministic equality, while DeepEval scores fuzzy, semantic qualities like relevancy, faithfulness, and hallucination using LLM-as-a-judge metrics. You still write test functions and run them with a familiar command, but assertions return graded scores against thresholds instead of exact matches.

### Do I need an API key to use DeepEval?

Yes, for most metrics. DeepEval's default metrics use an LLM as a judge to score outputs, so you need an API key for your chosen evaluator model such as OpenAI, Anthropic, or Azure. You can also configure local models through Ollama to avoid per-call costs. A few statistical or custom metrics can run without an external model, but the flagship metrics require one.

### How does GEval work in DeepEval?

GEval uses the LLM-as-a-judge technique with chain-of-thought reasoning to evaluate any criteria you describe in natural language. You provide a name, either a criteria string or explicit evaluation steps, and the test-case parameters it should read. GEval then produces a score between 0 and 1 with a reason. Using explicit evaluation steps instead of a single criteria string reduces judge variance and improves reliability.

### Can DeepEval test RAG applications?

Yes, DeepEval is especially strong for RAG. It provides FaithfulnessMetric to check whether answers are grounded in retrieved context, plus ContextualPrecisionMetric and ContextualRecallMetric to grade the retriever itself. Pass your retrieved chunks in the retrieval_context field and DeepEval will flag hallucinated or unsupported claims, telling you the specific statement that was not backed by the context.

### How do I run DeepEval tests in CI/CD?

Run \`deepeval test run tests/\` in your pipeline. Because the command exits with a non-zero code when any test falls below its threshold, it integrates with GitHub Actions, GitLab CI, or Jenkins like any other test step. Store your evaluator API key as a CI secret, enable caching with the \`-c\` flag to cut cost, and optionally block merges when scores regress.

### Why are my DeepEval scores slightly different each run?

Because metrics call a judge LLM, scores can vary slightly between runs due to model non-determinism. To manage this, set thresholds with a safety margin below your observed scores, use explicit evaluation steps in GEval for consistency, enable result caching so unchanged cases are not re-scored, and pin your DeepEval and model versions so behavior stays stable across environments.

### Is DeepEval free and open source?

Yes, DeepEval is open source under an Apache-style license and free to install from PyPI. The framework itself costs nothing. Your only expenses are the API calls to the judge model that powers most metrics, which you can minimize with caching, cheaper judge models, or local models via Ollama. There is also an optional hosted platform, Confident AI, for dashboards and tracking, but the core library runs fully standalone.

## Conclusion

DeepEval turns the vague goal of "make the AI outputs good" into concrete, gated, repeatable tests. By modeling every check as an \`LLMTestCase\` paired with metrics like \`AnswerRelevancyMetric\`, \`FaithfulnessMetric\`, and \`GEval\`, you get the same confidence for LLM features that unit tests give for ordinary code. Run it locally with \`deepeval test run\`, parametrize with pytest, and gate every pull request in CI so quality regressions are caught before users see them.

Start small: pick one LLM feature, write three test cases with a relevancy metric, and add them to your pipeline this week. From there, layer in faithfulness for RAG and custom GEval criteria for tone and safety. To go further and equip your AI coding agents with production-ready testing playbooks, explore the full [QA skills](/skills) directory and start building an evaluation suite your team can trust.
`,
};
