import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing RAG Context Precision at Different Top-K Values',
  description:
    'Test RAG context precision across top-k values, expose ranking noise, compare answer quality and cost, and select retrieval depth from repeatable evidence.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing RAG Context Precision at Different Top-K Values

At top-k 3, the retriever returns the refund policy, the regional exception, and one unrelated shipping page. At top-k 10, it finds a second relevant exception but surrounds it with six distracting chunks. Recall improved. Context precision fell. Whether the final answer improved is an experiment, not an assumption.

Top-k controls how many ranked retrieval results proceed to the next stage. Increasing it can recover evidence that ranked just below the cutoff, but it also consumes context tokens, raises reranking or generation cost, and gives the model more opportunities to cite irrelevant material. Context precision measures how well relevant chunks are concentrated toward the front of the retrieved list. Testing it across k values makes retrieval depth a release decision rather than a guessed constant.

## Context precision rewards useful ordering

Ordinary precision at k counts relevant items in the first k and divides by k. Context precision in RAG evaluation is commonly rank-aware: it rewards systems that place relevant chunks before irrelevant ones. Ragas describes context precision as the mean of precision values calculated at relevant ranks. This matters because two rankings can contain the same relevant chunks but present them in different order.

For a query with relevant chunks A and B, compare these lists:

| Ranking at k=4 | Binary relevance | Ordinary precision@4 | Rank quality |
|---|---|---|---|
| A, B, X, Y | 1, 1, 0, 0 | 0.50 | Both useful chunks lead |
| X, A, Y, B | 0, 1, 0, 1 | 0.50 | The model encounters noise first |
| A, X, Y, B | 1, 0, 0, 1 | 0.50 | One answer-bearing chunk leads |
| X, Y, A, B | 0, 0, 1, 1 | 0.50 | Relevant evidence is buried |

A rank-aware context precision metric differentiates these cases even though ordinary precision@4 is identical. That makes it useful for comparing embedding models, query rewriting, metadata filters, and rerankers.

The metric still depends on relevance labels. A chunk can be topically related yet insufficient to answer the question. Define relevance as “useful evidence for this query under the product policy,” not mere keyword overlap. When multiple chunks duplicate the same paragraph, decide whether every duplicate counts as relevant. Otherwise a retriever can look precise while wasting context.

## Build a top-k sweep, not one isolated run

Choose a finite candidate set, such as 1, 2, 3, 5, 8, and 12, based on the product's context budget and corpus structure. Retrieve once at the largest candidate k and slice the ranked list for smaller k when the retriever's ranking is deterministic and no downstream component changes the query. This saves work and guarantees nested comparisons.

If the pipeline reranks only the requested k candidates, each value is a different pipeline execution. Retrieve and rerank separately for every configuration, because reranking 3 candidates is not equivalent to taking the first 3 from a reranked pool of 12. Record the candidate-pool size and final generation k as different parameters.

| Parameter | Example values | Keep fixed during a top-k test? | Reason |
|---|---|---|---|
| Embedding model | One pinned identifier | Yes | A model change alters the ranking itself |
| Chunking | 400 tokens, 60 overlap | Yes | Chunk boundaries redefine relevance units |
| Metadata filter | Product and locale | Yes | Different eligible corpus invalidates paired comparison |
| Candidate k | 20, 50, 100 | Yes unless explicitly studied | Reranker cannot select unseen chunks |
| Final top-k | 1, 2, 3, 5, 8, 12 | No, this is the independent variable | Determines supplied retrieval depth |
| Generator prompt and model | Pinned version and settings | Yes for answer analysis | Isolates retrieval-depth effects |

Use the same query dataset for every candidate. Store raw ranked chunk IDs, text hashes, scores, and metadata. Averages without per-query rankings make regressions almost impossible to investigate.

## A transparent rank-aware implementation

Before relying on a framework metric, implement a small labeled calculation. It clarifies denominator choices and edge cases. The following function averages precision at each rank containing a relevant item, then divides by the number of relevant items that could have been retrieved within k. This resembles average precision at k for binary labels.

\`\`\`python
# retrieval_metrics.py
from dataclasses import dataclass


@dataclass(frozen=True)
class QueryCase:
    case_id: str
    relevant_chunk_ids: set[str]


def context_precision_at_k(
    ranked_chunk_ids: list[str],
    relevant_chunk_ids: set[str],
    k: int,
) -> float:
    if k < 1:
        raise ValueError("k must be at least 1")
    if not relevant_chunk_ids:
        raise ValueError("case needs a relevance judgment")

    hits = 0
    precision_sum = 0.0
    for rank, chunk_id in enumerate(ranked_chunk_ids[:k], start=1):
        if chunk_id in relevant_chunk_ids:
            hits += 1
            precision_sum += hits / rank

    return precision_sum / min(len(relevant_chunk_ids), k)


relevant = {"refund-standard", "refund-eu-exception"}
ranking = ["refund-standard", "shipping-times", "refund-eu-exception", "warranty"]

assert context_precision_at_k(ranking, relevant, 1) == 1.0
assert round(context_precision_at_k(ranking, relevant, 3), 3) == 0.833
\`\`\`

Document this exact definition. Metric names are not enough: libraries can use reference answers, reference contexts, LLM relevance judgments, or ID-based labels. The denominator for unretrieved relevant chunks also changes interpretation. A calculation that excludes missed relevant chunks behaves differently from average precision over the known relevant set.

For cases with no relevant corpus content, do not force a zero into the same metric. Those are answerability or abstention cases. Evaluate whether retrieval returns misleading material and whether the generator refuses or asks for clarification. Mixing them with answerable questions can reward a system for retrieving nothing.

## Running Ragas context precision per k

Ragas provides context precision variants that use an evaluator LLM. \`LLMContextPrecisionWithReference\` compares each retrieved context with a reference answer for the user input. \`LLMContextPrecisionWithoutReference\` uses the generated response instead of a supplied reference. Prefer the reference-based form when reviewed reference answers exist, because changing the generator response should not redefine retrieval relevance during a paired top-k experiment.

The evaluator LLM must be configured explicitly for your environment. The example below assumes \`evaluator_llm\` has already been created using a supported Ragas LLM wrapper. It evaluates the same ranked context prefix at several k values and records scores without inventing a batch API.

\`\`\`python
# ragas_top_k_experiment.py
import asyncio

from ragas import SingleTurnSample
from ragas.metrics import LLMContextPrecisionWithReference


async def score_prefixes(
    question: str,
    reference: str,
    ranked_contexts: list[str],
    evaluator_llm,
    k_values: list[int],
) -> dict[int, float]:
    metric = LLMContextPrecisionWithReference(llm=evaluator_llm)
    scores: dict[int, float] = {}

    for k in k_values:
        sample = SingleTurnSample(
            user_input=question,
            reference=reference,
            retrieved_contexts=ranked_contexts[:k],
        )
        scores[k] = float(await metric.single_turn_ascore(sample))

    return scores


async def main(evaluator_llm) -> None:
    contexts = [
        "EU customers may cancel digital subscriptions within the stated cooling-off period.",
        "Physical orders normally leave the warehouse within two business days.",
        "The refund is returned to the original payment method after approval.",
        "Warranty claims require a device serial number.",
    ]
    scores = await score_prefixes(
        question="How is an approved EU subscription refund returned?",
        reference="It is returned to the original payment method.",
        ranked_contexts=contexts,
        evaluator_llm=evaluator_llm,
        k_values=[1, 2, 3, 4],
    )
    print(scores)


# In your application, call: asyncio.run(main(evaluator_llm))
\`\`\`

An LLM-based score can vary across executions. Pin the evaluator model and settings where possible, cache judgments for identical case, context, rubric, and evaluator versions, and calibrate on human-labeled chunk relevance. Store per-chunk verdicts or available reasons so a changed aggregate can be audited.

For the metric's variants and assumptions, consult the [Ragas RAG evaluation metrics complete guide](/blog/ragas-rag-evaluation-metrics-complete-guide). Do not compare scores from different evaluator models as though they were on an immutable scale.

## Aggregate curves can hide query failures

Plot mean context precision against k, but also inspect distribution and slices. Mean often falls as k grows because later results are less relevant. That curve does not by itself identify the best k. Some complex queries may need the fourth chunk to retrieve a critical exception, while simple fact lookups degrade after the first.

Report median, lower quantiles, and the share of cases above a chosen relevance standard, with sample counts. Break down by intent, language, corpus section, query length, and number of labeled relevant chunks. Keep high-risk policy questions visible even if they are a small slice.

Use paired per-query differences. For k=3 versus k=5, list queries whose context precision drops most, queries whose recall improves, and queries whose answer outcome changes. Those examples reveal whether the extra contexts are harmless background, contradictory policy versions, or genuinely necessary evidence.

Bootstrap confidence intervals can communicate sampling uncertainty, provided the method and dataset independence assumptions are stated. Do not decorate a tiny, hand-picked dataset with spurious decimal precision. A score of 0.81 from 20 cases is an observation about those cases, not a universal retriever property.

## Precision alone will select k too low

Top-k 1 can have perfect context precision whenever its first result is relevant, yet omit a second document needed to answer fully. Measure context recall or ID-based recall alongside precision. Then measure final-answer groundedness, correctness, completeness, citation accuracy, latency, and token usage.

| Outcome pattern | Interpretation | Likely next experiment |
|---|---|---|
| Precision falls, recall rises, answer improves | Extra evidence is worth some noise | Add reranking or contextual compression |
| Precision falls, recall flat, answer worsens | Added chunks are pure distraction | Lower k or improve ranking cutoff |
| Precision stable, answer cost rises | Extra contexts duplicate evidence | Deduplicate chunks or stop earlier |
| Precision rises after reranking, answer unchanged | Retrieval metric improves beyond answer sensitivity | Test harder multi-source cases |
| Recall rises, faithfulness falls | Generator uses conflicting or stale context | Improve metadata, policy versioning, and prompt rules |
| Retrieval metrics strong, answer wrong | Failure is downstream of retrieval | Inspect generator instruction and citation use |

The best operating point is a constrained tradeoff, not necessarily the maximum score. For a customer support bot, you might require no regression on critical answer correctness, minimum recall for multi-document questions, and a latency budget, then choose the smallest k satisfying those conditions. State the constraints in the evaluation report.

## Chunking changes what precision means

If one source paragraph is duplicated across overlapping chunks, retrieving three near-copies may appear highly relevant while adding little information. Conversely, a large chunk may contain one relevant sentence plus substantial noise and receive a binary relevant label. Context precision operates on the units produced by chunking, so compare chunk strategies carefully.

Add labels for source document and semantic fact, not only chunk ID. Report duplicate-source rate and unique supporting-fact coverage. When a query needs two facts, retrieving five chunks from one source should not look equivalent to covering both facts.

Chunk size also affects generation tokens at the same k. Comparing k=5 with 200-token chunks to k=5 with 1,000-token chunks does not hold context volume constant. Run two views: fixed number of chunks and fixed approximate token budget. The latter often maps more closely to cost and context-window pressure.

Metadata filtering should happen before the top-k sweep when filters are a product rule. A French policy question should not gain precision merely because the evaluator accepts an English page if the experience requires French sources. Relevance includes tenant, locale, jurisdiction, product version, and effective date where those constraints matter.

## Rerankers split candidate depth from generation depth

A two-stage retriever may fetch 50 vector candidates, rerank them, and send 5 to the generator. Calling both numbers “top-k” creates misleading experiment logs. Name them \`candidate_k\` and \`context_k\` or similarly explicit terms.

First sweep candidate depth while holding final context depth fixed. This tests whether the reranker has access to relevant material. Then sweep final depth with candidate depth fixed at a sufficient value. Measure reranker latency separately. A cross-encoder may improve ordering but erase the latency saved by sending fewer contexts.

Score context precision after the final ordering, because that is what the generator sees. Also retain pre-rerank metrics to localize improvement. If post-rerank precision rises but relevant candidates are often absent, the embedding or filtering stage remains the limiting factor.

## Guard against corpus and evaluator leakage

Top-k tuning on the same visible dataset can overfit configuration to those queries. Keep a holdout set and refresh it as user behavior changes. Deduplicate semantically similar queries across train, tuning, and holdout partitions. If synthetic questions were generated from exact chunks, label that provenance because retrieval may be easier than real user language.

LLM judges can recognize facts from their own training rather than assess the supplied chunk. Reference-based prompts and explicit relevance criteria help, but human calibration remains necessary. Include domain experts for policy, medical, legal, or highly technical relevance judgments.

Version the corpus snapshot. Repeating the same experiment after documents change is not a paired comparison unless every ranking records corpus revision. For continuously updated indexes, create a frozen evaluation namespace or store the retrieved text and IDs with each run.

The [RAG regression testing guide](/blog/rag-regression-testing-guide) explains how to turn these frozen cases and configuration records into durable release checks.

## Turn the chosen k into a monitored hypothesis

After selecting k, document why: dataset revision, constraints, candidate values, slice results, costs, and known weak cases. Put the configuration under version control. Add a small retrieval smoke set to pull requests and run the larger sweep when embeddings, chunking, filters, reranking, corpus ingestion, or generator context handling changes.

Production monitoring should track retrieved count, context tokens, source diversity, empty retrievals, latency, and user feedback by configuration. Offline relevance labels lag new content and emerging queries. Sample novel or low-confidence cases for review, then add confirmed failures to the dataset.

Do not leave k fixed forever simply because the experiment once favored 5. Corpus size, document style, query distribution, context windows, and reranker quality change. Revalidate on meaningful system changes, but avoid continuous tuning against noisy user feedback without controlled evaluation.

## Stop rules can outperform one global k

A fixed k is operationally simple, but ranking scores may contain enough signal to stop earlier for obvious questions and retrieve deeper for ambiguous ones. Candidate policies include a minimum similarity threshold, a score gap after the last accepted chunk, source-diversity requirements, or a token budget. Each rule creates another testable configuration and must be calibrated against the same labeled cases.

Evaluate adaptive retrieval by the actual contexts selected, not by assigning it a fictional k. Report selected-count distribution, precision, recall, answer quality, and latency per slice. Pay attention to poorly calibrated scores across languages or corpus sections. A threshold that works for product manuals may return nothing for short error-code documents because their embedding-score distribution differs.

Keep a fixed-k baseline beside the adaptive policy. Adaptive selection earns its complexity only if it improves the quality-cost frontier or protects important cases. When it fails, store the score sequence and stopping reason so an investigator can tell whether ranking, calibration, or the rule made the wrong decision.

## Frequently Asked Questions

### Why can context precision decrease every time top-k increases?

Rankings usually place the strongest candidates first, so later additions are more likely to be irrelevant. The decrease is expected when recall has saturated. The decision depends on whether those later chunks add necessary evidence or only noise.

### Should I retrieve separately for each k value?

If smaller lists are exact prefixes of one deterministic ranking, retrieve at the largest k and slice it. If candidate count changes reranking, query rewriting, filtering, or search behavior, execute each configuration separately and record that pipeline difference.

### Can I choose top-k using context precision alone?

Precision alone cannot select retrieval depth. It tends to favor short lists. Pair it with context recall, final-answer correctness and faithfulness, latency, token cost, and critical-slice results. Choose the smallest k that satisfies the product's combined constraints.

### How should unanswerable questions affect the metric?

Keep them in a separate answerability or abstention evaluation. They have no required relevant chunk, so forcing them into the same context-precision denominator distorts interpretation. Test whether the system avoids misleading retrieval and declines appropriately.

### Does a reranker eliminate the need to tune top-k?

Reranking does not remove the tuning problem. It introduces at least two depths: how many candidates it receives and how many contexts reach generation. Both affect recall, precision, latency, and cost, so tune and report them independently.
`,
};
