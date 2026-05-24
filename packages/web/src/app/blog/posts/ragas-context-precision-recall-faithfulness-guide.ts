import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Ragas Context Precision, Recall, and Faithfulness Deep Dive',
  description:
    'In-depth guide to Ragas core metrics: context precision, context recall, and faithfulness. Learn how each metric works, when to use it, and how to tune your RAG pipeline based on results.',
  date: '2026-05-02',
  category: 'AI Testing',
  content: `
# Ragas Context Precision, Recall, and Faithfulness Deep Dive

If you only have time to track three Ragas metrics, track context precision, context recall, and faithfulness. Together they describe the three things a RAG system has to get right: retrieving useful chunks, retrieving all the chunks needed, and using those chunks to produce a grounded answer. Every other Ragas metric is either a derivative or a special case of these three. Most production teams treat these three as their headline numbers and add others as the application demands.

This deep dive goes beyond the API documentation. We explain exactly how each metric is computed, the failure modes each one catches, the failure modes each one misses, and the concrete actions you should take when a metric drops. We cover example calculations, Python implementations, judge prompt design, threshold setting, and how the three metrics interact. By the end you should be able to read a Ragas report and know exactly which knob to turn in your retrieval pipeline. This is the missing manual that turns Ragas from a black box into a useful diagnostic instrument.

## Key Takeaways

- Context precision tells you whether the retriever returns useful chunks; context recall tells you whether it returns all the chunks needed; faithfulness tells you whether the answer is grounded in the retrieved context.
- The three metrics interact: low context recall can hide as high faithfulness if the model refuses to answer. Always read them together.
- Context precision is ranking-aware and rewards good rerankers. Context recall is position-agnostic and rewards complete retrieval.
- Faithfulness uses an LLM judge to verify atomic claims. The choice of judge model materially affects the score.
- Production targets are typically 0.7 context precision, 0.85 context recall, and 0.85 faithfulness, but absolute targets vary by domain.
- When metrics drop, follow a decision tree: low recall means retrieve more or chunk differently, low precision means rerank or rewrite queries, low faithfulness means prompt or model.

---

## Why These Three Metrics

A RAG pipeline has three jobs. First, find documents that might contain the answer. Second, return enough of them that the answer is fully covered. Third, generate text that reflects the retrieved documents. Failures in any of the three jobs ruin the output, but the fixes are different.

Context precision targets job one. It penalizes retrieving irrelevant documents and rewards ranking the relevant ones higher. Context recall targets job two. It penalizes missing information and rewards retrievers that cover the answer fully. Faithfulness targets job three. It penalizes generators that wander from the retrieved context and rewards grounded responses.

By looking at all three you can tell which subsystem is the bottleneck. High recall but low precision means the retriever finds the right documents but also picks up noise; reranking helps. Low recall means the retriever misses information; more diverse retrieval, larger top-k, or better embeddings help. Low faithfulness with good retrieval means the prompt or model is the problem; tighter prompts or a stronger model help.

---

## Faithfulness in Detail

Faithfulness measures whether the generated answer is supported by the retrieved contexts. The metric pipeline has three stages. First, the judge LLM extracts atomic claims from the answer. An atomic claim is a single declarative statement that can be true or false. Second, for each claim, the judge checks whether the retrieved contexts support it. The check uses natural language inference: does the context entail the claim. Third, the score is the fraction of claims supported by the contexts.

\`\`\`python
from ragas import evaluate
from ragas.metrics import faithfulness
from datasets import Dataset

dataset = Dataset.from_dict({
    "question": ["What is the limit on uploads?"],
    "contexts": [["Uploads are capped at 100 MB per file."]],
    "answer": ["Upload limit is 100 MB per file, but multipart supports 5 GB."],
    "ground_truth": ["100 MB single, 5 GB multipart."],
})

result = evaluate(dataset, metrics=[faithfulness])
print(result)
\`\`\`

In this example the model returned a claim about multipart that is not in the context. Faithfulness would score this 0.5 (one of two claims supported). The score immediately flags the unsupported claim.

The atomic claim extraction is the most fragile part of the pipeline. The judge must split the answer into single-fact units without merging or splitting incorrectly. Modern judge LLMs do this well on English text but can struggle with code, structured data, or long compound sentences. Inspect the extracted claims when faithfulness scores seem off; the bug is often in extraction, not entailment.

Faithfulness is reference-free. It does not need a gold answer; only the contexts. This makes it useful for production monitoring where you can log questions, contexts, and answers but cannot label every example.

| Failure Mode | Faithfulness Behavior |
| --- | --- |
| Hallucination | Score drops |
| Mixing context and parametric knowledge | Score drops |
| Refusing to answer | Score is undefined or 1.0 (no claims) |
| Paraphrasing context faithfully | Score remains high |
| Adding correct but ungrounded reasoning | Score drops |

The last row is a known weakness. A model that adds correct facts not present in the context will be penalized even though the response is accurate. Some teams handle this by including chain-of-thought scratchpads in the context, which makes the reasoning officially part of the grounded context.

---

## Context Precision in Detail

Context precision measures the signal-to-noise ratio of the retriever. For each retrieved chunk, the metric asks the judge LLM whether the chunk is useful for answering the question. The score is a weighted average that puts more weight on chunks ranked higher in the retrieval order.

\`\`\`python
from ragas.metrics import context_precision

result = evaluate(dataset, metrics=[context_precision])
\`\`\`

The exact formula is: for k chunks where the first j of them are relevant according to the judge, context precision is the average of (number of relevant chunks in positions 1 through i) divided by i, summed over all positions where chunk i is relevant. The ranking awareness rewards putting the most useful chunks first.

| Position | Chunk Relevance | Precision Contribution |
| --- | --- | --- |
| 1 | Relevant | 1.0 |
| 2 | Irrelevant | 0 |
| 3 | Relevant | 2/3 |
| 4 | Relevant | 3/4 |

The example above has three relevant chunks in five positions, but their positions matter. If the relevant chunks were all in positions 1-3 the score would be higher than if they were in positions 3-5.

Improving context precision usually involves a reranker. A common pattern is to retrieve the top 20 from a vector store, then rerank to the top 5 with a cross-encoder like ms-marco-MiniLM-L-12-v2 or Cohere Rerank. Rerankers see both the query and the chunk text and can score relevance more accurately than embedding similarity alone.

\`\`\`python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-12-v2")
pairs = [(query, chunk) for chunk in candidate_chunks]
scores = reranker.predict(pairs)
ranked = sorted(zip(candidate_chunks, scores), key=lambda x: -x[1])[:5]
\`\`\`

Reranking typically improves context precision by 10 to 20 percentage points on diverse benchmarks. The cost is one additional inference call per query, which is usually small relative to the generation call.

---

## Context Recall in Detail

Context recall measures whether the retrieval system fetched all the information needed to answer the question. The metric requires ground truth. The judge extracts claims from the ground truth, then checks whether each claim is supported by the retrieved contexts. Recall is the fraction of ground-truth claims covered.

\`\`\`python
from ragas.metrics import context_recall

result = evaluate(dataset, metrics=[context_recall])
\`\`\`

Context recall is the most important metric for retrieval quality. If the retriever misses information, the generator cannot recover. Even a perfect generator will refuse or hallucinate when context is incomplete.

| Failure Mode | Recall Behavior |
| --- | --- |
| Retriever misses critical chunk | Score drops sharply |
| Retriever returns extra chunks | Score unchanged |
| Chunks are too small to cover answer | Score drops |
| Chunks are huge but contain answer | Score remains high |

The interaction with chunking is subtle. Small chunks improve precision (each chunk is more focused) but hurt recall (information that spans chunk boundaries is split). Large chunks improve recall but hurt precision. Most teams settle on chunks of 500 to 1000 tokens with overlap of 50 to 200 tokens, then tune from there.

Multi-hop questions are the typical failure mode for recall. If the answer requires combining information from two documents, the retriever must return both. Naive top-k retrieval may rank one document very high and miss the other. Solutions include query decomposition (breaking the question into sub-questions and retrieving for each), iterative retrieval (running the retrieve-generate loop multiple times), and graph-based retrieval (following links between documents).

---

## How the Three Metrics Interact

The three metrics are not independent. Reading them in isolation can mislead. Reading them together gives a complete picture.

| Faithfulness | Context Precision | Context Recall | Diagnosis |
| --- | --- | --- | --- |
| High | High | High | System is healthy |
| High | High | Low | Retriever misses information; generator refuses or hedges |
| High | Low | High | Generator ignores noise but retrieval is noisy |
| High | Low | Low | Generator refuses often; retrieval is broken |
| Low | High | High | Generator hallucinates despite good context |
| Low | High | Low | Generator hallucinates to fill gaps |
| Low | Low | High | Generator distracted by noise |
| Low | Low | Low | System is broken; fix retrieval first |

The most counter-intuitive case is high faithfulness with low recall. When the retriever misses information, a well-prompted model refuses to answer. The refusal is faithful (it does not invent facts) but the system is still failing the user. To catch this, pair Ragas with a user-facing metric like task completion rate or escalation rate.

The most dangerous case is low faithfulness with high recall. The generator ignores good context and hallucinates anyway. This usually means the prompt is poorly designed or the model is too weak. Strengthening the prompt to require citations or upgrading the model usually fixes it.

---

## Threshold Setting

Absolute thresholds are domain-dependent, but rough guidelines hold across applications.

| Metric | Acceptable | Production | Excellent |
| --- | --- | --- | --- |
| Faithfulness | 0.75 | 0.85 | 0.95 |
| Context Precision | 0.60 | 0.75 | 0.90 |
| Context Recall | 0.75 | 0.85 | 0.95 |

The right threshold for your system depends on the cost of errors. Customer service bots that escalate to a human can tolerate lower faithfulness because humans catch errors. Medical or legal applications require very high faithfulness because the cost of error is high.

Set thresholds based on a baseline run. Compute the metrics once with your current pipeline, set the threshold at 95 percent of the observed value, and treat any future score below the threshold as a regression. Adjusting the threshold up requires improving the system; do not lower it to make CI pass.

---

## Diagnostic Workflows

When a metric drops, follow a structured workflow rather than guessing.

For low context recall, first inspect which ground-truth claims are missing from the contexts. If specific terms or entities recur, your embeddings probably do not capture them. Try a different embedding model, add keyword search as a hybrid retrieval signal, or increase top-k. If the missing claims are scattered across the documents, your chunking is probably too aggressive. Try larger chunks or more overlap.

For low context precision, inspect which chunks the judge marked as irrelevant. If many irrelevant chunks are returned, your retriever is over-fetching. Either reduce top-k or add a reranker. If irrelevant chunks are domain-adjacent (similar topic but wrong sub-topic), query rewriting can help. Send the user query through a small LLM that rewrites it for retrieval.

For low faithfulness, inspect which claims the judge marked as unsupported. If the unsupported claims are factual statements, the model is hallucinating; tighten the prompt or upgrade the model. If the unsupported claims are reasoning steps, your prompt may be inviting the model to extrapolate; constrain it to summarize only the retrieved context.

---

## Hybrid Retrieval

A common pattern for improving both context precision and context recall is hybrid retrieval: combining dense vector search with sparse keyword search (BM25) and merging the results. Dense search captures semantic similarity; sparse search captures exact term matches. The combination typically improves recall by 5 to 10 percentage points and improves precision when paired with a reranker.

\`\`\`python
from rank_bm25 import BM25Okapi

# Dense retrieval (your vector store)
dense_hits = vector_store.search(query, k=20)

# Sparse retrieval
tokenized_corpus = [doc.split() for doc in all_chunks]
bm25 = BM25Okapi(tokenized_corpus)
sparse_hits = bm25.get_top_n(query.split(), all_chunks, n=20)

# Reciprocal rank fusion
def rrf_merge(dense, sparse, k=60):
    scores = {}
    for rank, doc in enumerate(dense):
        scores[doc] = scores.get(doc, 0) + 1 / (k + rank)
    for rank, doc in enumerate(sparse):
        scores[doc] = scores.get(doc, 0) + 1 / (k + rank)
    return sorted(scores.items(), key=lambda x: -x[1])

merged = rrf_merge(dense_hits, sparse_hits)
\`\`\`

After merging, send the top 10 through a reranker to get the final top 5. This pipeline typically achieves the best balance of precision and recall.

---

## Judge Prompt Design

The judge prompts that Ragas uses internally are well-tuned defaults, but you can override them for domain-specific needs.

A common customization is to instruct the judge about your domain vocabulary. If you build a medical RAG, the judge needs to know that "myocardial infarction" and "heart attack" refer to the same thing. Without this hint, the judge may mark relevant chunks as irrelevant due to vocabulary mismatches.

\`\`\`python
from ragas.metrics import Faithfulness

custom_faithfulness = Faithfulness(
    name="medical_faithfulness",
    nli_prompt=custom_nli_prompt,  # your domain-aware NLI prompt
)
\`\`\`

Test custom prompts on a small calibration set before rolling out. A custom prompt that scores higher than the default is suspicious; verify that the score reflects real quality, not prompt leniency.

---

## Watching for Metric Drift

In production, metric values can drift even without code changes. Document distributions shift, user query patterns change, and base models silently update. Monitor the metrics over time and alert when a metric drops by more than 5 percentage points relative to a rolling baseline.

A simple monitoring pipeline collects samples from production traffic, runs Ragas on the samples nightly, and ships the metrics to a time-series database. Set alerts for sudden drops, gradual decline over a week, and unusual variance. Most regressions surface as gradual decline; sudden drops usually indicate a deployment issue.

---

## Internal Resources

- The full Ragas metrics reference is at /blog (Ragas RAG Evaluation Metrics Complete Guide).
- Browse LLM evaluation skills at /skills.
- Compare Ragas to OpenAI Evals and promptfoo on /blog.

---

## Conclusion

Context precision, context recall, and faithfulness are the three numbers that describe whether a RAG system is doing its job. Each metric catches a specific failure mode, and together they cover the full pipeline. Master these three metrics, set thresholds based on a baseline, and use the diagnostic workflows when scores drop. Once these three are stable, layer in answer correctness and aspect critiques for domain-specific concerns. Explore [/skills](/skills) for related RAG evaluation tools and the [/blog](/blog) for further deep dives.
`,
};
