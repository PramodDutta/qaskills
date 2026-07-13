import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Vector-Search Recall at K',
  description:
    'Test vector-search recall at K with defensible relevance labels, exact metric code, filtered-query diagnostics, and release gates tied to retrieval risk.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Vector-Search Recall at K

Query “cancel a transfer that is still pending” has three approved support passages, but the vector service returns only one in its first five results. That is recall at 5 of one-third for this query. The number is simple; building a test whose denominator is trustworthy is the real engineering work.

Recall at K asks what fraction of known relevant items appear within the first K retrieved results. It is a retrieval coverage metric, not a measure of ordering quality, answer correctness, or semantic elegance. Used with labeled queries and stable corpus versions, it detects missing evidence caused by embedding changes, index settings, filters, chunking, and approximate-nearest-neighbor search.

## Define the retrieval unit and relevance judgment

Before calculating anything, decide what counts as an item. It might be a document, section, chunk, product, image, or support case. A query with a relevant document split into six chunks can appear to have excellent chunk recall while providing only one distinct source.

For RAG, label evidence spans in canonical documents and map returned chunks to those spans. For recommendation or similar-item search, label item IDs directly. Keep the metric name explicit, such as \`chunk_recall_at_10\` or \`document_recall_at_20\`.

| Retrieval unit | Relevant when | Common labeling hazard |
|---|---|---|
| Document | It contains sufficient answer evidence | Long documents receive credit for a tiny unrelated match |
| Chunk | The chunk itself contains usable evidence | Rechunking invalidates ID-based labels |
| Passage span | Returned text covers the labeled offsets | Requires stable canonical extraction |
| Catalog item | It satisfies the user's stated need | Availability and policy can change relevance |
| Duplicate group | Any equivalent item is retrieved | Counting every mirror inflates denominator |

Relevance can be binary, graded, or conditional. Standard recall uses a binary relevant set. If assessors label “essential,” “helpful,” and “not relevant,” either define which grades enter the denominator or use an additional graded metric. Do not silently collapse labels differently between runs.

## Build query sets from real information needs

Sample production queries after privacy review, then add authored probes for critical content and known hard cases. Remove navigational noise, bot traffic, and queries whose intent cannot be determined. Preserve meaningful typos and terse phrasing if real users produce them.

Each evaluation record should include a stable query ID, text, relevant item IDs or spans, corpus version, locale, applicable metadata filters, intent slice, and label provenance. The query text alone is not sufficient when access control, tenant, date, or product availability changes which results are eligible.

Use at least two assessors for ambiguous domains when feasible, with an adjudication path. Record disagreement rather than manufacturing certainty. Subject-matter experts should label high-risk legal, medical, financial, or internal policy questions. Search engineers can help find candidates but should not unilaterally decide business relevance.

Pool candidates from multiple systems or configurations for labeling. If assessors only examine results from the current vector model, relevant items that every current system misses never enter the gold set. Combine lexical search, exact vector search, several embeddings, human navigation, and known citations, then judge the union.

## Calculate recall at K without hiding edge cases

For query \`q\`, let \`R_q\` be the set of relevant IDs and \`TopK_q\` the first K unique retrieved IDs. Recall is the size of their intersection divided by the size of \`R_q\`. Deduplicate returned IDs before scoring, or repeated results can create misleading behavior in other metrics.

\`\`\`python
from dataclasses import dataclass
from statistics import mean

@dataclass(frozen=True)
class EvaluationCase:
    query_id: str
    relevant_ids: frozenset[str]

def recall_at_k(relevant_ids: set[str] | frozenset[str], ranked_ids: list[str], k: int) -> float:
    if k <= 0:
        raise ValueError('k must be positive')
    if not relevant_ids:
        raise ValueError('recall is undefined when there are no known relevant items')

    unique_top_k = list(dict.fromkeys(ranked_ids))[:k]
    retrieved_relevant = relevant_ids.intersection(unique_top_k)
    return len(retrieved_relevant) / len(relevant_ids)

def macro_recall(cases: list[EvaluationCase], runs: dict[str, list[str]], k: int) -> float:
    scores = [
        recall_at_k(case.relevant_ids, runs[case.query_id], k)
        for case in cases
    ]
    return mean(scores)

assert recall_at_k({'p1', 'p2', 'p3'}, ['x', 'p2', 'y', 'p1'], 3) == 1 / 3
\`\`\`

Queries with no known relevant items do not have recall of zero. They have an undefined denominator and belong in a no-answer or rejection evaluation. Counting them as zero punishes correct abstention; counting them as one rewards any behavior.

Macro averaging gives every query equal weight. Micro recall sums retrieved relevant items across all queries and divides by all relevant labels, so queries with many relevant items dominate. Report which aggregation you use, and often report both.

## Select K from the consuming system

K is not an arbitrary dashboard number. It should correspond to the candidate budget passed to a reranker, the number displayed to a user, or the maximum evidence chunks considered by a generator. Report a curve across several useful values, such as 1, 3, 5, 10, and 20, but gate at the operational cutoff.

If the retriever returns 50 candidates to a reranker and the generator receives 6, measure retriever recall at 50 and final-stage recall at 6. A high first-stage score with low final recall implicates reranking or diversification. Calling both “recall at K” without the stage name obscures the failure.

| Stage | Representative K | Question answered |
|---|---:|---|
| ANN candidate generation | 50 or 100 | Did approximate search surface relevant candidates? |
| Cross-encoder reranking | 10 | Did the reranker retain relevant evidence near the top? |
| Context assembly | 4 to 12 | Did prompt selection keep required support? |
| User search page | Visible result count | Can the user see a relevant option without paging? |

Larger K cannot compensate indefinitely. It increases reranking cost, latency, review burden, and prompt tokens. A recall curve that rises only at very large K signals weak ranking or a difficult representation problem.

## Run the candidate system against a frozen snapshot

Pin corpus content, chunk IDs, embedding model version, preprocessing, distance metric, index build parameters, metadata, and query set. Rebuild the baseline when the corpus intentionally changes, but do not compare systems over different eligible documents and call the difference a model effect.

Persist raw ranked results with scores and metadata. Aggregates cannot diagnose a failure caused by a filter, missing namespace, or duplicate ingestion. Include index version and query configuration with every run artifact.

A minimal adapter can make evaluation independent of vendor response shapes:

\`\`\`python
from collections.abc import Callable

Search = Callable[[str, int, dict[str, str]], list[str]]

def evaluate(
    cases: list[dict],
    search: Search,
    k_values: tuple[int, ...] = (1, 5, 10),
) -> dict[int, list[float]]:
    results = {k: [] for k in k_values}
    max_k = max(k_values)
    for case in cases:
        ranked = search(case['query'], max_k, case.get('filters', {}))
        for k in k_values:
            results[k].append(recall_at_k(set(case['relevant_ids']), ranked, k))
    return results
\`\`\`

The production adapter should request at least the largest evaluated K and preserve returned order. Avoid querying separately for every K because approximate results, load, or nondeterministic ties can change between calls.

## Separate ANN recall from semantic recall

Two denominators are commonly confused. Semantic recall compares returned items with human relevance labels. ANN algorithm recall compares approximate neighbors with the exact nearest neighbors under the same vectors and distance function.

Exact-neighbor recall tests index quality: graph parameters, probes, quantization, and search effort. It does not prove those nearest vectors are relevant to humans. Semantic recall tests the whole representation and retrieval configuration, but cannot pinpoint whether a loss came from embeddings or approximation.

Run exact search on a manageable frozen subset if the database supports it, or compute brute-force distances offline. If approximate-to-exact recall falls while exact semantic recall stays stable, tune the ANN layer. If both systems retrieve the wrong content, inspect embeddings, preprocessing, labels, and query formulation.

Never label exact vector neighbors as ground truth relevance. They are a computational oracle for the approximate algorithm only.

## Diagnose metadata filters as part of retrieval

Production vector queries often include tenant, language, date, permissions, geography, or content-state filters. Evaluation without these filters can report excellent recall for results the user is forbidden or unable to consume.

Apply each case's authentic eligibility rules. Verify relevant labels are themselves eligible under the frozen metadata. A gold item marked \`locale=en-GB\` cannot fairly count against a query filtered to \`en-US\` unless fallback is the intended contract.

Pre-filtering and post-filtering behave differently. Post-filtering the top K can leave fewer than K results and destroy recall even when relevant candidates exist lower in the vector ranking. Increase candidate depth or use native filtered indexing according to measured behavior, not assumptions.

Include negative security tests that ensure forbidden items never appear. Recall has no penalty for irrelevant or unauthorized results, so it must be paired with precision, policy assertions, or explicit leakage checks.

## Inspect per-query losses and score distributions

An average regression should lead to a diff list. For each query, show baseline recall, candidate recall, lost relevant IDs, gained IDs, their ranks, filters, and top returned titles. Sort critical losses first.

Slice by intent, locale, query length, rare terminology, document age, and number of relevant items. Embedding changes often help conversational queries while hurting exact identifiers, or improve one language at another's expense. A global mean hides those tradeoffs.

Scores from different embedding models or distance metrics are not directly comparable. Use ranks and relevance outcomes for cross-model comparisons. Within a fixed system, score distributions can reveal collapsed embeddings, bad normalization, or thresholds that remove candidates.

Ties require a stable policy if exact rank changes affect gates. Use a deterministic secondary key where the platform permits it, or treat tied score groups carefully. Approximate indexes can have minor nondeterminism, so rerun borderline cases and report variance instead of weakening every assertion.

## Pair recall with metrics for other failure modes

Recall ignores irrelevant results. Returning every corpus item achieves perfect recall at a sufficiently large K. Precision at K asks what share of returned items are relevant. Mean reciprocal rank emphasizes the first relevant result. NDCG handles graded relevance and rank discounting. Coverage measures how many queries retrieve anything useful.

For RAG, add evidence diversity, citation correctness, answer groundedness, latency, and token budget. The [RAG retrieval testing best practices](/blog/rag-retrieval-testing-best-practices-2026) connect those layers. For vector-database-specific setup, the [vector database recall testing guide](/blog/vector-database-recall-testing-guide) covers exact baselines and index configuration.

| Metric | Rewards | Blind spot |
|---|---|---|
| Recall at K | Finding the known relevant set | Rank within K and irrelevant additions |
| Precision at K | Keeping returned results relevant | Relevant items missed outside K |
| MRR | Ranking the first relevant item early | Additional relevant evidence |
| NDCG | Ordering graded relevance well | Depends heavily on judgment grades |
| No-answer accuracy | Rejecting unsupported queries | Retrieval breadth on answerable queries |

Choose a small dashboard aligned with the product. A dozen correlated metrics without decision rules creates noise rather than safety.

## Set paired release gates

Compare the candidate and baseline on the same queries. Gate both aggregate change and protected slices. For example, require no critical-query losses, a bounded macro recall change at the serving K, and no language slice below its floor. Values must come from product risk and evaluation variance, not from a copied industry threshold.

Use paired bootstrap intervals or a permutation test when the set is large enough and statistical claims matter. Still inspect the actual lost queries. Statistical non-significance does not excuse losing the only emergency-procedure result in the corpus.

Maintain a small deterministic smoke set for fast pull requests and a larger evaluation for scheduled or release runs. Do not tune repeatedly against the protected final set. Hold out queries or rotate adjudicated production samples to reduce overfitting.

Treat label additions and corrections as versioned changes. A score is comparable only when its query set, labels, corpus, and scoring code are identified.

## Monitor drift after deployment

Offline recall cannot label tomorrow's queries automatically. In production, track proxy signals such as reformulation, result clicks, citation opens, no-answer rate, and escalation, while recognizing their biases. Sample new queries for human labeling and add confirmed misses to future evaluation versions.

Shadow the candidate retriever before serving it. Compare overlap in top results, latency, filtered result counts, and candidate-only losses on queries with known clicked or cited items. Avoid logging sensitive query and document text without appropriate controls.

Corpus drift also changes the task. New documents create new relevant sets and can crowd older results. Schedule relabeling for high-value queries, and alert when previously labeled IDs disappear or become ineligible.

## Validate the evaluator before trusting a model comparison

Metric code needs tests of its own. Create tiny synthetic cases where the expected recall is obvious: all relevant IDs retrieved, none retrieved, one of three inside K, a relevant ID just below K, duplicate returned IDs, fewer than K results, and an empty relevance set that must be rejected or routed elsewhere. These fixtures protect the denominator from silent changes.

Test rank truncation after deduplication according to the product contract. If a backend returns the same document twice under different chunk IDs, document-level scoring may need to collapse them before taking K. Chunk-level scoring may keep both. Implement these as separate adapters rather than embedding ambiguous identity rules inside one metric function.

Audit joins between labels and results. A corpus migration can prefix IDs, change case, or replace document identifiers while retaining text. A sudden zero score may be an identifier mismatch rather than retrieval collapse. Report the proportion of labeled IDs present in the candidate corpus before executing queries. Missing gold items should fail data validation, not count as model misses.

Likewise, reject incomplete runs. Timeouts and rate limits can produce an empty ranked list that looks like valid zero recall. Store per-query execution status, latency, and error information. Calculate the release metric only when the declared completion threshold is met, and report infrastructure failures separately.

Manually verify a sample of high-scoring and low-scoring queries against raw text. Labels can be wrong, passages can be outdated, and a retrieved ID can point to unexpected content after ingestion. This review is especially important when the candidate appears to improve dramatically. Large gains sometimes indicate leaked query text, duplicate gold passages, or a filter accidentally removed difficult cases.

Protect the evaluator from stateful search behavior. Use a fresh or versioned index, wait for ingestion completion, and avoid online learning or personalization unless those features are explicitly part of the experiment. If the search service uses caches, randomize system order or warm both consistently. The scoring harness should send the same query and filters to both systems and retain their raw responses.

Check floating-point comparisons at the gate. Compute with full precision and round only for display. A dashboard showing 0.90 may conceal values on opposite sides of a 0.895 threshold. Store numerator and denominator counts with the mean so reviewers can reconstruct the score.

Finally, version the evaluation program alongside labels and corpus manifests. A score artifact should identify the commit or package version that parsed results, deduplicated identities, and aggregated queries. When a metric implementation changes, rerun the baseline with the new evaluator before judging the candidate. That discipline makes recall a testable engineering signal instead of a spreadsheet number whose meaning shifts between releases.

## Frequently Asked Questions

### What should recall be for queries with no relevant documents?

Recall is undefined because the denominator is empty. Put those queries in a separate no-answer set and measure whether the system abstains or avoids presenting unsupported evidence.

### Is recall at 10 the same as ANN recall at 10?

Not necessarily. Human relevance recall uses judged relevant items. ANN recall uses exact nearest vectors as the reference. Name both metrics explicitly because they diagnose different layers.

### Should duplicate chunks count as separate relevant items?

Usually not if they represent the same evidence. Label canonical spans or document-level evidence groups, then deduplicate returned identities according to the consuming use case.

### Why can filtered search have lower recall than unfiltered search?

Relevant labels may be ineligible, metadata may be wrong, or post-filtering may discard candidates after a shallow vector search. Inspect eligibility and whether filtering occurs before or after candidate generation.

### How often should relevance labels be refreshed?

Refresh them when the corpus, product rules, or user intents materially change, and review a rolling sample of production queries. Bind every reported score to a versioned label set so trends remain interpretable.
`,
};
