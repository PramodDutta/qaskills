import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas RAG Evaluation Metrics Complete Guide 2026',
  description:
    'Master Ragas for RAG evaluation in 2026. Complete guide to faithfulness, answer relevance, context precision, context recall, and answer correctness with full Python code samples.',
  date: '2026-05-01',
  category: 'AI Testing',
  content: `
# Ragas RAG Evaluation Metrics Complete Guide 2026

Retrieval Augmented Generation (RAG) has become the dominant pattern for production LLM systems in 2026. Teams ship document QA assistants, knowledge base search, customer support agents, and analytics copilots that all combine a retriever with a generator. Whenever a RAG system moves beyond a prototype, two questions become unavoidable: how good is the retrieval and how good are the answers. Ragas, the open source RAG evaluation framework, provides the most widely adopted toolkit for answering both of those questions with reproducible metrics.

This guide is a complete reference to Ragas in 2026. We cover the framework architecture, the eight core metrics (faithfulness, answer relevance, context precision, context recall, context entity recall, answer correctness, answer similarity, and aspect critique), evaluation dataset design, model-graded grading patterns, CI integration, and how Ragas compares to LangSmith, TruLens, and DeepEval. Every section includes runnable Python code that you can paste into a notebook or pytest file. By the end, you should be able to set up a complete Ragas evaluation pipeline for your own RAG application and use the resulting metrics to make informed decisions about retrievers, chunk sizes, prompts, and base models.

## Key Takeaways

- Ragas is an open source Python framework for evaluating Retrieval Augmented Generation systems with both reference-free and reference-based metrics.
- The framework uses LLMs as judges to score generated answers along eight standard dimensions, with faithfulness and answer relevance being the most commonly reported metrics.
- Reference-free metrics let you evaluate production traffic without ground-truth labels, while reference-based metrics provide stronger signal during development.
- A typical evaluation dataset has 50-200 question/answer pairs. Larger datasets diminish in usefulness if their questions are not diverse.
- Ragas integrates cleanly with LangChain, LlamaIndex, Haystack, and any custom pipeline that produces question/contexts/answer/ground_truth tuples.
- CI integration runs Ragas on every pull request with thresholds that block regressions in faithfulness and context recall.

---

## Why Ragas Matters for RAG Pipelines

A RAG system has two failure modes that hurt users in different ways. The retriever may fetch the wrong documents, leading the generator to make up answers or politely refuse. The generator may ignore the retrieved documents and answer from its parametric memory, producing fluent but factually wrong text. Either failure produces a bad answer, but the fix is different. Improving retrieval requires better embeddings, chunking, or query rewriting. Improving generation requires better prompts or a stronger base model.

Ragas separates these failure modes by reporting metrics that target each stage independently. Context precision and context recall measure retrieval. Faithfulness measures generation. Answer relevance measures whether the response actually addresses the question. By looking at all four together you can localize problems instead of just observing that the system is bad.

Compared to free-form vibes-based evaluation, Ragas provides three concrete advantages. First, the numbers are comparable across runs, so you can tell whether a change improved or regressed quality. Second, the metrics are decomposable, so you can attribute a quality change to a specific subsystem. Third, evaluation is automated, so you can run it on every pull request instead of relying on manual review.

The framework also matters because RAG is hard. Naive vector search misses relevant documents. Chunking strategies that work for one document type fail on another. Prompts that produce clean answers on simple questions devolve on multi-hop questions. Without a reproducible evaluation harness, teams ship changes based on hunches and end up shipping regressions. Ragas turns the ship-and-pray loop into a measure-and-improve loop.

---

## Installation and Setup

Ragas runs on Python 3.10 or later. Install it with pip alongside the LLM client you intend to use as a judge model.

\`\`\`bash
pip install ragas datasets langchain langchain-openai
export OPENAI_API_KEY=sk-...
\`\`\`

The framework includes optional adapters for LlamaIndex, Hugging Face datasets, and Azure OpenAI. Configure the judge model and embeddings explicitly to avoid implicit defaults that may change between releases.

\`\`\`python
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

judge_llm = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o", temperature=0))
judge_embed = LangchainEmbeddingsWrapper(OpenAIEmbeddings(model="text-embedding-3-small"))
\`\`\`

The judge model should be at least as strong as the model being evaluated. Using a weaker judge produces noisy metrics that conflate evaluator errors with generation errors. GPT-4 class models are the default; Claude 3.5 Sonnet and Gemini 1.5 Pro also work as judges. Some teams use a panel of three judges and majority vote for high-stakes evaluations where a single judge's noise can affect rollout decisions.

For self-hosted setups, point Ragas at any OpenAI-compatible inference server. vLLM, TGI, and Ollama all work as long as the wrapper can issue completions in the expected format.

---

## Evaluation Dataset Format

Ragas expects a dataset with four columns: question, contexts, answer, and optionally ground_truth. The contexts column is a list of strings representing the retrieved chunks. The answer is the final generated response. Ground truth is required only for reference-based metrics like context recall and answer correctness.

\`\`\`python
from datasets import Dataset

data = {
    "question": [
        "What is the maximum file size for uploads?",
        "How do I rotate my API key?",
    ],
    "contexts": [
        ["Uploads are limited to 100 MB per file.", "Multipart uploads support files up to 5 GB."],
        ["To rotate keys, visit Settings > API > Rotate.", "Keys rotate automatically every 90 days."],
    ],
    "answer": [
        "Single-part uploads are limited to 100 MB. Multipart supports up to 5 GB.",
        "Visit Settings > API and click Rotate. Keys also rotate automatically every 90 days.",
    ],
    "ground_truth": [
        "100 MB for single uploads, 5 GB with multipart.",
        "Settings > API > Rotate, or wait for automatic 90-day rotation.",
    ],
}

dataset = Dataset.from_dict(data)
\`\`\`

For production use, build a dataset of 100 to 200 examples that cover your retrieval distribution. Sample from real query logs, then have a subject matter expert curate gold answers. Treat the dataset as code: keep it in version control, review changes, and grow it as you discover new failure modes.

Stratify the dataset across difficulty buckets. Easy questions answer from a single chunk. Medium questions require reasoning across two or three chunks. Hard questions require multi-hop reasoning, calculation, or aggregation across many chunks. Reporting metrics per bucket lets you see whether a change improves easy questions while regressing hard ones.

---

## Core Metric 1: Faithfulness

Faithfulness measures whether the generated answer is grounded in the retrieved contexts. The metric extracts atomic claims from the answer, then checks each claim against the retrieved contexts using an LLM judge. The score is the fraction of claims supported by the contexts.

\`\`\`python
from ragas import evaluate
from ragas.metrics import faithfulness

result = evaluate(
    dataset=dataset,
    metrics=[faithfulness],
    llm=judge_llm,
    embeddings=judge_embed,
)
print(result)
\`\`\`

A faithfulness score below 0.7 typically indicates hallucination problems. Common causes include weak prompt instructions, an underspecified system prompt, or a base model that overrides retrieved contexts. The fix usually starts with prompt engineering: explicitly instructing the model to cite sources and refuse to answer when context is missing.

| Faithfulness Score | Interpretation | Common Cause |
| --- | --- | --- |
| 0.9 - 1.0 | Excellent grounding | Strong prompt, capable model |
| 0.75 - 0.9 | Acceptable production | Occasional drift, monitor |
| 0.5 - 0.75 | Poor grounding | Prompt allows free-form answers |
| Below 0.5 | Hallucinatory | Model ignores context or weak retrieval |

Faithfulness has a known weakness with paraphrased claims. The judge LLM may not recognize that a claim is supported because the wording differs from the context. To mitigate, instruct the judge to evaluate semantic support rather than lexical match, and review a sample of judge decisions to confirm the judge is calibrated.

---

## Core Metric 2: Answer Relevance

Answer relevance measures whether the generated answer addresses the question. The metric reverse-engineers candidate questions from the answer using an LLM, then measures cosine similarity between the original question and the generated questions. High similarity means the answer is relevant; low similarity means it answers a different question.

\`\`\`python
from ragas.metrics import answer_relevancy

result = evaluate(
    dataset=dataset,
    metrics=[answer_relevancy],
    llm=judge_llm,
    embeddings=judge_embed,
)
\`\`\`

Answer relevance catches a specific failure mode where the model returns information that is true but does not answer the user's question. For example, if asked about pricing, the model might describe features. Faithfulness gives a perfect score (the features are in context) but answer relevance flags the response.

A common cause of low answer relevance is overly long answers that wander into adjacent topics. Tightening the prompt with explicit "answer the question and stop" guidance often improves the score. Another cause is mismatched system prompts that prime the model toward a different task than the user is asking.

---

## Core Metric 3: Context Precision

Context precision measures the signal-to-noise ratio of the retriever. For each retrieved chunk, the metric asks an LLM whether the chunk is useful for answering the question. Useful chunks ranked higher contribute more to the score.

\`\`\`python
from ragas.metrics import context_precision

result = evaluate(
    dataset=dataset,
    metrics=[context_precision],
    llm=judge_llm,
)
\`\`\`

Low context precision means the retriever returns many irrelevant chunks. This dilutes the prompt and can cause the generator to focus on the wrong information. Improving context precision usually requires better embeddings, query rewriting, or a reranker. A common pattern is to retrieve 20 chunks then rerank to the top 5 with a cross-encoder.

Context precision is ranking-aware: it weights chunks by their position in the retrieved list. A useful chunk in position one contributes more than the same chunk in position ten. This rewards retrievers that put the most useful chunks at the top, which is what generators expect.

---

## Core Metric 4: Context Recall

Context recall measures whether the retriever fetched all the information needed to answer the question. This metric requires ground truth: the metric extracts claims from the ground truth and checks whether each is supported by the retrieved contexts.

\`\`\`python
from ragas.metrics import context_recall

result = evaluate(
    dataset=dataset,
    metrics=[context_recall],
    llm=judge_llm,
)
\`\`\`

Context recall is the single most important retrieval metric. If the retriever misses information, the generator cannot recover. Low context recall means you need a better retriever, larger top-k, larger chunks, or a different chunking strategy. A 90 percent context recall target is achievable for well-tuned RAG systems.

When context recall drops, inspect the missing claims to understand why retrieval failed. Common causes include rare terminology that embedding models miss, multi-hop questions that require chained retrieval, and chunking boundaries that split related information across chunks. Each cause has a different fix.

---

## Core Metric 5: Context Entity Recall

Context entity recall is a focused version of context recall that looks specifically at named entities. The metric extracts entities (people, organizations, locations, dates, product names) from the ground truth and checks whether they appear in the retrieved contexts.

\`\`\`python
from ragas.metrics import context_entity_recall

result = evaluate(
    dataset=dataset,
    metrics=[context_entity_recall],
    llm=judge_llm,
)
\`\`\`

This metric helps when your domain is entity-heavy: customer service tickets that reference specific accounts, technical documentation that references specific APIs, or financial reports that reference specific companies. A high context entity recall predicts that the generator will have the right facts available.

For enterprise applications, entity recall often correlates with user satisfaction more than overall context recall. Users notice when a specific product name or policy reference is missing, even if the overall topic is covered.

---

## Core Metric 6: Answer Correctness

Answer correctness combines factual accuracy and semantic similarity to the ground truth. The metric uses an LLM judge to compare the generated answer against the gold answer and produces a 0 to 1 score.

\`\`\`python
from ragas.metrics import answer_correctness

result = evaluate(
    dataset=dataset,
    metrics=[answer_correctness],
    llm=judge_llm,
    embeddings=judge_embed,
)
\`\`\`

Use answer correctness as your headline metric during development. It is a single number that captures overall RAG quality and tracks with user perception. The component metrics (faithfulness, relevance, context precision, context recall) tell you why correctness changed.

Answer correctness is a weighted blend: factual accuracy from the LLM judge counts more than semantic similarity from embeddings. You can adjust the weights when initializing the metric to match your priorities. A factual application weights accuracy higher; a customer service application weights tone and similarity higher.

---

## Core Metric 7: Answer Similarity

Answer similarity uses embeddings to measure semantic closeness between the generated answer and the ground truth. The metric is purely semantic; it does not check factual correctness.

\`\`\`python
from ragas.metrics import answer_similarity

result = evaluate(
    dataset=dataset,
    metrics=[answer_similarity],
    embeddings=judge_embed,
)
\`\`\`

Use answer similarity as a fast pre-filter. It runs without an LLM judge so it is cheap and quick. If similarity is very low, the answer probably needs review. If similarity is high, the answer is at least talking about the right topic.

The trap with answer similarity is that fluent but wrong answers can score high. A response that says "all uploads are unlimited" is semantically similar to "uploads have specific limits depending on plan", even though one is wrong. Pair it with answer correctness for the full picture.

---

## Core Metric 8: Aspect Critique

Aspect critique is a customizable metric that asks an LLM to evaluate a specific dimension of the response. You define the aspect with a name and a yes/no question.

\`\`\`python
from ragas.metrics.critique import AspectCritique

harmfulness = AspectCritique(
    name="harmfulness",
    definition="Does the response contain content that could cause harm to individuals, groups, or society?",
)

result = evaluate(
    dataset=dataset,
    metrics=[harmfulness],
    llm=judge_llm,
)
\`\`\`

Define aspect critiques for domain-specific concerns: medical advice that should include disclaimers, financial recommendations that should note risk, code samples that should follow your style guide. Aspect critiques are the flexible escape hatch when the standard metrics do not cover your needs.

Aspect critiques are also useful for tracking style and tone. Define an aspect for "professional tone" or "matches our brand voice" and run it alongside the core metrics. The critique provides a signal that human reviewers would otherwise have to verify manually.

---

## Running a Complete Evaluation

A production-grade evaluation combines all the relevant metrics in one run.

\`\`\`python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    answer_correctness,
)

result = evaluate(
    dataset=dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
        answer_correctness,
    ],
    llm=judge_llm,
    embeddings=judge_embed,
)

df = result.to_pandas()
df.to_csv("ragas_run_2026_05_01.csv", index=False)
print(result)
\`\`\`

Export the per-example dataframe and inspect failures. The dataframe includes the question, contexts, answer, and per-metric score for each example. Sort by the worst-performing metric and read the bottom 20 to understand failure modes.

A good practice is to keep the raw outputs alongside the metrics so reviewers can audit judge decisions. Store the dataframe in object storage with a timestamped key. Build a small dashboard that compares the latest run to the previous one and flags regressions.

---

## CI Integration with Pytest

Treat Ragas evaluation as a test that runs on every pull request. Set thresholds for each metric and fail the build when scores regress.

\`\`\`python
import pytest
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall

THRESHOLDS = {
    "faithfulness": 0.85,
    "answer_relevancy": 0.80,
    "context_recall": 0.85,
}

def test_rag_quality(dataset, judge_llm, judge_embed):
    result = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy, context_recall],
        llm=judge_llm,
        embeddings=judge_embed,
    )
    scores = result.scores
    for name, threshold in THRESHOLDS.items():
        assert scores[name] >= threshold, f"{name} dropped to {scores[name]}"
\`\`\`

Run the test with a smaller dataset (20-30 examples) on every PR for fast feedback, and a larger dataset (200+ examples) on nightly main builds for deeper signal. The PR-level test is your guardrail against obvious regressions; the nightly test is your ground truth.

---

## Comparison to Alternative Frameworks

| Framework | Open Source | Reference-Free Metrics | Production Monitoring | Best For |
| --- | --- | --- | --- | --- |
| Ragas | Yes | Yes | Via export | RAG-specific evaluation |
| LangSmith | No (paid) | Yes | Yes | Teams on LangChain |
| TruLens | Yes | Yes | Yes | Custom feedback functions |
| DeepEval | Yes | Yes | Via export | Pytest-native evaluation |
| OpenAI Evals | Yes | Yes | No | Custom graders |

Ragas is the most opinionated choice for RAG specifically. If your application is RAG, Ragas gives you the most relevant default metrics. TruLens is more flexible but requires more configuration. LangSmith is more turnkey but is paid and tied to LangChain. DeepEval is more pytest-native and useful for unit-level evaluations.

| Use Case | Recommended Framework |
| --- | --- |
| RAG quality measurement | Ragas |
| End-to-end LangChain pipelines | LangSmith |
| Custom feedback dimensions | TruLens |
| Pytest-style unit evals | DeepEval |
| One-off prompt comparisons | promptfoo |

---

## Practical Tips from Production

Use temperature zero for judge models. Stochastic judges produce noisy scores that obscure real changes.

Cache evaluation results by dataset hash and code hash. Re-running an unchanged evaluation wastes money.

Set thresholds based on a baseline run, not absolute targets. The first run establishes the bar; subsequent runs should not drop below it.

Investigate failures rather than chasing scores. A small set of recurring failure patterns usually drives most of the score loss.

Track metric correlations with user feedback. Faithfulness and answer correctness usually track best with thumbs-up rates; answer relevance and context precision can diverge.

Run evaluation in a separate process from your application. Judge calls are expensive and slow, so isolate them.

Cap the judge tokens. Long judge prompts waste money without improving signal. Most metrics work with fewer than 4000 input tokens per example.

---

## Common Pitfalls

Using a weak judge model. Anything weaker than GPT-4 produces noisy metrics. The judge must be at least as capable as the system being evaluated.

Evaluating on cherry-picked examples. Production traffic is diverse; an evaluation set drawn from happy paths overestimates quality.

Confusing reference-free with reference-based metrics. Faithfulness does not require ground truth; context recall does. Mixing the two leads to misinterpretation.

Treating Ragas scores as absolute. A faithfulness of 0.85 in your system is not directly comparable to 0.85 in a different system. Compare runs of the same evaluation suite, not raw numbers across systems.

Ignoring per-example results. The aggregate score hides systematic failures. Always inspect the worst-scoring examples.

Skipping the diversity check. An evaluation set of 200 paraphrases of the same question is no better than one example. Use embedding-based clustering to verify your set covers a wide topic space.

---

## Building a RAG Evaluation Culture

Tooling alone does not improve quality. Teams that benefit most from Ragas treat evaluation as a shared engineering practice. The evaluation dataset is owned and updated as new failure modes appear. PRs that change retrieval or prompts include a delta report. Metric thresholds gate deployment. A weekly review of the lowest-scoring examples informs the next sprint.

Designate a quality owner. One engineer is accountable for the evaluation suite, dataset curation, and threshold management. Without an owner, the suite drifts and stops being trusted.

Publish quality dashboards. Internal visibility into RAG metrics is the fastest way to make quality a shared concern. Most teams build a simple Grafana or Notion dashboard that updates after every nightly run.

---

## Further Resources

- Ragas documentation and source: github.com/explodinggradients/ragas
- LLM evaluation skills directory: /skills
- Related guides on /blog include the Ragas context precision deep-dive, OpenAI Evals graders reference, and LangSmith platform tour.

---

## Conclusion

Ragas is the most direct path from a working RAG prototype to a measured, monitored, improvable RAG system. Eight standard metrics cover the dimensions that matter, the framework integrates with the tools you already use, and the API is small enough to learn in an afternoon. Start by computing faithfulness and context recall on a 50-example dataset, set thresholds, and wire the evaluation into CI. From there, add metrics as your application evolves and the dataset as you discover new failure modes. Browse more LLM evaluation resources at [/skills](/skills) and explore other AI testing guides on the [/blog](/blog).
`,
};
