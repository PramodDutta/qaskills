import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing RAG Reranker Regressions',
  description:
    'Test RAG reranker regressions with frozen candidate sets, graded relevance, ranking metrics, slice thresholds, pair diagnostics, and safe rollout gates.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing RAG Reranker Regressions

The retriever returns the right policy clause at rank eight. The old reranker moves it to rank two; the candidate model pushes it to rank nineteen, below the context cutoff. Generation quality collapses even though retrieval recall, prompt code, and the source index are unchanged. That is a reranker regression, and end-to-end answer scores alone make it unnecessarily difficult to locate.

Reranker testing needs a controlled boundary: one query, a frozen candidate list, relevance judgments, and the ordered scores produced by each model. Once that boundary is stable, ranking metrics and pair-level diagnostics can tell you which update changed ordering, for which content slice, and whether the change is safe to ship.

## Freeze candidates to isolate the reranker

A live RAG evaluation often changes several variables at once. Embedding model updates alter candidates, index refreshes add documents, metadata filters change eligibility, and approximate nearest-neighbor search can vary under load. If the goal is to evaluate a cross-encoder or scoring service, store the candidate IDs and text that enter it.

The frozen record should preserve enough context to replay scoring without reaching the current index:

| Field | Why retain it | Failure prevented |
|---|---|---|
| Query text | Exact model input | Normalization drift hidden by a query ID |
| Candidate ID | Stable comparison key | Confusing duplicate passages |
| Candidate text | Replayable scoring input | Index edits changing the experiment |
| Retriever rank and score | Baseline context | Blaming reranker for missing candidates |
| Metadata visible to reranker | Feature parity | Offline input differs from serving input |
| Relevance grade | Expected usefulness | Metrics based only on model agreement |
| Judgment provenance | Human, rule, or production signal | Treating weak labels as ground truth |

Freeze the candidate pool at a depth larger than the generation cutoff. If production retrieves 100 and reranks the top 50 before selecting five passages, the evaluation should reproduce those boundaries. Testing only the final five from the old system gives the candidate model no chance to promote a better passage that the old reranker missed.

The [RAG retrieval testing best practices](/blog/rag-retrieval-testing-best-practices-2026) covers candidate recall and index behavior. Keep those results adjacent, because a reranker cannot rescue evidence the retriever never supplied.

## Grade usefulness at the passage level

Binary “relevant” labels are easy to aggregate and often too crude. A passage may directly answer the query, provide supporting context, mention the entity without answering, contradict the current policy, or be a duplicate of a stronger chunk. Graded labels make discounted cumulative gain meaningful and let reviewers express degrees of usefulness.

One workable rubric uses 0 to 3:

| Grade | Interpretation for a support-policy RAG system | Example judgment |
|---:|---|---|
| 3 | Direct, current evidence sufficient for the answer | Exact refund window and eligibility rule |
| 2 | Substantive supporting evidence | Definition of the product category in the rule |
| 1 | Topically related but not answer-bearing | General returns page with no window |
| 0 | Irrelevant, obsolete, or misleading | Policy for a different country or discontinued plan |

Write the rubric for the domain. A code assistant may value a compiling API example above conceptual documentation; a medical search system needs authority, date, and patient context. Do not transfer grades between use cases merely because the passage text is identical.

Judge candidates without showing annotators which model ranked them. Randomize order and include stable IDs so duplicate passages can be recognized. For consequential slices, use more than one judge and adjudicate disagreements. LLM-assisted labeling can accelerate triage, but calibrate it against humans and retain provenance rather than silently presenting its output as settled truth.

## Compute metrics at the deployed cutoff

Mean reciprocal rank is useful when one highly relevant passage should appear early. Recall at k asks whether enough judged evidence survived the context cutoff. Normalized discounted cumulative gain rewards graded relevance near the top. No single metric describes every RAG context policy.

| Metric | Strong fit | Blind spot |
|---|---|---|
| MRR | First answer-bearing passage matters most | Ignores useful evidence after the first relevant item |
| Recall@k | Context must include all required evidence | Does not care about ordering inside k |
| Precision@k | Limited context should avoid noise | Penalizes supporting passages if labels are incomplete |
| NDCG@k | Multiple relevance grades and position matter | Depends heavily on consistent grading |
| Pairwise accuracy | Known document preferences are available | Does not directly model the final cutoff |

Report metrics at production-relevant k values, not only 10 because it is conventional. If the prompt accepts four chunks, NDCG@4 and evidence recall@4 deserve attention. Also inspect a larger cutoff to understand whether relevant material was mildly demoted or removed from practical reach.

The following Python evaluator uses the real \`sentence-transformers\` \`CrossEncoder\` API and scikit-learn's \`ndcg_score\`. The candidate array is deliberately frozen in the fixture.

\`\`\`python
from dataclasses import dataclass
from sentence_transformers import CrossEncoder
from sklearn.metrics import ndcg_score


@dataclass(frozen=True)
class Candidate:
    doc_id: str
    text: str
    relevance: int


def evaluate_query(model: CrossEncoder, query: str, candidates: list[Candidate], k: int):
    pairs = [(query, candidate.text) for candidate in candidates]
    scores = model.predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda item: float(item[1]), reverse=True)

    ordered_grades = [candidate.relevance for candidate, _ in ranked]
    true_relevance = [[candidate.relevance for candidate in candidates]]
    predicted_scores = [[float(score) for score in scores]]
    ndcg = ndcg_score(true_relevance, predicted_scores, k=k, ignore_ties=False)

    relevant_total = sum(candidate.relevance >= 2 for candidate in candidates)
    relevant_at_k = sum(grade >= 2 for grade in ordered_grades[:k])
    recall_at_k = relevant_at_k / relevant_total if relevant_total else 1.0

    return {
        "ndcg": float(ndcg),
        "recall": recall_at_k,
        "ranking": [(candidate.doc_id, float(score)) for candidate, score in ranked],
    }


model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
candidates = [
    Candidate("current-policy", "Refund requests are accepted within 30 days.", 3),
    Candidate("shipping", "Standard delivery takes three to five business days.", 0),
    Candidate("old-policy", "Archived policy: requests were accepted within 14 days.", 0),
    Candidate("condition", "Returned items must include the original serial label.", 2),
]

result = evaluate_query(model, "How long do I have to request a refund?", candidates, k=2)
print(result)
\`\`\`

For a production harness, load model revisions from immutable artifact identifiers, batch pairs, and write raw scores plus ranked IDs to an evaluation artifact. The model name above demonstrates the API, not a claim that it suits every domain.

## Compare models query by query, not only by averages

An average NDCG improvement can coexist with a severe loss on compliance queries. Compute the delta per query and sort from worst to best. For every large negative delta, show the old ranking, new ranking, grades, score changes, metadata, and passage text diff.

Slices should correspond to failure mechanisms: query language, short versus conversational query, product family, document age, table-heavy content, negation, exact identifier lookup, and multi-hop evidence. Keep slice definitions stable in source control. Creating a slice after seeing a failure is useful for diagnosis, but label it exploratory until it has enough examples to become a gate.

Weighting queries by production traffic may help estimate aggregate user impact, while an unweighted view protects rare but important intents. Publish both when traffic concentration is high. A password-reset query repeated thousands of times should not erase a catastrophic demotion in a low-volume safety policy.

## Build gates around tolerances and critical sets

Bit-for-bit equality is rarely a useful upgrade rule. Model runtimes, quantization, hardware, and tie handling can introduce small score differences without changing useful order. Define gates around ranking outcomes and allowed regression budgets.

A practical policy can have three layers:

1. Critical queries must retain at least one grade-3 passage inside the deployed cutoff.
2. No established slice may fall more than its reviewed NDCG tolerance.
3. Overall metrics must meet a floor and cannot decline beyond a small agreed margin.

Set the values from historical variance and product risk, not from a number copied from another team. Record absolute metrics and deltas. A 0.02 decline has different meaning when the baseline is 0.98 versus 0.42.

\`\`\`python
import json
from pathlib import Path

import pytest
from sentence_transformers import CrossEncoder


CASES = json.loads(Path("tests/reranker_cases.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["query_id"])
def test_candidate_reranker_preserves_critical_evidence(
    case, old_model: CrossEncoder, candidate_model: CrossEncoder
):
    def rank(model: CrossEncoder) -> list[str]:
        pairs = [(case["query"], item["text"]) for item in case["candidates"]]
        scores = model.predict(pairs)
        scored = zip(case["candidates"], scores)
        return [item["doc_id"] for item, _ in sorted(
            scored, key=lambda pair: float(pair[1]), reverse=True
        )]

    old = rank(old_model)
    new = rank(candidate_model)

    grades = {item["doc_id"]: item["relevance"] for item in case["candidates"]}
    cutoff = case["context_cutoff"]

    old_critical = {doc_id for doc_id in old[:cutoff] if grades[doc_id] == 3}
    new_critical = {doc_id for doc_id in new[:cutoff] if grades[doc_id] == 3}

    if case["critical"]:
        assert new_critical, (
            f"critical evidence left top {cutoff}; old={old[:cutoff]} new={new[:cutoff]}"
        )

    assert len(new_critical) >= len(old_critical) - case["allowed_critical_loss"]
\`\`\`

Here \`old_ranker\` and \`candidate_ranker\` are project fixtures wrapping the actual serving interface. The test asserts a clear invariant and prints ranked IDs on failure. Metric aggregation can run in a companion test or evaluation command so one bad query does not hide behind a corpus average.

## Diagnose score drift and ordering drift separately

Some serving systems threshold reranker scores before choosing context. In that design, identical ordering with shifted score calibration can still remove every passage. Preserve raw scores and test both selection policy and ordering.

Score magnitudes are often model-specific. A threshold tuned for one model revision should not automatically transfer to another. Plot score distributions by relevance grade, examine overlap, and retune on a validation set if the new model changes calibration. Do not retune on the final regression set and then report that same set as unbiased evidence.

Ties require deterministic handling. Define a stable secondary key, usually retriever rank or candidate ID, so an equal-score batch does not reorder across runtimes. If the API returns floating-point values with tiny hardware differences, compare outcome metrics rather than demanding exact decimal equality.

## Include adversarial ranking cases from the corpus

Rerankers can overvalue lexical overlap. Store pairs where an obsolete passage repeats the query words while a current passage paraphrases the answer. Include negation, similarly named products, policy exceptions, conflicting dates, boilerplate-heavy pages, and chunks whose title is relevant but body is not.

Duplicate chunks deserve explicit handling. Promoting four near-identical passages can produce good relevance metrics while wasting the context window. Add a diversity or redundancy diagnostic after ranking. It may belong to a separate context-selection stage, but the reranker evaluation should reveal the concentration.

For multi-hop questions, label evidence sets rather than isolated relevance only. A passage about eligibility and a passage about time limits may both be necessary. Evidence-set recall at the final cutoff is more faithful than MRR in that case.

## Keep offline inputs faithful to serving

Tokenizer version, maximum sequence length, truncation direction, query-document separator, document title formatting, precision mode, and batch construction can all alter scores. The offline evaluator should call the same wrapper used by the service or share a versioned preprocessing package.

Record these in every run:

- Model artifact and tokenizer identifiers.
- Container or library versions.
- Maximum input length and truncation rule.
- Hardware and inference precision.
- Candidate depth, final cutoff, and tie-breaker.
- Hash of the judgment dataset and text snapshot.

If production uses a remote reranking API, test the exact request construction and response mapping. A local substitute with a similar architecture cannot catch an inverted score sort or document-ID alignment bug.

## Evaluate latency beside relevance

Cross-encoders score query-document pairs and can add material latency as candidate depth grows. Measure p50 and tail latency at realistic batch sizes, text lengths, and concurrency. A relevance gain that violates the retrieval-stage budget may reduce end-to-end quality through timeouts or aggressive fallback.

Keep performance and ranking gates connected but distinct. A cached offline replay can compare quality deterministically; a service-level load test covers batching, queueing, accelerators, and serialization. Confirm fallback behavior when the reranker times out: does the system use retriever order, return fewer passages, or fail the request?

The broader [RAG regression testing guide](/blog/rag-regression-testing-guide-2026) explains how reranker evidence joins retrieval and answer-generation checks.

## Roll out with disagreement logging

Before switching traffic, shadow-score a sampled candidate set with the new model. Log old and new ranked IDs, bounded score information, latency, model revision, and query category, subject to privacy rules. High-disagreement cases are valuable candidates for human judgment.

Do not treat clicks as uncomplicated relevance labels. Rank position affects exposure, and a click can reflect a poor answer, attractive title, or user confusion. Debias and aggregate behavioral signals cautiously. They complement the curated regression set; they do not replace it.

A canary should define rollback around user and system outcomes, not only offline NDCG. Watch no-answer rates, context fallback, latency, error rate, and support escalations for affected intents. Keep the old artifact available until the canary window and delayed signals are complete.

## Sweep candidate depth and context cutoff

A model comparison at one pair of depths can hide where the candidate actually helps. Evaluate a small grid: retriever candidates presented to the reranker on one axis, chunks admitted to generation on the other. This shows whether quality saturates early, whether the new model needs a deeper pool, and whether its gains disappear under the product's tight context limit.

Do not choose the best cell on the final regression corpus and declare victory. Use a development set to select candidate depth and cutoff, then evaluate the fixed choice on held-out queries. Deeper reranking increases pair count and latency, while a larger context can increase generation cost and distract the answer model.

Report critical-evidence survival at each cutoff. If a required clause moves from rank three to rank six, NDCG@10 may change slightly while a four-chunk application fails completely. A cutoff sweep makes that discontinuity visible.

## Inspect pair flips around the boundary

For every regressed query, compare documents that crossed the context boundary. A pair flip between two grade-3 passages may be harmless; a grade-0 passage displacing the only grade-3 passage is urgent. Create a review sheet with query, both texts, grades, old and new scores, and source metadata.

Pair analysis often exposes systematic features: outdated dates receive too much weight, titles dominate bodies, long passages are truncated before the answer, or exact query terms overpower negation. Those findings can drive hard-negative training and corpus cleanup. Keep the original regression case even after a training fix, because it is now a known model weakness.

When score differences are tiny, inspect the tie-breaker before blaming semantics. If differences are large but ordering is wrong, check document alignment in batching. A shifted score array can produce catastrophic ranks while each individual score looks plausible in logs.

## Frequently Asked Questions

### Should reranker tests query the live vector database?

Not when isolating the reranker. Replay frozen candidate text and IDs. Run separate retrieval integration tests against the index, then add a smaller end-to-end evaluation to verify the stages connect correctly.

### Which ranking metric should gate a RAG reranker?

Choose from the context policy. NDCG at the deployed cutoff works well for graded passages, while evidence recall fits multi-document requirements and MRR fits one-answer-bearing-passage tasks. Most systems need more than one view.

### Can an LLM judge passage relevance automatically?

It can propose labels or scale review, but calibrate it against domain experts, pin its prompt and version, and retain label provenance. Critical or ambiguous cases should receive human adjudication.

### Why did answer quality fall when reranker NDCG improved?

The metric may miss evidence diversity, multi-hop completeness, score thresholds, prompt ordering, latency fallback, or a weak slice. Inspect final selected context and answer-level results rather than assuming one aggregate metric covers the pipeline.

### How large should the frozen candidate set be?

Match the candidate depth presented to the production reranker and preserve enough items to observe promotions and demotions around the final cutoff. A set containing only yesterday's selected chunks is biased toward the old model.
`,
};
