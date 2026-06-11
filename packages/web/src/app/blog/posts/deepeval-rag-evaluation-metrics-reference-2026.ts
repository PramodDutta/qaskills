import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval RAG Evaluation Metrics Complete Reference 2026',
  description:
    'Complete DeepEval RAG evaluation metrics reference: answer relevancy, faithfulness, contextual precision, recall, relevancy, plus runnable pytest code.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# DeepEval RAG Evaluation Metrics Complete Reference 2026

Retrieval-augmented generation (RAG) is the most common production pattern for large language model (LLM) applications, and DeepEval ships a focused, research-backed suite of RAG-specific metrics that let you score every part of the pipeline: the retriever, the reranker, and the generator. This reference is the RAG-specific companion to the broader [DeepEval metrics complete guide](/blog/deepeval-metrics-complete-guide-2026). Where that guide surveys all 50+ metrics across agents, safety, and conversation, this page drills into exactly five metrics that matter for RAG quality and shows you precisely which field of the \`LLMTestCase\` each one reads.

The five RAG metrics are \`AnswerRelevancyMetric\`, \`FaithfulnessMetric\`, \`ContextualPrecisionMetric\`, \`ContextualRecallMetric\`, and \`ContextualRelevancyMetric\`. The first two evaluate the generator (the LLM that writes the final answer), and the last three evaluate the retriever (the system that fetches context). Understanding this split is the single most useful mental model for debugging a RAG system: a low faithfulness score points to a hallucinating generator, while a low contextual recall score points to a retriever that is missing relevant chunks. DeepEval computes all of these with LLM-as-a-judge scoring, returns a 0-to-1 score, compares it against a threshold you set, and can emit a natural-language reason explaining the verdict.

This reference is written for QA engineers, ML engineers, and developers who want a single place to look up what each RAG metric measures, which \`LLMTestCase\` fields it requires, how thresholds and \`include_reason\` work, and how to run everything as a Pytest suite via \`deepeval test run\`. Every code block is real, runnable Python. By the end you will be able to wire a RAG quality gate into continuous integration (CI) and know exactly which metric to read when a regression appears.

## Installing DeepEval and Choosing the Judge Model

DeepEval is a pure Python package. Install it with pip, which also gives you the Pytest plugin and the \`deepeval\` command-line interface (CLI).

\`\`\`bash
pip install -U deepeval pytest
\`\`\`

Every RAG metric in this reference uses an LLM as the judge. By default DeepEval calls OpenAI, so the fastest path is to export your API key:

\`\`\`bash
export OPENAI_API_KEY="sk-..."
\`\`\`

You can pin the judge model per metric with the \`model\` argument. Use a strong reasoning model (such as \`gpt-4o\` or \`gpt-4.1\`) for the judge so that the relevancy and faithfulness verdicts are reliable; the model under evaluation can be anything, including a small open-weights model. The judge and the model under test are independent — DeepEval never assumes they are the same.

\`\`\`python
from deepeval.metrics import AnswerRelevancyMetric

metric = AnswerRelevancyMetric(
    threshold=0.7,
    model="gpt-4o",        # the judge model
    include_reason=True,
)
\`\`\`

If you prefer a non-OpenAI judge, DeepEval supports Anthropic, Google, Azure, Ollama, and any custom model through its \`DeepEvalBaseLLM\` interface. Set it once via the CLI (for example \`deepeval set-ollama llama3\`) or pass a model instance to each metric. Choosing a capable judge is the most important reliability decision you make, because every score in this reference is ultimately an LLM judgment.

## The LLMTestCase: The Object Every RAG Metric Reads

Everything in DeepEval revolves around the \`LLMTestCase\`. For RAG you populate four fields, and each metric reads a specific subset. Getting these fields right is the whole game — a metric that looks like it is failing is often just being fed the wrong field.

\`\`\`python
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="What is the capital of France and when was the Eiffel Tower built?",
    actual_output="Paris is the capital of France. The Eiffel Tower was completed in 1889.",
    expected_output="Paris; the Eiffel Tower was completed in 1889.",
    retrieval_context=[
        "Paris is the capital and most populous city of France.",
        "The Eiffel Tower was completed in March 1889 for the World's Fair.",
    ],
)
\`\`\`

The \`input\` is the user's query. The \`actual_output\` is exactly what your RAG application returned. The \`retrieval_context\` is the list of text chunks your retriever fetched and fed to the generator — this is the field that makes a test case a RAG test case. The \`expected_output\` is the ideal or reference answer; it is only needed by metrics that compare against a gold answer (contextual precision and contextual recall use it as the relevance anchor).

### LLMTestCase Field Reference

| Field | Type | Required by | What it represents |
|---|---|---|---|
| \`input\` | str | All five RAG metrics | The user query sent to the RAG app |
| \`actual_output\` | str | AnswerRelevancy, Faithfulness | The answer your app actually produced |
| \`expected_output\` | str | ContextualPrecision, ContextualRecall | The reference / gold answer |
| \`retrieval_context\` | list[str] | All five RAG metrics | The chunks the retriever returned |
| \`context\` | list[str] | (optional, gold context) | Ideal context, used by some non-RAG metrics |

A common mistake is confusing \`retrieval_context\` (what was actually retrieved at runtime) with \`context\` (the ideal ground-truth context). For RAG evaluation you almost always want \`retrieval_context\`, because the entire point is to measure how well your live retriever performed.

## RAG Metric Reference Table

Before the deep dives, here is the at-a-glance table that maps each metric to the component it evaluates and the fields it consumes.

| Metric | Evaluates | Reads fields | What a low score means |
|---|---|---|---|
| \`AnswerRelevancyMetric\` | Generator | input, actual_output | The answer drifts off-topic or is padded with irrelevant text |
| \`FaithfulnessMetric\` | Generator | actual_output, retrieval_context | The answer hallucinates claims not supported by the context |
| \`ContextualPrecisionMetric\` | Retriever (ranking) | input, expected_output, retrieval_context | Relevant chunks are buried below irrelevant ones |
| \`ContextualRecallMetric\` | Retriever (coverage) | input, expected_output, retrieval_context | The retriever missed chunks needed to answer fully |
| \`ContextualRelevancyMetric\` | Retriever (signal-to-noise) | input, retrieval_context | Too much irrelevant context was retrieved |

Read this table as two columns of responsibility. If \`FaithfulnessMetric\` and \`AnswerRelevancyMetric\` are healthy but answers are still wrong, the retriever is the culprit and you should look at the three contextual metrics. If the contextual metrics are healthy but answers are wrong, the generator is the culprit.

## AnswerRelevancyMetric: Is the Answer On-Topic?

\`AnswerRelevancyMetric\` measures whether the \`actual_output\` actually addresses the \`input\`. The judge breaks the answer into individual statements, decides which ones are relevant to the question, and scores the ratio. It does not check whether the answer is correct or grounded — only whether it is on-topic and free of filler.

\`\`\`python
from deepeval import evaluate
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="How do I reset my password?",
    actual_output=(
        "Click 'Forgot password' on the login screen, enter your email, "
        "and follow the reset link. By the way, our app also has a dark mode."
    ),
    retrieval_context=["To reset a password, use the 'Forgot password' link on login."],
)

metric = AnswerRelevancyMetric(threshold=0.7, include_reason=True)
metric.measure(test_case)

print(metric.score)   # e.g. 0.5 — the dark-mode sentence is irrelevant
print(metric.reason)  # explains the off-topic statement dragged the score down
\`\`\`

The dark-mode aside is irrelevant to a password-reset question, so the score drops. This is exactly what you want a relevancy metric to catch: verbose, padded answers that technically contain the right information but bury it in noise.

## FaithfulnessMetric: Is the Answer Grounded in the Context?

\`FaithfulnessMetric\` is the anti-hallucination metric. It extracts every factual claim from \`actual_output\` and checks each one against \`retrieval_context\`. A claim that cannot be supported by the retrieved chunks is a hallucination and lowers the score. Crucially, faithfulness ignores \`expected_output\` entirely — it only cares whether the answer is consistent with what was retrieved.

\`\`\`python
from deepeval.metrics import FaithfulnessMetric
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="When was the Eiffel Tower built?",
    actual_output="The Eiffel Tower was completed in 1889 and is 450 meters tall.",
    retrieval_context=[
        "The Eiffel Tower was completed in March 1889.",
        "The Eiffel Tower stands about 330 meters tall.",
    ],
)

metric = FaithfulnessMetric(threshold=0.8, include_reason=True)
metric.measure(test_case)

print(metric.score)   # < 1.0 — "450 meters" contradicts the context
print(metric.reason)  # flags the unsupported height claim
\`\`\`

The completion year is faithful, but the 450-meter height contradicts the retrieved context (which says 330 meters), so faithfulness drops. Pair faithfulness with answer relevancy and you have a complete picture of generator quality. For a wider treatment of grounding and hallucination across other frameworks, see the [LLM guardrails testing guide](/blog/llm-guardrails-testing-guide-2026).

## ContextualPrecisionMetric: Are the Best Chunks Ranked First?

\`ContextualPrecisionMetric\` evaluates retriever ranking. Using \`expected_output\` as the anchor for what is relevant, it checks whether the chunks in \`retrieval_context\` that are relevant appear before the irrelevant ones. A reranker that pushes the most useful chunk to position one will score high; a retriever that returns the right chunk at position five will score lower.

\`\`\`python
from deepeval.metrics import ContextualPrecisionMetric
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="What is the refund window?",
    actual_output="You can request a refund within 30 days of purchase.",
    expected_output="Refunds are allowed within 30 days.",
    retrieval_context=[
        "Our office is open Monday to Friday.",          # irrelevant, ranked first
        "Refunds are accepted within 30 days of purchase.",  # relevant, ranked second
    ],
)

metric = ContextualPrecisionMetric(threshold=0.7, include_reason=True)
metric.measure(test_case)

print(metric.score)   # penalized — the relevant chunk is ranked below noise
print(metric.reason)
\`\`\`

Because the relevant chunk is ranked below an irrelevant one, precision is penalized. This metric is your signal that a reranking layer would help.

## ContextualRecallMetric: Did the Retriever Find Everything?

\`ContextualRecallMetric\` measures coverage. It takes the \`expected_output\`, breaks it into the facts needed to produce it, and checks how many of those facts are actually present somewhere in \`retrieval_context\`. A high recall score means the retriever found all the information needed; a low score means it missed chunks, and no amount of generator quality can recover the missing facts.

\`\`\`python
from deepeval.metrics import ContextualRecallMetric
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="What payment methods and currencies do you support?",
    actual_output="We accept Visa and Mastercard in USD.",
    expected_output="We accept Visa, Mastercard, and PayPal, in USD and EUR.",
    retrieval_context=[
        "We accept Visa and Mastercard.",
        "Payments are processed in USD.",
        # Missing: PayPal and EUR support were never retrieved
    ],
)

metric = ContextualRecallMetric(threshold=0.7, include_reason=True)
metric.measure(test_case)

print(metric.score)   # low — PayPal and EUR facts are absent from the context
print(metric.reason)
\`\`\`

Recall and precision are complementary: precision asks "is the relevant context ranked well?" while recall asks "is all the relevant context even present?" You want both high.

## ContextualRelevancyMetric: How Much of the Context Was Noise?

\`ContextualRelevancyMetric\` measures the signal-to-noise ratio of the retrieved context. It judges what fraction of the statements across all chunks in \`retrieval_context\` are actually relevant to the \`input\`. Unlike precision, it does not need \`expected_output\` — it judges relevance directly against the query. A low score means your retriever is dumping too much irrelevant text into the prompt, which wastes tokens and can confuse the generator.

\`\`\`python
from deepeval.metrics import ContextualRelevancyMetric
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="What is your return policy?",
    actual_output="Returns are accepted within 30 days.",
    retrieval_context=[
        "Returns are accepted within 30 days of delivery.",
        "Our company was founded in 2011 in Berlin.",   # irrelevant noise
        "We ship to over 40 countries worldwide.",       # irrelevant noise
    ],
)

metric = ContextualRelevancyMetric(threshold=0.6, include_reason=True)
metric.measure(test_case)

print(metric.score)   # ~0.33 — only one of three chunks is relevant
print(metric.reason)
\`\`\`

This metric is the one to watch when your token bills climb or when a model gets distracted by irrelevant context. Tightening your retriever's top-k or adding a relevance filter directly improves this score.

## Thresholds, include_reason, and Reading the Verdict

Every metric takes a \`threshold\` between 0 and 1. After \`measure()\` runs, the metric exposes \`score\` (the computed 0-to-1 value), \`success\` (a boolean of whether \`score >= threshold\`), and — when \`include_reason=True\` — a \`reason\` string. The \`include_reason\` flag costs an extra LLM call but is invaluable in CI logs because it tells you *why* a test failed in plain English instead of leaving you with a bare number.

\`\`\`python
metric = FaithfulnessMetric(threshold=0.8, include_reason=True)
metric.measure(test_case)

print(metric.score)    # 0.0 - 1.0
print(metric.success)  # True if score >= 0.8
print(metric.reason)   # human-readable explanation (because include_reason=True)
\`\`\`

Set thresholds based on the cost of failure. A customer-facing legal or medical RAG system might demand faithfulness at 0.9, while an internal documentation bot might be fine at 0.7. Calibrate by running a baseline set of known-good and known-bad answers and observing where the scores land.

## Running RAG Metrics as a Pytest Suite

DeepEval's killer feature for QA teams is that it runs as Pytest. You write an \`assert_test\` call inside a normal test function and execute the whole suite with \`deepeval test run\`, which adds caching, parallelism, and a results dashboard on top of plain Pytest.

\`\`\`python
# test_rag.py
import pytest
from deepeval import assert_test
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualRecallMetric,
)
from deepeval.test_case import LLMTestCase

@pytest.mark.parametrize(
    "query,answer,expected,context",
    [
        (
            "What is the capital of France?",
            "Paris is the capital of France.",
            "Paris.",
            ["Paris is the capital of France."],
        ),
    ],
)
def test_rag_pipeline(query, answer, expected, context):
    test_case = LLMTestCase(
        input=query,
        actual_output=answer,
        expected_output=expected,
        retrieval_context=context,
    )
    assert_test(
        test_case,
        metrics=[
            AnswerRelevancyMetric(threshold=0.7),
            FaithfulnessMetric(threshold=0.8),
            ContextualRecallMetric(threshold=0.7),
        ],
    )
\`\`\`

Run it with the DeepEval CLI, which is a drop-in superset of \`pytest\`:

\`\`\`bash
deepeval test run test_rag.py
\`\`\`

The CLI prints a per-metric pass/fail table, caches identical test cases to save tokens on re-runs, and can run cases concurrently with \`-n\`. Because it is Pytest under the hood, it slots straight into any CI pipeline that already runs Python tests. This is the same workflow QA teams use for traditional automation, just with LLM-judged assertions instead of string equality.

## evaluate() for Bulk and Notebook Runs

When you are exploring in a notebook or scoring a large batch outside of CI, use \`evaluate()\` instead of \`assert_test\`. It takes a list of test cases and a list of metrics, runs everything, and returns structured results without raising on failure — ideal for dashboards and offline analysis.

\`\`\`python
from deepeval import evaluate
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

cases = [
    LLMTestCase(
        input="When was the Eiffel Tower built?",
        actual_output="It was completed in 1889.",
        retrieval_context=["The Eiffel Tower was completed in March 1889."],
    ),
    LLMTestCase(
        input="Where is the Louvre?",
        actual_output="The Louvre is in Paris.",
        retrieval_context=["The Louvre Museum is located in Paris, France."],
    ),
]

results = evaluate(
    test_cases=cases,
    metrics=[AnswerRelevancyMetric(threshold=0.7), FaithfulnessMetric(threshold=0.8)],
)
\`\`\`

The returned object contains per-case, per-metric scores and reasons that you can serialize to JSON, push to a dashboard, or diff against a previous run to detect regressions.

## G-Eval: Custom RAG Criteria the Five Metrics Do Not Cover

Sometimes none of the five built-in RAG metrics captures what you care about — for example, "does the answer cite the source document?" or "is the tone appropriate for a legal context?" That is where \`GEval\` comes in. G-Eval is a research-backed framework that turns a plain-English criterion into a scored metric using chain-of-thought evaluation. You define the criteria and which \`LLMTestCase\` fields it should consider, and DeepEval handles the judging.

\`\`\`python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

citation_metric = GEval(
    name="Citation Faithfulness",
    criteria=(
        "Determine whether the actual output only makes claims that are "
        "directly supported by the retrieval context, and whether it avoids "
        "introducing any outside information."
    ),
    evaluation_params=[
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.RETRIEVAL_CONTEXT,
    ],
    threshold=0.8,
)

test_case = LLMTestCase(
    input="What is the warranty period?",
    actual_output="The warranty lasts 24 months from purchase.",
    retrieval_context=["Products carry a 24-month warranty from the purchase date."],
)

citation_metric.measure(test_case)
print(citation_metric.score, citation_metric.reason)
\`\`\`

G-Eval is the escape hatch that makes DeepEval's RAG coverage open-ended: anything you can describe in a sentence, you can score. Browse ready-made evaluation patterns in the [QA skills directory](/skills) to bootstrap your own criteria.

## Frequently Asked Questions

### What is the difference between faithfulness and answer relevancy in DeepEval?

Faithfulness checks whether the answer's claims are supported by the retrieved context, catching hallucinations. Answer relevancy checks whether the answer stays on-topic for the question, catching padding and drift. A response can be perfectly faithful yet irrelevant, or perfectly relevant yet hallucinated, so production RAG suites run both metrics together for full generator coverage.

### Which DeepEval metrics need expected_output?

ContextualPrecisionMetric and ContextualRecallMetric both require \`expected_output\` because they use the gold answer as the anchor for what counts as relevant context. AnswerRelevancyMetric, FaithfulnessMetric, and ContextualRelevancyMetric do not need it — they judge against the input and retrieval context directly, which makes them usable even when you have no labeled reference answers.

### How do contextual precision and contextual recall differ?

Contextual precision measures ranking quality: are the relevant chunks placed before the irrelevant ones in the retrieval context? Contextual recall measures coverage: did the retriever fetch every chunk needed to fully answer the question? Precision points to a reranking problem, while recall points to a retrieval-coverage problem. You want both scores high for a healthy retriever.

### How do I run DeepEval RAG metrics in CI?

Write your metrics inside Pytest functions using \`assert_test\`, then run \`deepeval test run test_rag.py\` in your pipeline. The DeepEval CLI is a superset of Pytest that adds caching, parallelism with \`-n\`, and a results table. Because it exits non-zero on failure, it gates merges exactly like any other Python test suite already in your CI.

### Can I use a non-OpenAI model as the DeepEval judge?

Yes. DeepEval supports Anthropic, Google, Azure OpenAI, Ollama, and any custom model through the \`DeepEvalBaseLLM\` interface. Set a default judge via the CLI (for example \`deepeval set-ollama llama3\`) or pass a \`model\` argument to each metric. The judge model is independent from the model your RAG app uses to generate answers.

### When should I use G-Eval instead of the built-in RAG metrics?

Use G-Eval when none of the five built-in RAG metrics captures your criterion — for example citation style, tone, or domain-specific compliance. G-Eval turns a plain-English description plus a list of test-case fields into a chain-of-thought scored metric. It is the open-ended escape hatch for anything you can describe in a sentence but that the standard retriever and generator metrics do not measure.

### Is this guide different from the general DeepEval metrics reference?

Yes. This page is the RAG-specific reference covering only the five retrieval and generation metrics and the \`LLMTestCase\` fields they read. The broader [DeepEval metrics complete guide](/blog/deepeval-metrics-complete-guide-2026) surveys all 50+ metrics including agentic, conversational, and safety metrics. Use this page when you are specifically debugging or gating a RAG pipeline.

## Conclusion and Next Steps

DeepEval's five RAG metrics give you a complete, debuggable view of a retrieval-augmented generation pipeline. Faithfulness and answer relevancy guard the generator; contextual precision, recall, and relevancy guard the retriever. Populate the right \`LLMTestCase\` fields, set thresholds that match your risk tolerance, turn on \`include_reason\` for explainable CI logs, and run everything through \`deepeval test run\` so quality regressions fail the build the same way a unit test would.

Start by wiring faithfulness and answer relevancy into a single Pytest file, then add the three contextual metrics once you have labeled reference answers. Compare approaches with the [Ragas faithfulness and context precision reference](/blog/ragas-faithfulness-answer-relevancy-context-precision-recall-reference-2026) and the [TruLens RAG triad guide](/blog/trulens-rag-triad-groundedness-context-relevance-2026), and browse runnable evaluation patterns in the [QA skills directory](/skills) to ship a RAG quality gate this week.
`,
};
