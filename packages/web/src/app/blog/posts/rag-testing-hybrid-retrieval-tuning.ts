import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG Testing Hybrid Retrieval Tuning: Measure Fusion Before You Tune the Generator',
  description: 'RAG testing hybrid retrieval tuning with reproducible query sets, rank-fusion code, slice metrics, reranker checks, and failure diagnosis for grounded answers.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# RAG Testing Hybrid Retrieval Tuning: Measure Fusion Before You Tune the Generator

RAG testing hybrid retrieval tuning is the practice of evaluating lexical and dense retrieval separately, combining their ranked results with an explicit fusion rule, and selecting parameters against labeled queries before the language model writes an answer. The immediate payoff is diagnostic clarity. When a response omits a policy exception, you can tell whether the relevant chunk was never retrieved, was retrieved but fused too low, was removed by a reranker, or was ignored by the generator.

A dependable workflow uses a versioned corpus, query-level relevance judgments, fixed candidate budgets, metrics such as Recall@k and nDCG@k, and slices for exact identifiers, paraphrases, negation, dates, and access-controlled content. Tune on one query set, choose the smallest configuration that improves the target slices without unacceptable regressions, then confirm it on a held-out set. Do not tune weights by repeatedly asking whether five demo answers "look better."

Hybrid retrieval is one component of a larger autonomous system. The [agentic AI testing guide for 2026](/blog/agentic-ai-testing-guide-2026) covers planning and tool-use risks around it. If retrieved context or evaluation data arrives through tool protocols, use [MCP servers for test automation in 2026](/blog/mcp-servers-test-automation-2026) to test that boundary independently. This article stays focused on retrieval evidence and fusion decisions.

## Turn "good retrieval" into a query-level contract

Hybrid retrieval combines two useful biases. Lexical retrieval rewards shared terms, which makes it strong for product codes, error strings, field names, and quoted phrases. Dense retrieval rewards semantic similarity, which makes it strong for paraphrases and conceptually related language. Neither bias is universally superior.

For each evaluation query, record what evidence must appear and how much relevance each passage has. A binary label is sufficient for straightforward lookup tasks. Graded labels are more informative when one passage directly answers the question, another supplies required context, and a third merely mentions the topic.

| Relevance grade | Meaning | Example for a leave-policy query |
| --- | --- | --- |
| 3 | directly contains the complete answer | policy paragraph with entitlement and exception |
| 2 | contains a necessary supporting fact | definition of eligible employee |
| 1 | related but insufficient alone | overview page linking to the policy |
| 0 | not useful for answering | office holiday calendar |

Store judgments at the stable passage or document ID level, not by copying whole text into the expected result. Text changes during re-chunking, while a lineage-aware ID can preserve where the evidence came from. If a document is split differently, update judgments through an explicit migration rather than silently comparing obsolete chunk IDs.

A compact JSON Lines set can look like this:

\`\`\`jsonl
{"query_id":"q-001","query":"How long can a contractor retain a loaner laptop?","relevant":{"asset-policy#loaners":3,"contractor-handbook#equipment":2},"slice":["paraphrase","policy"]}
{"query_id":"q-002","query":"What does error PAY-1047 mean?","relevant":{"payments-errors#PAY-1047":3},"slice":["exact-token","support"]}
{"query_id":"q-003","query":"Can EU customer logs be copied to a US test environment?","relevant":{"data-policy#regional-testing":3,"data-policy#exceptions":2},"slice":["negation","multi-evidence"]}
{"query_id":"q-004","query":"Which timeout replaced the old 30 second checkout limit?","relevant":{"release-2026-07#checkout-timeout":3},"slice":["freshness","number"]}
\`\`\`

These are illustrative records. Real judgments should come from subject-matter experts, support resolutions, search logs reviewed for privacy, or synthetic queries verified against source documents. A generated question is not automatically a valid label just because the same model generated both it and an answer.

## Freeze the corpus variables before comparing fusion rules

Retrieval tuning becomes uninterpretable when chunking, embeddings, lexical indexing, filters, and fusion weights all change in one experiment. Create a run manifest with the exact inputs.

\`\`\`yaml
run_id: hybrid-2026-08-08-a
corpus_snapshot: policies-2026-08-01
judgment_set: retrieval-eval-v7
split: validation
lexical:
  analyzer: project-default
  candidate_count: 50
dense:
  embedding_model: project-approved-embedding
  candidate_count: 50
fusion:
  method: reciprocal_rank_fusion
  rank_constant: 60
  output_count: 10
filters:
  enforce_tenant: true
  effective_at: "2026-08-08T00:00:00Z"
\`\`\`

The model name above is deliberately a project identifier, not a fabricated public package or version. Resolve it in your own configuration and store the provider revision or model digest in the run artifact. The same discipline applies to analyzers: "default" is not reproducible unless your index template and search engine version are captured elsewhere.

| Variable | Hold fixed while tuning | Why it changes the outcome |
| --- | --- | --- |
| corpus snapshot | yes | documents and freshness alter the relevant pool |
| chunking strategy | yes | passage boundaries change matchability |
| lexical analyzer | yes | stemming and tokenization affect exact search |
| embedding model | yes | dense neighborhood changes |
| metadata filters | yes | candidate eligibility changes |
| per-channel candidate count | usually yes | fusion cannot recover candidates never fetched |
| fusion constant or weight | experiment variable | controls combination behavior |
| final top k | measure several fixed values | generator context budget changes |

If you want to compare chunk sizes, run a separate experiment family. First select a chunking candidate under a stable fusion baseline; then retune fusion because changed chunks can alter both lexical and dense ranks.

## Capture both ranked channels before fusion

An evaluation harness should retain lexical rank, dense rank, raw channel scores, filter decisions, fused score, and final rank. Raw scores are useful for debugging, but scores from different retrieval methods are rarely comparable without calibration. A cosine similarity and a BM25 score do not share a natural unit.

Use a trace record per query:

\`\`\`json
{
  "query_id": "q-002",
  "channels": {
    "lexical": [
      {"passage_id": "payments-errors#PAY-1047", "rank": 1, "score": 18.42},
      {"passage_id": "payments-errors#PAY-1041", "rank": 2, "score": 9.17}
    ],
    "dense": [
      {"passage_id": "support#payment-failures", "rank": 1, "score": 0.83},
      {"passage_id": "payments-errors#PAY-1047", "rank": 7, "score": 0.76}
    ]
  },
  "filters": {"tenant":"acme", "effective_at":"2026-08-08T00:00:00Z"}
}
\`\`\`

This trace immediately explains why exact-token queries benefit from lexical retrieval. It also exposes a critical failure class: the relevant passage cannot be fused into the top ten if neither channel included it in its candidate set. Increasing only final \`k\` does nothing when the pre-fusion pools are too shallow.

Do not log restricted text or customer queries indiscriminately. IDs, ranks, scores, filter labels, and corpus hashes are often enough for metrics. Store content excerpts only in an access-controlled evaluation environment with a retention policy.

## Implement reciprocal rank fusion as a testable function

Reciprocal rank fusion, commonly abbreviated RRF, combines ranked lists using rank positions rather than incomparable raw scores. For each document, add \`1 / (c + rank)\` from every list containing it. The positive constant \`c\` controls how quickly contributions fall with rank.

Save the standalone implementation below as \`fusion.py\`. It validates its parameters, drops duplicate IDs within a single ranked list, and uses a stable passage-ID tie-break so repeated runs are deterministic.

\`\`\`python
from collections import defaultdict
from typing import Iterable

RankedList = list[str]


def reciprocal_rank_fusion(
    ranked_lists: Iterable[RankedList],
    rank_constant: int = 60,
    limit: int = 10,
) -> list[tuple[str, float]]:
    if rank_constant <= 0:
        raise ValueError("rank_constant must be positive")
    if limit <= 0:
        raise ValueError("limit must be positive")

    scores: dict[str, float] = defaultdict(float)
    for ranked in ranked_lists:
        seen: set[str] = set()
        for rank, passage_id in enumerate(ranked, start=1):
            if passage_id in seen:
                raise ValueError("a ranked list contains a duplicate passage")
            seen.add(passage_id)
            scores[passage_id] += 1.0 / (rank_constant + rank)

    ordered = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    return ordered[:limit]


if __name__ == "__main__":
    lexical = ["error#PAY-1047", "error#PAY-1041", "support#payments"]
    dense = ["support#payments", "runbook#declines", "error#PAY-1047"]
    print(reciprocal_rank_fusion([lexical, dense], rank_constant=60, limit=3))
\`\`\`

The example constant 60 is an illustrative starting point, not a universal optimum. Evaluate a small declared grid rather than assuming a number from a paper or search engine transfers to your candidate depths. If the two channels need unequal influence, weighted RRF can multiply each channel's contribution by an explicit channel weight, but that introduces another parameter and demands normalization of the weights in experiment reports.

## Measure retrieval before answer generation

For binary relevance, Recall@k answers, "What fraction of all labeled relevant passages appeared in the first k results?" Precision@k answers, "What fraction of the first k results were relevant?" Reciprocal rank focuses on the first relevant result. nDCG supports graded judgments and rewards placing higher-grade evidence earlier.

No single metric captures the whole RAG requirement:

| Metric | Useful for | Blind spot |
| --- | --- | --- |
| Recall@k | whether required evidence reaches context candidates | ignores ordering within top k |
| Precision@k | context efficiency and noise | penalizes queries with few labeled relevant items |
| MRR | first-answer lookup tasks | ignores relevant results after the first |
| nDCG@k | graded relevance and ranking quality | depends on consistent judgment grades |
| zero-hit rate | catastrophic retrieval misses | says nothing about partially complete evidence |
| restricted-hit rate | security filter validation | not a relevance metric |

Save this dependency-free metric module as \`metrics.py\`. It implements binary recall, reciprocal rank, and graded nDCG:

\`\`\`python
import math


def recall_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        raise ValueError("relevant must not be empty")
    hits = len(set(ranked[:k]) & relevant)
    return hits / len(relevant)


def reciprocal_rank(ranked: list[str], relevant: set[str]) -> float:
    for rank, passage_id in enumerate(ranked, start=1):
        if passage_id in relevant:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(ranked: list[str], grades: dict[str, int], k: int) -> float:
    def gain(grade: int, rank: int) -> float:
        return (2**grade - 1) / math.log2(rank + 1)

    actual = sum(
        gain(grades.get(passage_id, 0), rank)
        for rank, passage_id in enumerate(ranked[:k], start=1)
    )
    ideal_grades = sorted(grades.values(), reverse=True)[:k]
    ideal = sum(
        gain(grade, rank)
        for rank, grade in enumerate(ideal_grades, start=1)
    )
    return actual / ideal if ideal else 0.0


if __name__ == "__main__":
    result = ["overview", "policy#loaners", "handbook#equipment"]
    judgments = {"policy#loaners": 3, "handbook#equipment": 2}
    print("recall@3", recall_at_k(result, set(judgments), 3))
    print("rr", reciprocal_rank(result, set(judgments)))
    print("ndcg@3", ndcg_at_k(result, judgments, 3))
\`\`\`

Macro-average query metrics so a query with many judgments does not dominate by default. Also report query counts and confidence intervals or paired resampling when the evaluation set is large enough. Avoid fabricated certainty: a two-point improvement on twenty queries can be driven by one case. Always inspect the paired per-query deltas.

## Tune candidate depth and fusion separately

Hybrid systems have at least three distinct budgets: candidates fetched from lexical retrieval, candidates fetched from dense retrieval, and fused results passed onward. Treating them as one \`top_k\` hides bottlenecks.

Use this sequence:

1. Measure each channel alone at generous but operationally feasible candidate depth.
2. Confirm that their misses are complementary. If both miss the same queries, fusion is not the fix.
3. Choose candidate depths that reach the desired recall before fusion.
4. Sweep fusion parameters while holding those pools fixed.
5. Evaluate final top-k values against context limits and latency.
6. Confirm the chosen configuration on held-out queries.

A small grid runner can call any retrieval results already captured to disk. This example avoids repeated search-engine requests, making fusion experiments deterministic:

\`\`\`python
from dataclasses import dataclass

from fusion import reciprocal_rank_fusion
from metrics import recall_at_k


@dataclass(frozen=True)
class QueryCase:
    query_id: str
    lexical: list[str]
    dense: list[str]
    relevant: set[str]


def evaluate_constants(cases: list[QueryCase], constants: list[int]) -> dict[int, float]:
    output: dict[int, float] = {}
    for constant in constants:
        recalls: list[float] = []
        for case in cases:
            fused = reciprocal_rank_fusion(
                [case.lexical, case.dense],
                rank_constant=constant,
                limit=5,
            )
            ranked_ids = [passage_id for passage_id, _ in fused]
            recalls.append(recall_at_k(ranked_ids, case.relevant, 5))
        output[constant] = sum(recalls) / len(recalls)
    return output


if __name__ == "__main__":
    cases = [
        QueryCase(
            query_id="exact-error",
            lexical=["error#1047", "support#payments", "error#1041"],
            dense=["support#payments", "runbook#declines", "error#1047"],
            relevant={"error#1047"},
        ),
        QueryCase(
            query_id="loaner-paraphrase",
            lexical=["assets#index", "laptops#buying", "policy#loaners"],
            dense=["policy#loaners", "handbook#equipment", "assets#index"],
            relevant={"policy#loaners", "handbook#equipment"},
        ),
    ]
    print(evaluate_constants(cases, [10, 30, 60, 100]))
\`\`\`

Place the earlier fusion and metric functions in the same module or import them explicitly. The script's two cases illustrate mechanics only and are far too few for a model-selection claim. A real runner should write per-query results, not just averages, and refuse to compare runs with mismatched corpus or judgment hashes.

## Slice results by the query features that channels handle differently

An overall average can improve while high-risk behavior deteriorates. Label queries with observable characteristics and product importance.

Useful hybrid retrieval slices include:

- Exact identifiers: error codes, ticket references, API fields, filenames, and quoted phrases.
- Paraphrases: user wording shares few surface terms with the source.
- Acronyms and expansions: both forms may appear in different documents.
- Negation and exceptions: the decisive passage limits a broad rule.
- Multi-evidence: a correct answer requires two or more passages.
- Freshness: a new policy supersedes a semantically similar old policy.
- Numeric facts: dates, limits, thresholds, and durations.
- Multilingual queries: query and source may use different languages.
- Access scope: relevant-looking passages exist in another tenant or permission class.

For each slice, report channel-only and hybrid metrics side by side. A healthy hybrid system often shows lexical wins on exact tokens and dense wins on paraphrases. If hybrid underperforms both on a slice, inspect the fusion rule. If both channels fail, inspect indexing, chunking, query transformation, filters, and labels.

| Slice outcome | Interpretation | Next experiment |
| --- | --- | --- |
| lexical high, dense low, hybrid high | fusion preserves exact matches | verify no regression at smaller candidate depth |
| dense high, lexical low, hybrid high | semantic channel rescues paraphrases | inspect latency versus dense pool size |
| both high, hybrid lower | fusion or deduplication damages strong ranks | inspect trace and tie behavior |
| both low | candidate generation failure | revise chunking, indexing, or query representation |
| relevance high, restricted-hit rate nonzero | security filter failure | block release, test pre-retrieval authorization |
| validation rises, held-out falls | overfitting | simplify parameters and expand judgments |

Security is not a tradeable metric. Never accept cross-tenant retrieval because nDCG improved. Apply authorization filters before or during candidate retrieval where supported, and assert that forbidden passage IDs never enter channel pools, fusion, reranking, or prompts.

## Add metamorphic tests where exact rankings are unstable

Corpus growth and model changes can make exact rank snapshots brittle. Metamorphic tests express relationships that should remain true even when absolute scores change.

Examples:

- Adding an irrelevant document must not remove the only relevant result from a sufficiently wide candidate set.
- Repeating a rare exact error code in the query should not make its canonical documentation less discoverable lexically.
- Applying a tenant filter must remove every passage owned only by another tenant.
- A superseded document should rank below its active replacement when the query asks for current policy and effective-date filtering is enabled.
- Swapping harmless punctuation in a natural-language query should not turn a hit into a zero-hit result.

A simple pytest check can protect fusion invariants without a live search service:

\`\`\`python
from fusion import reciprocal_rank_fusion


def test_rrf_rewards_passages_seen_by_both_channels() -> None:
    lexical = ["shared", "lexical-only", "third"]
    dense = ["dense-only", "shared", "fourth"]

    fused = reciprocal_rank_fusion([lexical, dense], rank_constant=60, limit=5)
    ranked = [passage_id for passage_id, _ in fused]

    assert ranked[0] == "shared"
    assert set(ranked) == {
        "shared",
        "lexical-only",
        "dense-only",
        "third",
        "fourth",
    }


def test_rrf_rejects_duplicate_ids_within_one_channel() -> None:
    import pytest

    with pytest.raises(ValueError, match="duplicate passage"):
        reciprocal_rank_fusion([["a", "a"], ["b"]])
\`\`\`

The first assertion depends on the shown ranks and constant, so it is deterministic. It does not claim that every shared passage always wins; a passage near the bottom of both very long lists may not outrank a first-place single-channel result under every configuration.

## Place the reranker under its own microscope

Many hybrid pipelines fuse broad candidate pools and then apply a cross-encoder or language-model reranker. A final retrieval regression can therefore occur after successful fusion. Capture pre-rerank and post-rerank lists and compute the same metrics at both stages.

Test three reranker properties:

1. It improves ordering on the validation objective, especially nDCG or first relevant rank.
2. It does not remove required multi-evidence passages from the generator budget.
3. It respects the same metadata and authorization constraints as candidate retrieval.

Measure latency separately. Reranker cost typically scales with query-passage pairs, so changing fusion candidate count changes both quality and runtime. Report percentile latency on production-shaped passage lengths rather than timing a handful of tiny strings on a developer laptop.

What people get wrong here is assigning every final miss to "the vector database." If the relevant passage ranked fourth after fusion and thirty-second after reranking, the dense index did its job. The reranker or its input formatting is the failing stage. Conversely, a reranker cannot rescue evidence absent from its candidates.

## Diagnose a policy-exception failure end to end

Consider a support assistant asked, "Can a contractor keep a loaner laptop while traveling internationally?" It answers yes using a general loaner policy. The actual corpus contains an exception that prohibits international travel with contractor loaners.

Follow the trace rather than changing prompts immediately:

1. Confirm the exception document belongs to the corpus snapshot and is effective for the query date.
2. Verify access filters allow it for this user and tenant.
3. Inspect lexical results. Perhaps the source says "cross-border travel," so there is weak term overlap.
4. Inspect dense results. Suppose the exception ranks 18th, but dense candidate depth is 10.
5. Inspect fusion. The passage is absent because it never entered either pool.
6. Increase dense candidate depth in a controlled experiment and re-evaluate latency and all slices.
7. If the passage reaches the prompt and the answer still ignores it, create a separate generation and citation test.

The diagnosis is a candidate-depth miss, not a fusion-weight miss. Raising the dense weight cannot promote a passage that was never fetched. This distinction saves teams from weeks of random parameter changes.

Now imagine the exception appears at dense rank 6 and lexical rank 40, fuses at rank 8, then a reranker drops it to 22. That is a reranker regression. Keep both failure fixtures because they exercise different stage boundaries while producing the same unsafe answer.

## Gate changes with paired deltas and explicit budgets

A release gate should compare a candidate configuration with the current baseline on the same held-out queries. Record both quality and operations:

- Macro Recall@5 and Recall@10.
- nDCG@10 for graded judgments.
- Zero-hit query count.
- Slice metrics for exact tokens, paraphrases, exceptions, and freshness.
- Forbidden-passage count, which must remain zero.
- Candidate retrieval and reranking latency distributions.
- Index request count and context token count.

Set thresholds from product risk and observed baseline variation, not from invented universal percentages. One team may require no regression on twelve audited compliance queries. Another may prioritize high recall for support errors while enforcing a strict p95 latency budget. Declare the decision before viewing candidate results to reduce cherry-picking.

Keep an error analysis worksheet beside metrics. For every meaningful regression, label the stage: corpus, judgment, filter, lexical candidate, dense candidate, fusion, deduplication, reranker, context assembly, or generator. Metrics decide whether a run changed; labeled traces explain why.

## What to hand an AI coding agent

An agent asked to "improve hybrid search" has too much freedom. Give it a bounded experiment contract:

- Read-only access to a fixed retrieval trace or a dedicated test index.
- The baseline manifest and permitted parameters.
- A validation split for iteration and a held-out split evaluated only at checkpoints.
- Commands that emit machine-readable metrics and per-query deltas.
- A prohibition on changing labels while tuning.
- Security assertions that cannot be traded for relevance.
- A latency and cost budget.
- A required report of regressions, not only average gains.

Require code review for corpus filters, tenant scoping, and production index changes. An agent can efficiently generate parameter grids, summarize query deltas, and propose targeted fixtures, but it should not decide that restricted content is acceptable because a numerical objective rose.

The mature outcome is not one magical hybrid weight. It is a reproducible evaluation loop in which every tuning choice has a corpus, query set, metric, slice effect, and operational cost.

## Frequently Asked Questions

### Which metric should lead RAG testing hybrid retrieval tuning?

Lead with the metric closest to the evidence requirement. Recall@k is a strong primary metric when the generator needs every relevant passage within a fixed context budget. MRR fits single-fact lookup where the first useful hit matters. nDCG fits graded evidence and ordering. Always pair the lead metric with zero-hit rate, critical query slices, security checks, and latency. Averages alone can hide an unsafe miss on exceptions or a regression for exact error codes.

### How large should lexical and dense candidate pools be?

There is no universal size. Start by measuring each channel's recall across several feasible depths on your labeled set. Choose depths that capture complementary evidence within latency and cost limits, then tune fusion with those pools fixed. Remember that final top k and pre-fusion candidate depth are different controls. If relevant evidence sits at dense rank 30, a final top ten can still recover it after fusion only when the dense channel retrieves at least that deeply.

### Should hybrid search weights be tuned using final answer scores?

Final answer evaluation is useful as a downstream confirmation, but it is a weak sole tuning signal because generation adds randomness and can ignore good evidence or invent an answer after bad retrieval. Tune retrieval first with passage-level judgments and deterministic rank metrics. Then run groundedness, citation, completeness, and refusal tests using the selected candidates. This staged approach tells you whether a change improved evidence availability or merely changed how the generator phrased its response.

### How often should the hybrid retrieval evaluation set change?

Version it whenever the corpus, user behavior, or risk profile changes materially, but preserve a stable core for trend comparison. Add reviewed production misses, new terminology, superseded policies, and emerging query languages. Remove or migrate judgments when passages are retired or re-chunked, with a recorded reason. Keep validation and held-out splits separate, and periodically refresh the held-out set after model selection cycles so repeated tuning does not turn it into another training set.
`,
};
