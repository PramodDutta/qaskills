import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "RAG Evaluation Interview Questions and Answers",
  description:
    "Prepare for RAG evaluation interview questions with senior-level answers on retrieval, grounding, citations, metrics, datasets, debugging, and release gates.",
  date: "2026-07-13",
  category: "AI Testing",
  content: `
# RAG Evaluation Interview Questions and Answers

“The answer is correct, so why did the RAG test fail?” is the point where a shallow interview answer falls apart. The system may have retrieved irrelevant passages, copied an unsupported claim from model memory, cited the wrong document, or answered a question the corpus was never meant to cover. Correctness is one outcome; retrieval quality, grounding, attribution, and abstention are separate behaviors.

The questions below are arranged as an investigation, from defining the unit under test through diagnosing a production regression. Strong answers make assumptions explicit, distinguish offline measurements from live outcomes, and refuse to compress a multi-stage system into one score.

## Opening diagnosis: what exactly are you evaluating?

### 1. How would you decompose quality in a RAG system?

I would separate at least five layers: corpus quality, indexing and retrieval, context assembly, generation, and end-to-end user outcome. Retrieval tests ask whether useful evidence appears and where it ranks. Context tests ask whether truncation, deduplication, or metadata filtering removed it. Generation tests ask whether the answer follows the supplied evidence. End-to-end tests ask whether the final response is correct, relevant, cited, safe, and appropriately abstains.

The decomposition is diagnostic. If retrieval recall is strong but grounded correctness falls, tuning vector search is unlikely to fix the main defect. If the answer is good only when a gold context is injected, the generator is capable and the retrieval path deserves attention.

### 2. What belongs in a RAG evaluation record?

At minimum: user query, normalized intent, corpus snapshot, expected evidence identifiers, answerability label, retrieved chunk IDs with ranks and scores, assembled context, generated answer, expected claims or reference answer, citation expectations, and slice metadata. I would also record embedding, reranker, prompt, model, and indexing versions.

That provenance lets a failed item be replayed. Saving only the final answer loses the chain needed to determine whether a document changed, a chunk moved, or the generator ignored evidence it received.

| Record field | Debugging question it answers | Common mistake if absent |
| --- | --- | --- |
| Corpus snapshot or document version | Did the source change? | Blaming model drift for content drift |
| Ranked chunk IDs | Was evidence retrieved, and how high? | Treating a generation miss as retrieval failure |
| Assembled prompt context | Did packing drop the evidence? | Assuming retrieved means delivered to the model |
| Claim and citation labels | Which statement lacks support? | Scoring the answer as one opaque block |
| Answerability | Should the system have answered at all? | Rewarding plausible guesses on missing knowledge |

### 3. Why is a reference answer not enough?

Many phrasings can be correct, and a reference may itself be incomplete. It also does not say which source supports which claim. I prefer atomic expected claims plus acceptable evidence IDs, with a reference response as an example. For unanswerable questions, the oracle should specify the expected abstention behavior rather than invent a “correct” paragraph.

## Retrieval questions that reveal ranking knowledge

### 4. Explain recall@k and precision@k in RAG terms.

Recall@k asks how much of the known relevant evidence appears in the first k results. Precision@k asks what fraction of those k results is relevant. If one relevant document exists and appears at rank 4, recall@5 is 1 and precision@5 is 0.2. The measures answer different questions: did we find the evidence, and how much noise accompanies it?

Chunk-level labels complicate interpretation. Five adjacent chunks from one useful document can inflate apparent precision without adding information. I would define relevance at the evidence-unit level and report document as well as chunk metrics when chunk duplication is material.

### 5. When is mean reciprocal rank useful?

MRR rewards placing the first relevant result early. It fits queries where one strong passage is sufficient. It is less informative when an answer requires multiple independent pieces, such as eligibility plus an exception rule. For those, evidence recall, coverage, or nDCG with graded relevance can describe ranking better.

### 6. Write a small retrieval metric without a framework.

This runnable Python example calculates recall@k, precision@k, and reciprocal rank for one query. It uses sets for relevant IDs and preserves rank for the returned list.

\`\`\`python
from __future__ import annotations


def retrieval_scores(
    retrieved: list[str],
    relevant: set[str],
    k: int,
) -> dict[str, float]:
    top_k = retrieved[:k]
    hits = [doc_id for doc_id in top_k if doc_id in relevant]
    recall = len(set(hits)) / len(relevant) if relevant else 1.0
    precision = len(hits) / k if k else 0.0
    first_rank = next(
        (rank for rank, doc_id in enumerate(retrieved, start=1) if doc_id in relevant),
        None,
    )
    reciprocal_rank = 1.0 / first_rank if first_rank else 0.0
    return {
        "recall_at_k": recall,
        "precision_at_k": precision,
        "reciprocal_rank": reciprocal_rank,
    }


print(
    retrieval_scores(
        retrieved=["handbook-9", "policy-2", "policy-7", "faq-3"],
        relevant={"policy-2", "policy-7"},
        k=3,
    )
)
\`\`\`

A senior answer should mention the denominator choice. Some teams divide precision by the number actually returned when fewer than k results exist; others use k. Pick a definition, document it, and keep dashboards consistent.

### 7. How would you evaluate hybrid search?

Use a shared labeled query set to compare lexical, dense, hybrid, and hybrid-plus-reranking configurations. Report per-slice metrics, not only an overall average. Exact product codes may favor lexical retrieval; paraphrased policy questions may favor dense retrieval. Check latency and candidate pool size because an accuracy win that violates the response budget is not deployable.

I would also inspect overlap. If hybrid returns almost the same results as one branch, the fusion weights or candidate depth may not be contributing.

### 8. What retrieval negatives belong in the dataset?

Include near-duplicate policies with different effective dates, same terminology from the wrong product, documents lacking tenant permission, obsolete pages, and passages that mention query words but contradict the required rule. Random unrelated negatives are too easy. Hard negatives expose filtering and ranking failures that lead to confident but wrong answers.

## Grounding and faithfulness under cross-examination

### 9. Define groundedness without using “sounds correct.”

Break the answer into verifiable claims, then determine whether each claim is entailed by the provided context. Groundedness or faithfulness is the supported-claim proportion under that annotation policy. A claim can be factually true in the world but ungrounded if the supplied evidence does not support it. That distinction matters when the product promises answers from an approved corpus.

### 10. How do you handle partially supported sentences?

Split compound sentences into atomic claims. “The plan costs $20 and can be cancelled any time” contains at least two. One source may support price but not cancellation. Sentence-level labels would over-credit or over-penalize it. The annotation guide should define granularity and examples so reviewers split consistently.

### 11. Is an LLM judge enough for faithfulness?

No. It is a scalable estimator that needs human calibration. I would measure agreement on a reviewed subset, inspect false support judgments caused by lexical overlap, and use deterministic verification for structured facts where possible. The judge prompt, model version, and decoding settings are evaluator dependencies and must be versioned.

For high-risk claims, route disagreements or low-confidence cases to review. The objective is not to eliminate human judgment but to spend it where automated evidence is weak.

### 12. Show a deterministic claim-coverage check.

For structured expected facts, exact normalized values can provide a transparent first line. This example checks required policy facts represented as key-value pairs and returns missing or conflicting claims.

\`\`\`python
from dataclasses import dataclass


@dataclass(frozen=True)
class Fact:
    key: str
    value: str


def compare_facts(
    expected: list[Fact],
    extracted: list[Fact],
) -> dict[str, list[str]]:
    actual = {fact.key: fact.value.strip().casefold() for fact in extracted}
    missing: list[str] = []
    conflicting: list[str] = []
    for fact in expected:
        if fact.key not in actual:
            missing.append(fact.key)
        elif actual[fact.key] != fact.value.strip().casefold():
            conflicting.append(fact.key)
    return {"missing": missing, "conflicting": conflicting}


expected = [Fact("refund_window", "30 days"), Fact("fee", "none")]
candidate = [Fact("refund_window", "14 days"), Fact("fee", "none")]
assert compare_facts(expected, candidate) == {
    "missing": [],
    "conflicting": ["refund_window"],
}
\`\`\`

The extraction step needs its own validation. This check is excellent when generation already emits structured claims or when a deterministic parser exists. It is not a claim that arbitrary prose can be reliably reduced to facts without error.

## Citation questions with practical traps

### 13. What makes a citation correct?

I test three properties. Citation validity asks whether the identifier resolves to an allowed source version. Citation entailment asks whether the cited passage supports the associated claim. Citation completeness asks whether claims requiring evidence have citations. A response can contain valid links that support nothing, or excellent support for one claim while leaving another uncited.

### 14. How would you score citation precision and recall?

At claim level, citation precision is the proportion of attached citations that actually support the claim. Citation recall or completeness is the proportion of support-requiring claims with at least one adequate citation. I would report both because adding many weak citations can raise coverage while damaging precision.

### 15. What breaks when citations point to chunks?

Chunk IDs are often index implementation details. Re-chunking invalidates them even when the source document is unchanged. Persist stable document IDs, versions, and offsets or section anchors, then map retrieval chunks back to those identifiers. The evaluation should distinguish “source content changed” from “chunk boundary changed.”

### 16. How do permissions affect citation evaluation?

Relevance is not enough. Evidence must be authorized for the requesting user or tenant. Add adversarial queries where a highly relevant document belongs to another tenant, and assert it never enters retrieved results, context, answer, or citations. Log redaction matters too, because an evaluation trace can leak the forbidden passage even when the final response does not.

## Answer relevance, correctness, and abstention

### 17. How is answer relevance different from correctness?

Relevance asks whether the response addresses the user’s question directly and without distracting material. Correctness asks whether its claims are right. “Contact support” may be relevant but incomplete for a question about the documented refund window. A perfectly correct history of the company may be irrelevant. Keep the scores separate so tuning does not trade one silently for the other.

For a deeper metric taxonomy, see the [RAG evaluation metrics guide](/blog/rag-evaluation-metrics-complete-2026).

### 18. How do you evaluate unanswerable questions?

Create cases where the corpus genuinely lacks the answer, plus cases where a related document tempts a guess. The expected behavior should define an acceptable abstention, perhaps a clarification or safe escalation. Measure unsupported-answer rate and over-abstention on answerable questions together. Optimizing only abstention can produce a useless system that refuses everything.

### 19. What is a good answer-relevance threshold?

There is no portable number. Collect human relevance labels on representative outputs, calculate the metric’s errors at candidate cutoffs, and choose a threshold based on the cost of passing irrelevant answers versus reviewing acceptable ones. Recalibrate per evaluator and major domain shift. A score from one embedding model or judge is not numerically interchangeable with another.

| Release risk | Preferred gate | Supporting evidence |
| --- | --- | --- |
| Unsupported high-impact claim | Zero-tolerance claim check | Human-validated entailment sample |
| Missing required evidence | Per-slice citation completeness floor | Stable claim-citation annotations |
| Verbose but correct response | Review band on relevance | Human directness labels |
| Unanswerable query guessed | Maximum unsupported-answer count | Curated impossible and near-miss cases |
| Retrieval latency regression | Percentile latency budget | Production-like corpus and hardware |

## Scenario questions for a senior SDET

### 20. Retrieval recall improved, but answer accuracy fell. What do you inspect?

First check whether the added results are useful or noisy. Higher recall can expand context until relevant passages are truncated or diluted. Inspect rank positions, context packing, duplicate chunks, token budget, and attention to conflicting sources. Run generation with the old and new assembled contexts while holding the prompt and model fixed. Also inject the gold context to establish the generator ceiling.

### 21. Offline metrics pass, but users report stale answers. Why?

The evaluation corpus may be frozen on the same stale snapshot, or test queries may lack time-sensitive intents. Inspect ingestion lag, document effective dates, cache keys, index refresh failures, and source precedence. Add temporal cases with superseded documents and measure whether the newest authorized source ranks above old versions.

### 22. A reranker increases nDCG but doubles latency. Would you ship it?

I would compare the quality gain on business-critical slices against the end-to-end latency budget. Options include reranking fewer candidates, applying it only to ambiguous intents, using a cheaper model, or running it in parallel with other preparation. The decision needs percentile latency under representative load, not only a laptop average.

### 23. How would you investigate a single wrong cited answer?

Replay against the recorded corpus and versions. Trace query rewriting, filters, candidate retrieval, reranking, context assembly, generated claims, and citation attachment. Determine the first stage where expected evidence was lost or wrong evidence gained authority. Then add a regression at that stage and an end-to-end case. Fixing only the final prompt may mask an indexing defect.

### 24. What would you put in the pull request gate versus nightly evaluation?

The pull request gate gets deterministic schema checks, a compact high-risk golden set, retrieval metrics on a fixed local index, and zero-tolerance security cases. Nightly runs can afford a larger corpus, model judges, repeated samples, multilingual slices, load measurements, and vendor integrations. Production monitoring watches outcome proxies, abstention, citation clicks, feedback, latency, and drift, with privacy controls.

## How to present these answers in an interview

Use a concrete example and name the denominator. Instead of saying “I measure recall,” say “for each answerable policy query, I measure whether all annotated evidence units appear in the first ten authorized results.” State what the metric cannot prove. Explain how you would validate an LLM judge. Mention versioning and replay.

Behavioral rounds may ask how you handled ambiguous quality requirements or disagreed with a model engineer. The [behavioral interview questions for QA engineers](/blog/behavioral-interview-questions-qa-engineers) can help structure those stories around evidence, tradeoffs, and outcomes.

Avoid reciting a catalog of metric names. Interviewers are looking for causal debugging and risk judgment. A strong candidate can move from a bad answer to the first defective stage, design a labeled case that reproduces it, and choose a gate proportional to impact.

## Frequently Asked Questions

### Do I need to memorize formulas for a RAG evaluation interview?

Know the common definitions and be able to calculate a small example, but interpretation matters more than memorization. Explain relevance units, k, denominators, multi-evidence questions, and what a metric hides.

### How should I answer if the interviewer asks for one RAG score?

Say that a composite can summarize a dashboard but should not erase blocking dimensions. Propose separate gates for retrieval, grounded claims, citation coverage, answer relevance, abstention, security, and latency, then explain any aggregation transparently.

### What coding exercise is common for this topic?

Expect parsing ranked results, computing recall@k or reciprocal rank, comparing claim sets, or aggregating slice metrics. Clarify duplicate handling, empty relevance sets, missing outputs, and whether averaging is macro or weighted.

### How can I discuss LLM judges without sounding dismissive?

Treat them as useful evaluators with measurable error. Describe rubric design, human calibration, disagreement analysis, versioning, and review bands. That demonstrates practical adoption without granting the judge unearned authority.

### Which production signal complements offline RAG tests best?

No single signal does. Combine task outcomes and explicit feedback with abstention, citation interaction, retrieval telemetry, latency, and sampled expert review. Protect user data and remember that clicks or thumbs-up events are biased proxies, not ground truth.
`,
};
