import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG Evaluation Metrics 2026: The Complete Guide',
  description:
    'Master RAG evaluation metrics in 2026: context precision, recall, faithfulness, answer relevancy and groundedness with Ragas, DeepEval and TruLens.',
  date: '2026-06-04',
  category: 'Guide',
  content: `
# RAG Evaluation Metrics 2026: The Complete Guide

Retrieval-augmented generation (RAG) is the dominant architecture for grounding large language models in private, current and domain-specific knowledge. But building a RAG pipeline is the easy part. Knowing whether it actually works, whether it retrieves the right context, whether the model stays faithful to that context, and whether the final answer satisfies the user, is where most teams stumble. In 2026, shipping a RAG system without a rigorous evaluation harness is the equivalent of shipping a web app with zero tests. It might demo well, but it will silently degrade the moment your documents change, your embedding model updates, or your prompt drifts.

This guide is a tool-agnostic pillar on RAG evaluation metrics. We define every metric that matters in 2026, give you the formula and intuition behind each one, set realistic thresholds, and then show you exactly how to measure them with the three frameworks teams actually use in production: Ragas, DeepEval and TruLens. By the end you will be able to assemble a metric suite, compute scores against a golden dataset, and wire the results into CI so quality regressions are caught before they reach users. If you want the broader testing context, our hub on [AI and LLM evaluations](/skills-for/ai-llm-evals) collects the related skills, and the [skills directory](/skills) has installable agent skills that automate much of this.

RAG evaluation breaks naturally into two halves: retrieval quality and generation quality. Retrieval metrics ask "did we fetch the right chunks?" Generation metrics ask "given those chunks, did the model produce a faithful, relevant answer?" A failure in either half tanks the end-to-end experience, and crucially, the fix is different depending on which half broke. That is why component-level metrics beat a single end-to-end score: they tell you where to look.

## Why RAG Needs Its Own Evaluation Discipline

Traditional software returns deterministic output, so a test asserts an exact value. RAG output is probabilistic, free-form natural language grounded in retrieved documents. You cannot assert string equality against a generated paragraph. Instead you measure properties of the output: is it grounded in the sources, is it relevant to the question, did the retriever surface the evidence the answer needs?

There is a second wrinkle. A RAG answer can be wrong in two completely different ways. The retriever can fail, fetching irrelevant or incomplete context, in which case even a perfect LLM produces a bad answer. Or the retriever can succeed while the generator hallucinates, ignoring the good context it was handed. These two failure modes look identical to an end user (a wrong answer) but require opposite fixes: improve chunking and embeddings versus tighten the prompt and lower the temperature. Component metrics disambiguate them.

## The Core RAG Evaluation Metrics

Below is the canonical metric set used across Ragas, DeepEval and TruLens in 2026. Most metrics are scored on a 0 to 1 scale where higher is better, and most are computed by an LLM judge that reasons over the question, the retrieved context, and the answer.

| Metric | What it measures | Inputs required | Typical threshold |
|---|---|---|---|
| Context Precision | Are retrieved chunks relevant and well-ranked? | question, contexts, ground truth | >= 0.80 |
| Context Recall | Did retrieval fetch all info needed for the answer? | question, contexts, ground truth | >= 0.85 |
| Faithfulness | Is the answer grounded in the retrieved context? | answer, contexts | >= 0.90 |
| Answer Relevancy | Does the answer address the question asked? | question, answer | >= 0.85 |
| Groundedness | Can every claim be traced to a source span? | answer, contexts | >= 0.90 |
| Answer Correctness | Does the answer match the ground truth? | answer, ground truth | >= 0.80 |

### Context Precision

Context precision measures the signal-to-noise ratio of your retriever. If you retrieve five chunks and only one is relevant, precision is low and you are stuffing the context window with distractors that can confuse the generator. The metric is rank-aware: relevant chunks appearing near the top score higher than relevant chunks buried at position five.

The intuition is mean average precision over the retrieved set. For each position k where the chunk is relevant, you compute precision at k, then average over all relevant positions:

\`\`\`text
Context Precision = (sum over k of Precision@k * relevant_k) / (total relevant chunks)

where Precision@k = (relevant chunks in top k) / k
\`\`\`

Low context precision usually means your top_k is too high, your chunks are too large, or your embedding model is weak for the domain. The fix is reranking, smaller chunks, or a better embedder.

### Context Recall

Context recall asks the opposite question: of all the information needed to produce the ground-truth answer, how much did the retriever actually surface? It is computed by breaking the ground-truth answer into individual claims and checking whether each claim is supported by at least one retrieved chunk.

\`\`\`text
Context Recall = (ground-truth claims attributable to context) / (total ground-truth claims)
\`\`\`

Recall is the metric most correlated with "the answer was incomplete." If recall is high but precision is low, you are retrieving too much; if recall is low, you are missing evidence and need a larger top_k, hybrid search, or query expansion.

### Faithfulness and Groundedness

Faithfulness is the anti-hallucination metric. It decomposes the generated answer into atomic claims and verifies each claim against the retrieved context. An answer is faithful if every claim it makes can be inferred from the context.

\`\`\`text
Faithfulness = (claims in answer supported by context) / (total claims in answer)
\`\`\`

Groundedness is closely related and the terms are often used interchangeably; TruLens calls it groundedness, Ragas calls it faithfulness, and the practical meaning is the same: no unsupported claims. The subtle difference is that groundedness frameworks frequently return the specific source spans that support each claim, which is invaluable for debugging and for building citation UIs. A "RAG workflow builder with groundedness scoring" is simply a pipeline that computes this metric on every response and surfaces the supporting evidence.

### Answer Relevancy

A faithful answer can still be useless if it does not address the question. Answer relevancy measures topical alignment between the question and the answer, independent of whether the answer is correct. Ragas computes it by using the LLM to generate several candidate questions that the answer would satisfy, embedding them, and measuring cosine similarity to the original question.

\`\`\`text
Answer Relevancy = mean( cosine_similarity(original_question, generated_question_i) )
\`\`\`

Low relevancy with high faithfulness is a classic prompt problem: the model is grounded but rambling or answering a slightly different question.

### Answer Correctness

When you have ground-truth answers, answer correctness directly compares the generated answer to the reference, blending factual overlap and semantic similarity. It is the closest thing to an end-to-end accuracy score, but on its own it cannot tell you why an answer was wrong, which is why you compute it alongside the component metrics.

## Measuring with Ragas

Ragas is the most widely adopted open-source RAG evaluation framework in 2026. It is Python-native, integrates with most LLM providers, and computes the full metric suite from an evaluation dataset. Install it and assemble a dataset of question, answer, contexts and ground truth.

\`\`\`python
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    context_precision,
    context_recall,
    faithfulness,
    answer_relevancy,
    answer_correctness,
)

# One row per evaluated query. "contexts" is the list of retrieved chunks.
data = {
    "question": [
        "What is the refund window for annual plans?",
        "How do I rotate an API key?",
    ],
    "answer": [
        "Annual plans can be refunded within 30 days of purchase.",
        "Go to Settings, API Keys, then click Rotate next to the key.",
    ],
    "contexts": [
        ["Refunds for annual subscriptions are available within 30 days."],
        ["To rotate a key, open Settings > API Keys and press Rotate."],
    ],
    "ground_truth": [
        "Annual plans are refundable within 30 days of purchase.",
        "Open Settings > API Keys and click Rotate beside the key.",
    ],
}

dataset = Dataset.from_dict(data)

result = evaluate(
    dataset,
    metrics=[
        context_precision,
        context_recall,
        faithfulness,
        answer_relevancy,
        answer_correctness,
    ],
)

print(result)
# {'context_precision': 0.94, 'context_recall': 0.91,
#  'faithfulness': 0.97, 'answer_relevancy': 0.93, 'answer_correctness': 0.88}
\`\`\`

Ragas returns aggregate scores plus a per-row breakdown you can export to a dataframe with \`result.to_pandas()\`. Sort by the weakest metric to find the queries dragging down your suite. You can also swap the judge model and embeddings to control cost and consistency:

\`\`\`python
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

judge = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o-mini", temperature=0))
emb = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-small"))

result = evaluate(dataset, metrics=[faithfulness], llm=judge, embeddings=emb)
\`\`\`

Pin a temperature of 0 on the judge so scores are reproducible run to run. A non-deterministic judge makes regression testing impossible.

## Measuring with DeepEval

DeepEval frames evaluation as unit tests, which makes it the most natural fit for teams already living in pytest. Each metric is an assertion on a test case, so a failing metric fails the test and breaks the build. This is the cleanest path to CI gating.

\`\`\`python
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    FaithfulnessMetric,
    AnswerRelevancyMetric,
)


def build_case() -> LLMTestCase:
    return LLMTestCase(
        input="What is the refund window for annual plans?",
        actual_output="Annual plans can be refunded within 30 days of purchase.",
        expected_output="Annual plans are refundable within 30 days.",
        retrieval_context=[
            "Refunds for annual subscriptions are available within 30 days.",
        ],
    )


def test_rag_answer_quality():
    case = build_case()
    assert_test(
        case,
        metrics=[
            ContextualPrecisionMetric(threshold=0.8),
            ContextualRecallMetric(threshold=0.85),
            FaithfulnessMetric(threshold=0.9),
            AnswerRelevancyMetric(threshold=0.85),
        ],
    )
\`\`\`

Run the suite with \`deepeval test run test_rag.py\`. Each metric carries a threshold, and DeepEval reports the score, the pass/fail verdict, and a natural-language reason explaining the judgment, which is gold for debugging. Because it is pytest under the hood, you parametrize across an entire golden dataset with the same idiom you already use for ordinary Python tests. For a deeper walkthrough of the pytest integration, see our [DeepEval and pytest LLM testing guide](/blog/deepeval-pytest-llm-testing-guide).

## Measuring with TruLens

TruLens excels at observability. Instead of evaluating a static dataset, it instruments your live RAG app and records feedback functions on every call, building a trace dashboard over time. Its signature metric is the RAG Triad: context relevance, groundedness and answer relevance, the three checks that together cover the full retrieval-to-answer path.

\`\`\`python
from trulens.core import TruSession, Feedback
from trulens.providers.openai import OpenAI as TruOpenAI
import numpy as np

session = TruSession()
provider = TruOpenAI(model_engine="gpt-4o-mini")

# Groundedness: are answer claims supported by retrieved context?
f_groundedness = (
    Feedback(provider.groundedness_measure_with_cot_reasons, name="Groundedness")
    .on_input_output()
)

# Context relevance: is each retrieved chunk relevant to the question?
f_context_relevance = (
    Feedback(provider.context_relevance_with_cot_reasons, name="Context Relevance")
    .on_input()
    .on(context_selector)
    .aggregate(np.mean)
)

# Answer relevance: does the final answer address the question?
f_answer_relevance = (
    Feedback(provider.relevance_with_cot_reasons, name="Answer Relevance")
    .on_input_output()
)
\`\`\`

Wrap your chain with a TruLens recorder and every invocation is scored and persisted. Open the dashboard to slice scores by metric, by query, or by app version. This is how you catch slow drift: a dip in groundedness across last week's traffic is visible long before users complain. Our [TruLens evaluation framework guide](/blog/trulens-llm-evaluation-framework-guide) covers the dashboard and feedback functions in depth.

## RAG Evaluation Tools Compared in 2026

The three frameworks overlap on metrics but differ sharply in workflow. Picking the best RAG evaluation tool for 2026 comes down to whether you want offline dataset scoring, CI gating, or live observability.

| Capability | Ragas | DeepEval | TruLens |
|---|---|---|---|
| Primary model | Offline dataset scoring | pytest-style assertions | Live app observability |
| CI gating | Manual threshold checks | First-class (test fails build) | Via logged feedback |
| Metric explanations | Limited | Per-metric reasons | Chain-of-thought reasons |
| Best for | Batch benchmarking retrievers | Regression suites in CI | Production monitoring + drift |
| Dashboard | Via integrations | Confident AI platform | Built-in Streamlit dashboard |
| Judge model control | Full | Full | Full |

In practice mature teams run all three: Ragas for offline experiments when tuning chunking and embeddings, DeepEval as the CI gate on a curated golden set, and TruLens for production observability. They share the same conceptual metrics, so a faithfulness regression caught in DeepEval maps cleanly to a groundedness dip in TruLens.

## RAG Evaluation Methods: Building a Reliable Harness

Knowing the metrics is half the battle. The other half is methodology, the discipline that makes scores trustworthy and comparable over time.

Start with a golden dataset of 50 to 200 representative queries, each with a hand-verified ideal answer and, where possible, the source documents that should be retrieved. Cover the long tail: ambiguous questions, multi-hop questions that need two documents, and adversarial questions whose answer is not in your corpus (the correct response is "I do not know"). A dataset that only contains easy lookups will report inflated scores that collapse in production.

Pin the judge model and temperature so runs are reproducible. Treat the judge like a measuring instrument: if you change it, re-baseline everything, because a score from gpt-4o-mini is not directly comparable to a score from a larger judge. Run each query a few times and look at variance; high variance on a metric means the judge is uncertain and the metric is noisy for that query type.

Finally, evaluate components in isolation before evaluating end to end. Score retrieval (precision and recall) against a fixed set of expected chunks, independent of the generator. Then freeze the retriever and score generation (faithfulness, relevancy) independently. Only then run the full pipeline. This three-stage method tells you precisely which component to fix when the end-to-end score drops.

## Choosing Thresholds and Acting on Scores

Thresholds are product decisions, not universal constants. A medical or legal RAG system should demand faithfulness above 0.95 and treat any unsupported claim as a release blocker. An internal documentation bot can tolerate 0.85. Set thresholds from your golden-set baseline plus a safety margin, then tighten them as the system matures.

When a score regresses, the metric tells you where to look. Falling context recall points at retrieval: enlarge top_k, add hybrid keyword search, or expand queries. Falling context precision points at noise: rerank, shrink chunks, or filter by metadata. Falling faithfulness points at generation: tighten the prompt to forbid outside knowledge, lower temperature, or add an explicit "only answer from context" instruction. Falling answer relevancy points at prompt scope or formatting. This metric-to-fix mapping is the entire payoff of component-level evaluation.

## Frequently Asked Questions

### What are the most important RAG evaluation metrics in 2026?

The core suite is context precision and context recall for retrieval quality, plus faithfulness (groundedness), answer relevancy and answer correctness for generation quality. Faithfulness and context recall are the two highest-signal metrics because they catch the most common failures: hallucination and incomplete retrieval. Most teams track all five against a golden dataset and gate CI on faithfulness and recall.

### What are the best RAG evaluation tools in 2026?

Ragas, DeepEval and TruLens are the three leaders. Ragas is best for offline dataset scoring when tuning retrievers, DeepEval is best for pytest-style CI gating because a failing metric breaks the build, and TruLens is best for live production observability with its RAG Triad dashboard. They share the same conceptual metrics, so most mature teams run all three at different stages of the pipeline.

### What is the difference between faithfulness and groundedness?

They measure the same property under different names: whether every claim in the generated answer is supported by the retrieved context. Ragas calls it faithfulness, TruLens calls it groundedness. The practical difference is that groundedness tooling often returns the exact source spans supporting each claim, which makes it easier to debug hallucinations and to build citation interfaces.

### How do I measure RAG quality without ground-truth answers?

Use reference-free metrics. Faithfulness and groundedness only need the answer and the retrieved context. Answer relevancy only needs the question and answer. Context precision can be approximated by an LLM judge scoring chunk relevance to the question. You lose answer correctness, which needs a reference, but you can still gate on hallucination and relevance, which catch most production failures.

### What threshold should I set for faithfulness in CI?

Start at 0.90 for general applications and raise it to 0.95 or higher for high-stakes domains like healthcare, legal or finance, where any unsupported claim is unacceptable. Derive the exact number from your golden-set baseline plus a safety margin rather than copying a default. Always pin the judge model and temperature so the threshold stays meaningful across runs.

### Which RAG evaluation methods catch quality drift before users do?

Component-level scoring against a fixed golden dataset on every change, combined with live observability that scores production traffic continuously. TruLens-style feedback functions log faithfulness and relevance on real requests, so a gradual dip is visible in the dashboard days before complaints arrive. Pair this with CI gates from DeepEval so code and prompt changes cannot ship a regression in the first place.

## Conclusion

RAG evaluation in 2026 is a mature discipline with a well-defined metric set: context precision and recall for retrieval, faithfulness, relevancy and correctness for generation. Measuring these against a golden dataset, with a pinned judge and component-level isolation, turns a black-box pipeline into a system you can debug, gate and trust. Ragas handles offline scoring, DeepEval gates CI, and TruLens watches production, and together they cover the entire lifecycle.

The next step is to operationalize this: codify your metrics into a CI gate so quality regressions are caught automatically. Read our companion guide on [RAG regression testing](/blog/rag-regression-testing-guide) for the golden-dataset and CI-gate playbook, explore the [AI and LLM evaluation skills hub](/skills-for/ai-llm-evals), or browse the full [QA skills directory](/skills) to install agent skills that automate RAG evaluation end to end. You can also [compare evaluation frameworks](/compare) to find the right fit for your stack.
`,
};
