import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval Tutorial: The Pytest LLM Testing Framework (2026)',
  description:
    'Complete DeepEval guide for Python devs and SDETs: install, LLMTestCase, the metric catalog, G-Eval, RAG evals, CI with deepeval test run, vs Promptfoo & Ragas.',
  date: '2026-06-23',
  category: 'Guide',
  content: `
# DeepEval: The Pytest-Style LLM Evaluation Framework Complete Guide

If you have ever shipped a feature backed by a large language model, you already know the uncomfortable truth: the model that worked perfectly in your prompt playground starts hallucinating in production, drifts when you swap models, and quietly regresses every time a teammate "improves" the system prompt. Traditional software testing assumes deterministic outputs, so \`assert response == expected\` is useless when the same prompt can return a hundred different valid phrasings. What you actually need is a way to assert on the *quality* of an answer, not its exact bytes, and to do it in the same pytest run that already gates your pull requests. That is exactly the gap DeepEval fills.

DeepEval is an open-source Python framework that brings LLM and RAG evaluation into the pytest workflow Python developers and SDETs already live in. You write test cases that look and feel like ordinary unit tests, but instead of equality checks you attach *metrics* such as Answer Relevancy, Faithfulness, Hallucination, and custom rubric-driven G-Eval scores. Each metric returns a score between 0 and 1 and a human-readable reason, and you fail the test when the score drops below a threshold you control. Because it plugs straight into pytest, you can run evals locally, in pre-commit hooks, or in CI/CD on every commit, treating prompt regressions exactly like code regressions. This guide is a complete, runnable walkthrough: install, the core \`LLMTestCase\` object, the full metric catalog, your first eval as a pytest test, writing a custom G-Eval metric, evaluating a RAG pipeline, running everything with \`deepeval test run\` in CI, generating datasets and synthetic data, and how DeepEval compares to Promptfoo and Ragas. Every command and code block here is real Python you can paste and run.

## What DeepEval Is and Why Pytest-Native Matters

DeepEval describes itself as "Pytest for LLMs," and that framing is the entire point. There are plenty of evaluation libraries that ask you to learn a new YAML dialect, run a separate CLI, or open a hosted dashboard before you can assert anything. DeepEval instead meets Python engineers where they already are. A DeepEval test is a normal function in a \`test_*.py\` file, discovered by pytest, runnable with \`pytest\`, and reportable through every pytest plugin and CI integration you already own. The mental model is one-to-one with unit testing: arrange an input and the model's output, act by running a metric, and assert that the score clears a threshold.

This matters more than it sounds. LLM quality is not a one-time checkpoint; it is a moving target that degrades silently. Someone tweaks a prompt to fix one edge case and breaks three others. A vendor ships a new model snapshot and your faithfulness quietly drops. A retrieval change starts pulling in irrelevant context. Without automated evals wired into CI, you discover these regressions from angry users. With DeepEval, a pull request that drops Answer Relevancy below 0.7 fails the build the same way a broken type check does. That is the cultural shift DeepEval enables: LLM behavior becomes a testable, gateable, regressible part of your codebase rather than a vibe you spot-check in a notebook. If you are mapping the broader landscape of agent and model testing skills, the [QA skills directory](/skills) catalogs the tools and practices that pair well with DeepEval.

## Installing DeepEval

DeepEval installs from PyPI like any other Python package. It targets Python 3.9 and above and pulls in its own dependencies for metrics, dataset handling, and the pytest integration.

\`\`\`bash
pip install deepeval
\`\`\`

Most metrics are *LLM-as-judge* metrics, meaning they use a model to grade your model's output. By default DeepEval uses OpenAI, so the fastest path to a working eval is to export a key:

\`\`\`bash
export OPENAI_API_KEY="sk-your-key-here"
\`\`\`

You are not locked into OpenAI. DeepEval supports Anthropic, Azure OpenAI, Google Gemini, Ollama, and any custom model you wrap in its \`DeepEvalBaseLLM\` interface, so you can run judges locally or against whatever provider your org already pays for. Optionally, you can log in to the Confident AI platform for a hosted dashboard of historical eval runs, but it is entirely optional and the framework works fully offline:

\`\`\`bash
deepeval login
\`\`\`

Verify the install with the CLI, which is bundled with the package:

\`\`\`bash
deepeval --help
\`\`\`

## Core Concepts: LLMTestCase, Metrics, and evaluate

Three objects do almost all the work in DeepEval, and understanding them is most of understanding the framework.

The **\`LLMTestCase\`** is the unit of evaluation. It captures one interaction with your system. Its most important fields are \`input\` (what the user asked), \`actual_output\` (what your LLM application returned), \`expected_output\` (an optional reference answer), \`retrieval_context\` (the chunks your RAG retriever pulled, as a list of strings), and \`context\` (the ground-truth context the answer should be based on). Not every metric needs every field; an Answer Relevancy metric only needs \`input\` and \`actual_output\`, while Faithfulness additionally needs \`retrieval_context\`.

A **metric** is a scorer. Each metric takes a test case, computes a float score between 0 and 1, compares it to a \`threshold\`, and exposes a \`reason\` string explaining the verdict. Metrics are objects you configure with a model and a threshold, then call \`.measure(test_case)\` on, or hand to a runner. Because most are LLM-as-judge metrics, the same metric can be backed by GPT-4o, Claude, or a local model depending on how you instantiate it.

The **\`evaluate\`** function (and its pytest twin \`assert_test\`) is the runner that ties them together. You pass it test cases and a list of metrics, and it runs every metric against every case, aggregates results, and reports pass/fail. Here is the minimal standalone version, useful in a script or notebook before you formalize things into pytest:

\`\`\`python
from deepeval import evaluate
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric

test_case = LLMTestCase(
    input="What is the capital of France?",
    actual_output="The capital of France is Paris.",
)

metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o")

evaluate(test_cases=[test_case], metrics=[metric])
\`\`\`

## The DeepEval Metric Catalog

DeepEval ships a deep catalog of ready-made metrics, and the practical skill is knowing which one answers which question. Broadly they split into single-turn output-quality metrics, RAG-specific metrics that require a \`retrieval_context\`, safety metrics, and the configurable G-Eval and DAG metrics you author yourself. The table below maps the most-used metrics to what they measure and whether they need retrieval context.

| Metric | What it measures | Needs retrieval context? |
|---|---|---|
| Answer Relevancy | How directly the output addresses the input question | No |
| Faithfulness | Whether the output is grounded in (not contradicting) the retrieved context | Yes |
| Hallucination | Whether the output contradicts the provided ground-truth context | Yes (uses \`context\`) |
| Contextual Precision | Whether relevant retrieved chunks rank above irrelevant ones | Yes |
| Contextual Recall | Whether the retriever fetched all the context needed to answer | Yes |
| Contextual Relevancy | What fraction of retrieved context is actually relevant | Yes |
| Bias | Whether the output contains gender, racial, or political bias | No |
| Toxicity | Whether the output contains harmful or toxic language | No |
| G-Eval (custom) | Any criterion you describe in plain English, rubric-scored | Optional |
| DAG (custom) | Deterministic decision-tree scoring built from G-Eval nodes | Optional |
| Summarization | Whether a summary is both aligned with and inclusive of the source | No |
| Task Completion | Whether an agent actually accomplished the user's task | No |

The RAG triad of Faithfulness, Contextual Precision, and Contextual Recall deserves special attention because together they let you debug *where* a RAG failure lives: a low Contextual Recall points at the retriever missing documents, low Faithfulness points at the generator ignoring or contradicting what was retrieved, and low Answer Relevancy points at a generation that wandered off-topic. For a deeper treatment of these scores and the math behind them, see the [RAG evaluation metrics complete guide](/blog/rag-evaluation-metrics-complete-2026).

## Writing Your First Eval as a Pytest Test

The standalone \`evaluate\` call is fine for exploration, but the real power shows up when you write evals as pytest tests using \`assert_test\`. This is the function that makes DeepEval feel like ordinary testing: it runs the metrics, and if any score is below its threshold, it raises an assertion error that fails the test. Save the following as \`test_chatbot.py\`:

\`\`\`python
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric, BiasMetric


def test_capital_question():
    test_case = LLMTestCase(
        input="What is the capital of France?",
        actual_output="Paris is the capital and most populous city of France.",
    )
    relevancy = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o")
    bias = BiasMetric(threshold=0.5, model="gpt-4o")
    assert_test(test_case, [relevancy, bias])


@pytest.mark.parametrize(
    "question, answer",
    [
        ("What is 2 + 2?", "2 plus 2 equals 4."),
        ("Who wrote Hamlet?", "Hamlet was written by William Shakespeare."),
    ],
)
def test_factual_answers(question, answer):
    test_case = LLMTestCase(input=question, actual_output=answer)
    metric = AnswerRelevancyMetric(threshold=0.7)
    assert_test(test_case, [metric])
\`\`\`

Notice that the second test uses ordinary \`@pytest.mark.parametrize\` to run the same eval across multiple input/output pairs. Every pytest feature you know still applies: fixtures, markers, \`-k\` filtering, \`xfail\`, parallelization with \`pytest-xdist\`. In real applications you would not hard-code \`actual_output\`; you would call your actual LLM application inside the test so the eval grades live behavior, like \`actual_output = my_chatbot(question)\`. That single line is what turns DeepEval from a static checker into a regression gate on your real system.

## Writing a Custom G-Eval Metric

The built-in metrics cover common cases, but every product has quality criteria nobody else does. Maybe your support bot must always include a ticket number, must never promise refunds it cannot authorize, or must match your brand's tone. G-Eval is DeepEval's answer: a research-backed, LLM-as-judge metric where you describe the criterion in plain English and optionally list explicit evaluation steps, and the judge model scores against your rubric. It is the single most useful metric in the catalog because it is infinitely customizable.

\`\`\`python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

professionalism = GEval(
    name="Professionalism",
    criteria=(
        "Determine whether the actual output is written in a professional, "
        "courteous tone and never uses slang, insults, or dismissive language."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.8,
    model="gpt-4o",
)

correctness = GEval(
    name="Correctness",
    criteria="Decide if the actual output is factually consistent with the expected output.",
    evaluation_steps=[
        "Compare the factual claims in 'actual output' against 'expected output'.",
        "Heavily penalize any contradiction of facts in 'expected output'.",
        "Vague or extra non-contradicting detail is acceptable and should not be penalized.",
    ],
    evaluation_params=[
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
)

test_case = LLMTestCase(
    input="Can I get a refund?",
    actual_output="I'd be happy to help. Refunds are processed within 5 business days.",
    expected_output="Refunds are issued within 5 business days of an approved request.",
)

professionalism.measure(test_case)
print(professionalism.score, professionalism.reason)
\`\`\`

The choice between \`criteria\` (a single sentence the judge reasons about freely) and \`evaluation_steps\` (an explicit checklist) is a tradeoff between flexibility and determinism. For high-stakes metrics you want repeatable, use \`evaluation_steps\` so the judge follows the same reasoning every time. For exploratory or fuzzy criteria, a one-line \`criteria\` is faster to write. When you need fully deterministic, branching logic, DeepEval also offers the DAG metric, which composes G-Eval nodes into a decision tree.

## RAG Evaluation with DeepEval

Retrieval-augmented generation is where DeepEval earns its keep, because a RAG bug can live in either the retriever or the generator and a single quality number cannot tell you which. The fix is to populate \`retrieval_context\` on your test case and attach the RAG triad of metrics so each component is graded separately. Here is a realistic RAG eval where the answer and the retrieved chunks both feed the metrics:

\`\`\`python
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    FaithfulnessMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    AnswerRelevancyMetric,
)


def test_rag_pipeline():
    query = "What is the refund window for digital products?"

    # In production these come from your retriever + generator:
    retrieved_chunks = [
        "Digital products may be refunded within 14 days of purchase.",
        "Physical goods carry a 30-day return policy.",
    ]
    generated_answer = "Digital products can be refunded within 14 days of purchase."

    test_case = LLMTestCase(
        input=query,
        actual_output=generated_answer,
        expected_output="Digital products are refundable within 14 days.",
        retrieval_context=retrieved_chunks,
    )

    metrics = [
        AnswerRelevancyMetric(threshold=0.7),
        FaithfulnessMetric(threshold=0.7),
        ContextualPrecisionMetric(threshold=0.7),
        ContextualRecallMetric(threshold=0.7),
    ]
    assert_test(test_case, metrics)
\`\`\`

Read the failures diagnostically. If Contextual Recall fails, your retriever did not fetch the chunk that contained the answer, so improve chunking, embeddings, or top-k. If Faithfulness fails while recall passes, the generator had the right context but produced an unsupported or contradictory claim, so tighten the prompt or lower temperature. If Answer Relevancy fails while faithfulness passes, the model is grounded but rambling off-topic. This component-level signal is exactly what a single end-to-end score hides.

## Running DeepEval in CI/CD

Because DeepEval tests are pytest tests, you can run them with plain \`pytest\`. But DeepEval also ships its own runner, \`deepeval test run\`, which wraps pytest and adds eval-specific features: caching of LLM judge calls so unchanged cases are not re-graded, parallel execution, and richer reporting that aggregates scores across the suite.

\`\`\`bash
deepeval test run test_chatbot.py
\`\`\`

\`\`\`bash
# Run several files in parallel with 4 workers and cache repeated judgments
deepeval test run test_chatbot.py test_rag.py -n 4 -c
\`\`\`

Wiring this into GitHub Actions takes a few lines. The key gotcha is that LLM-as-judge metrics cost API calls and money, so most teams run a fast, cheap subset on every pull request and a fuller suite nightly or on merges to main:

\`\`\`yaml
name: LLM Evals
on: [pull_request]
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install deepeval
      - name: Run DeepEval
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: deepeval test run tests/ -n 2 -c
\`\`\`

A failing eval now fails the build, blocking the merge, exactly like a failing unit test. To control flakiness from the stochastic judge, set thresholds conservatively at first, run each critical case a couple of times, and rely on the \`-c\` cache so deterministic cases do not re-spend tokens. For the bigger picture of gating AI-touched code in pipelines, see the guide on [security testing AI-generated code](/blog/security-testing-ai-generated-code).

## Datasets and Synthetic Data

Evaluating a handful of hand-written cases is a good start, but real confidence comes from breadth. DeepEval provides an \`EvaluationDataset\` to manage many \`LLMTestCase\` (or input-only \`Golden\`) objects and run all your metrics across them at once. You can build a dataset in code, load it from CSV or JSON, or pull it from the Confident AI platform.

\`\`\`python
from deepeval.dataset import EvaluationDataset
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric

dataset = EvaluationDataset(
    test_cases=[
        LLMTestCase(input="What is the capital of Japan?", actual_output="Tokyo."),
        LLMTestCase(input="What is the capital of Italy?", actual_output="Rome."),
        LLMTestCase(input="What is the capital of Spain?", actual_output="Madrid."),
    ]
)

dataset.evaluate([AnswerRelevancyMetric(threshold=0.7)])
\`\`\`

You can also iterate a dataset inside pytest so each case becomes its own test, which gives you per-case pass/fail in the test report:

\`\`\`python
from deepeval import assert_test
from deepeval.dataset import EvaluationDataset
from deepeval.metrics import AnswerRelevancyMetric

dataset = EvaluationDataset()
dataset.pull(alias="qa-regression-set")  # from Confident AI, or load_csv / add_test_case


@pytest.mark.parametrize("test_case", dataset)
def test_dataset(test_case):
    assert_test(test_case, [AnswerRelevancyMetric(threshold=0.7)])
\`\`\`

Hand-authoring hundreds of cases is tedious, so DeepEval includes a \`Synthesizer\` that generates test inputs (Goldens) from your own documents or context. This is enormously valuable for RAG, where you want questions grounded in your real knowledge base rather than invented ones:

\`\`\`python
from deepeval.synthesizer import Synthesizer

synthesizer = Synthesizer(model="gpt-4o")
goldens = synthesizer.generate_goldens_from_docs(
    document_paths=["knowledge_base/refund_policy.pdf", "knowledge_base/faq.md"],
)

for golden in goldens:
    print(golden.input)
\`\`\`

The synthesizer can evolve questions to be more complex, multi-hop, or adversarial, giving you a far harder test set than you would write by hand and surfacing failure modes you never thought to probe.

## DeepEval vs Promptfoo vs Ragas

DeepEval is not the only option, and the right choice depends on your stack and who is writing the evals. Promptfoo is a YAML-and-CLI-first tool that excels at side-by-side prompt and model comparison and is friendly to non-Python users, but it lives outside the pytest ecosystem. Ragas is a focused, research-grade library specifically for RAG metrics with strong academic backing, but it is narrower and less of an all-in-one testing framework. DeepEval's pitch is breadth plus pytest-native ergonomics: the widest metric catalog, custom G-Eval, datasets, synthetic data, and red-teaming, all inside the Python test runner you already use.

| Dimension | DeepEval | Promptfoo | Ragas |
|---|---|---|---|
| Primary interface | Python / pytest | YAML + CLI | Python library |
| Best for | Python teams gating LLM quality in CI | Prompt/model A/B comparison | Deep RAG metric research |
| Metric breadth | Very wide (40+ incl. custom G-Eval) | Wide, assertion-style | RAG-focused |
| Custom metrics | G-Eval and DAG, plain-English | JS/Python assertions | Custom but lower-level |
| RAG triad metrics | Yes (built in) | Via plugins | Yes (its specialty) |
| Synthetic data | Yes (Synthesizer) | Limited | Yes (test set generation) |
| Pytest integration | Native (\`assert_test\`) | No (own CLI) | Manual |
| Best fit user | SDETs and Python devs | PMs, prompt engineers | ML/RAG researchers |

In practice many teams use more than one: Promptfoo for quick prompt bake-offs during development, DeepEval for the regression gate in CI. For a head-to-head focused specifically on the two leading frameworks, read [Promptfoo vs DeepEval](/blog/promptfoo-vs-deepeval-2026), and if your stack is OpenAI-centric, the [OpenAI Evals complete guide](/blog/openai-evals-complete-guide-2026) covers that platform's native approach.

## Common Pitfalls

The most common mistake is treating LLM-as-judge scores as ground truth. The judge is itself a model and can be wrong, biased, or inconsistent run to run. Mitigate this by using a strong judge model, writing explicit \`evaluation_steps\` for high-stakes metrics, and validating that your judge agrees with human labels on a sample before trusting it at scale.

The second pitfall is forgetting the cost. Every metric is one or more LLM calls, and a large dataset times several metrics times a CI run on every commit adds up fast. Use the \`-c\` cache, run a small smoke suite on pull requests and the full suite less often, and prefer cheaper judge models where the criterion is simple.

Third, teams set thresholds blindly. A threshold of 0.9 on a noisy metric will flap red and green and erode trust in the suite. Calibrate thresholds against real, labeled data first, then tighten them over time as you improve the system. Finally, do not forget to put your *actual application* in the loop. An eval that grades hard-coded strings tests nothing; the \`actual_output\` must come from a live call to the system you are trying to protect.

## Best Practices

Start small and grow the suite. Begin with five to ten high-value cases and the two or three metrics that matter most for your product, get them green and stable, then expand with synthetic data. Keep evals deterministic where you can: pin your judge model version, set temperature to zero on the system under test when the task is factual, and use \`evaluation_steps\` so judging is reproducible.

Separate component metrics from end-to-end metrics, especially for RAG, so a failure tells you where to look. Run the cheap, fast subset on every pull request as a gate, and the expensive, comprehensive suite on a schedule. Version your datasets alongside your code so you can diff how quality changed across releases, and store the \`reason\` strings the metrics emit because they are gold for debugging exactly why a case failed. Most importantly, treat these evals as living tests: when production surfaces a new failure mode, capture it as a new \`LLMTestCase\` so the bug can never silently come back. That is the same discipline behind regression testing in any mature codebase, now applied to your model.

## Frequently Asked Questions

### What is DeepEval used for?

DeepEval is an open-source Python framework for evaluating LLM and RAG applications using pytest-style tests. Instead of exact-match assertions, you attach metrics like Answer Relevancy, Faithfulness, Hallucination, and custom G-Eval scores to test cases, fail when scores drop below a threshold, and run the whole thing in CI to catch quality regressions automatically on every commit.

### Is DeepEval free and open source?

Yes. DeepEval is open source and free to install with \`pip install deepeval\`, and it runs fully offline against your own models. There is an optional companion platform, Confident AI, that adds a hosted dashboard for tracking eval history and managing datasets, but you never need it to use the framework. All metrics and the pytest integration work without any paid account.

### Does DeepEval require OpenAI?

No. OpenAI is the default judge provider, so it is the quickest start, but DeepEval supports Anthropic, Azure OpenAI, Google Gemini, local models through Ollama, and any custom model you wrap in its \`DeepEvalBaseLLM\` interface. You can run the LLM-as-judge metrics entirely on local or self-hosted models if you want to avoid sending data to a third-party API.

### How is DeepEval different from Ragas?

Ragas is a focused library specializing in RAG evaluation metrics with strong research backing, while DeepEval is a broader all-in-one testing framework. DeepEval covers RAG metrics too, plus custom G-Eval, safety metrics, datasets, synthetic data, and native pytest integration. If you only need RAG metrics in a Python notebook, Ragas is lean; if you want to gate LLM quality in CI like unit tests, DeepEval fits better.

### What does the deepeval test run command do?

\`deepeval test run\` is DeepEval's own runner that wraps pytest and adds evaluation-specific features. It discovers and executes your \`assert_test\` cases, runs metrics in parallel with the \`-n\` flag, caches LLM judge results with \`-c\` so unchanged cases are not re-graded or re-billed, and produces aggregated score reporting. You can still run the same tests with plain \`pytest\`, but the dedicated runner adds caching and richer eval output.

### Can DeepEval run in a CI/CD pipeline?

Yes, and that is its core use case. Because tests are ordinary pytest functions, you add a job that pip-installs DeepEval, sets your judge API key as a secret, and runs \`deepeval test run\`. A score below threshold fails the build and blocks the merge, just like a failing unit test. Teams typically run a cheap smoke subset on pull requests and a fuller suite nightly to manage API cost.

### What is a G-Eval metric in DeepEval?

G-Eval is a research-backed, LLM-as-judge metric where you define the evaluation criterion in plain English, optionally as explicit step-by-step instructions, and a judge model scores the output against your rubric from 0 to 1. It lets you measure product-specific qualities the built-in metrics do not cover, such as tone, brand voice, or whether a required disclaimer appears, without writing any scoring code yourself.

### How do I evaluate a RAG pipeline with DeepEval?

Populate the \`retrieval_context\` field on your \`LLMTestCase\` with the chunks your retriever returned, then attach the RAG triad: Contextual Recall and Contextual Precision grade the retriever, Faithfulness grades whether the generation stays grounded in that context, and Answer Relevancy grades whether the answer addresses the question. Reading which of these fails tells you whether the bug is in retrieval or generation.

## Conclusion

DeepEval turns the slippery problem of LLM quality into something an engineering team can actually manage: testable, gateable, and regressible inside the pytest workflow you already trust. By writing evals as ordinary tests, attaching metrics like Answer Relevancy, Faithfulness, and custom G-Eval rubrics, and running \`deepeval test run\` in CI, you stop discovering prompt regressions from angry users and start catching them in pull requests. Begin with a handful of high-value cases, calibrate your thresholds against real data, grow the suite with synthetic data, and read RAG failures component by component. The result is LLM behavior that fails the build when it breaks, exactly like every other part of your codebase should.

Ready to build out a full AI-quality testing practice? Explore the [QASkills directory](/skills) for curated skills and tools that pair with DeepEval, and dig deeper with the [RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026) and the [Promptfoo vs DeepEval comparison](/blog/promptfoo-vs-deepeval-2026).
`,
};
