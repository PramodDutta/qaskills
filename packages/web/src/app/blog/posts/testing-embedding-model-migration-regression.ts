import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing an Embedding-Model Migration for Regressions',
  description:
    'Test an embedding-model migration with paired recall, ranking overlap, latency, vector validation, shadow indexes, and controlled rollout gates.',
  date: '2026-07-13',
  category: 'Migration',
  content: `
# Testing an Embedding-Model Migration for Regressions

The candidate model returns 768 numbers where the current index expects 384. Even after a new index fixes that obvious incompatibility, the migration can still demote exact product codes, reshape similarity scores, increase tail latency, or change which duplicate chunk wins. "The vectors were generated successfully" is only the first checkpoint.

An embedding migration is a paired system comparison. Freeze a corpus and judged query set, build independent baseline and candidate indexes, run the same retrieval path against both, and preserve every ranked result. Release only after quality, performance, operability, and rollback evidence agree.

## Inventory every contract tied to the old vectors

The model name is not the entire embedding contract. Query prefixes, pooling, normalization, truncation, precision, maximum input length, library version, and model revision can all change output. The vector store adds dimension, distance function, index algorithm, quantization, and filtering behavior.

Capture a manifest before generating the candidate index:

| Contract item | Baseline value to record | Candidate check |
| --- | --- | --- |
| Model artifact | Repository ID and immutable revision | Approved revision resolves and loads |
| Embedding dimension | Observed vector length | Index schema accepts exact length |
| Query/document treatment | Prefixes or separate encode methods | Candidate applies intended asymmetry |
| Normalization | Enabled or disabled | Distance function remains mathematically coherent |
| Similarity | Cosine, dot product, or distance | Score ordering interpreted correctly |
| Chunking | Splitter version and source snapshot | Same chunks for model-only experiment |
| Numeric format | float32, quantized form | Precision change evaluated independently |
| Filters | Tenant, locale, permissions | Identical prefilter or postfilter behavior |

Change one major variable per experiment when possible. If the candidate run also changes chunk size, metadata filters, hybrid weights, and vector database parameters, a regression has no clear owner. A later system experiment can combine the approved changes.

Store model identity with every vector collection. A mixed index containing vectors from incompatible models can accept writes if dimensions happen to match yet produce meaningless neighborhoods. Dimension equality is necessary, never proof of semantic compatibility.

## Build two indexes from one immutable corpus

Do not overwrite the production collection during evaluation. Create a baseline reconstruction and candidate collection from the same versioned chunk records. Each record needs a stable chunk ID, source ID, content hash, text, and filter metadata. Count inputs, successful embeddings, rejected inputs, and indexed points.

Before retrieval, validate the vectors themselves:

- Length equals the model and collection dimension.
- Every component is finite, with no NaN or infinity.
- Norm distribution is compatible with the normalization policy.
- Identical text produces equivalent output within the runtime's chosen tolerance when deterministic behavior is expected.
- Empty, whitespace-only, very long, Unicode, and malformed inputs follow the documented ingestion policy.

A successful batch job can silently skip records. Reconcile source chunk IDs against index IDs and fail the migration check on missing or duplicate identities. Sampling cannot prove completeness.

The [vector database recall testing guide](/blog/vector-database-recall-testing-guide) explains how to separate embedding relevance from approximate nearest-neighbor index recall. During model comparison, use exact search on a manageable evaluation corpus or verify the ANN layer against exact candidate distances so index tuning does not masquerade as model quality.

## Run a local paired ranking experiment

The following Python program uses Sentence Transformers' real \'SentenceTransformer.encode()\' API. It embeds the same corpus with two models, normalizes vectors, and ranks by dot product. Model downloads require network access on the first run. The small data is illustrative; replace it with versioned chunks and relevance judgments.

\`\`\`python
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
import numpy as np


@dataclass(frozen=True)
class Chunk:
    id: str
    text: str


chunks = [
    Chunk("rotate-key", "Create a replacement API key, deploy it, then revoke the old key."),
    Chunk("reset-password", "Send a time-limited password reset link to the verified email."),
    Chunk("rate-limit", "The API returns HTTP 429 when the account exceeds its request quota."),
    Chunk("create-key", "Administrators can create an API key in the credentials page."),
]

queries = [
    {"id": "q1", "text": "How do I change a credential without downtime?", "relevant": {"rotate-key"}},
    {"id": "q2", "text": "Why did the service respond with 429?", "relevant": {"rate-limit"}},
]


def rankings(model_name: str, k: int = 3):
    model = SentenceTransformer(model_name)
    corpus_vectors = model.encode(
        [chunk.text for chunk in chunks],
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    query_vectors = model.encode(
        [query["text"] for query in queries],
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    assert np.isfinite(corpus_vectors).all()
    assert np.isfinite(query_vectors).all()

    result = {}
    for query, vector in zip(queries, query_vectors, strict=True):
        scores = corpus_vectors @ vector
        order = np.argsort(-scores)[:k]
        result[query["id"]] = [
            (chunks[index].id, float(scores[index])) for index in order
        ]
    return result, corpus_vectors.shape[1]


baseline, baseline_dimension = rankings(
    "sentence-transformers/all-MiniLM-L6-v2"
)
candidate, candidate_dimension = rankings(
    "sentence-transformers/all-mpnet-base-v2"
)

print({"baseline_dimension": baseline_dimension, "candidate_dimension": candidate_dimension})
for query in queries:
    print(query["id"], {"baseline": baseline[query["id"]], "candidate": candidate[query["id"]]})
\`\`\`

These two English models are convenient for an executable example, not a recommendation for every domain or language. Candidate choice must follow licensing, supported languages, privacy, deployment hardware, context length, and observed relevance.

Do not compare raw scores across models as if 0.62 has the same meaning in both spaces. Scores support ordering within a model. If production uses a minimum similarity threshold, recalibrate it from candidate distributions and labeled outcomes rather than copying the baseline number.

## Measure regressions query by query

Aggregate recall@K is a release summary, not a diagnosis. Preserve per-query first relevant rank, top-K IDs, scores, latency, and slice tags. Then classify wins, ties, and losses.

Useful paired outputs include:

| Measure | What changes reveal | Caveat |
| --- | --- | --- |
| Recall@K delta | Relevant evidence enters or leaves context window | Binary relevance ignores ordering among relevant items |
| Reciprocal-rank delta | First useful result moves | Focuses only on first relevant result |
| NDCG@K delta | Graded relevant items reorder | Requires reliable graded judgments |
| Top-K Jaccard overlap | Candidate neighborhood changes | Change can be beneficial or harmful |
| Rank of forbidden result | Obsolete or unsafe evidence rises | Needs curated dangerous negatives |
| Score margin | Separation between relevant and nearest negative changes | Scales are model-specific |

The test below computes recall and reciprocal rank without a metrics dependency. It fails on a per-query allowlist of critical regressions rather than pretending one average tells the whole story.

\`\`\`python
def query_metrics(ranked, relevant, k):
    ids = [doc_id for doc_id, _ in ranked[:k]]
    relevant_in_k = relevant.intersection(ids)
    recall = len(relevant_in_k) / len(relevant)
    first_rank = next(
        (rank for rank, doc_id in enumerate(ids, start=1) if doc_id in relevant),
        None,
    )
    reciprocal_rank = 0.0 if first_rank is None else 1.0 / first_rank
    return {"recall": recall, "rr": reciprocal_rank, "ids": ids}


critical_query_ids = {"q1"}
paired = []
for query in queries:
    base = query_metrics(baseline[query["id"]], query["relevant"], k=3)
    cand = query_metrics(candidate[query["id"]], query["relevant"], k=3)
    paired.append(
        {
            "query_id": query["id"],
            "recall_delta": cand["recall"] - base["recall"],
            "rr_delta": cand["rr"] - base["rr"],
            "baseline_ids": base["ids"],
            "candidate_ids": cand["ids"],
        }
    )

critical_losses = [
    row
    for row in paired
    if row["query_id"] in critical_query_ids and row["recall_delta"] < 0
]
assert not critical_losses, critical_losses
print(paired)
\`\`\`

Set portfolio thresholds from product risk and baseline variance. Avoid fabricated universal percentages. A medical safety corpus, an internal code search tool, and an ecommerce recommender have different consequences for one missing result.

Use bootstrap intervals or a paired randomization method when the test set is large enough and statistical claims influence release. Regardless of statistical significance, manually review catastrophic losses in critical slices.

## Keep query and document encoders straight

Some retrieval models use different prompts or methods for queries and documents. Sentence Transformers provides \'encode_query()\' and \'encode_document()\' for models with a clear information-retrieval distinction, while general \'encode()\' is valid when the model has no such configured distinction. Follow the model card and library documentation.

Common migration bugs include applying the query prefix to documents, omitting a required prefix only in an asynchronous worker, and embedding historical documents with one configuration while new writes use another. Add a golden probe through every production embedding path, including batch backfill and online ingestion, then compare metadata and nearest neighbors.

If the service calls a hosted embedding API, pin the provider's supported model identifier and record response dimension. Mock it only for application error handling. Quality regression needs real candidate outputs because a fixture vector cannot represent semantic behavior.

Tokenizer truncation also differs by model. Record token counts and whether the answer-bearing tail survived. A candidate with a longer nominal context may still be fed text by a wrapper that truncates at the old limit.

## Benchmark latency as a distribution

Migration cost has several stages: tokenization, batching wait, model inference, network transport for hosted APIs, vector search, reranking, and end-to-end retrieval. Measure them separately and together.

Warm up the model before steady-state samples, but also record cold start because autoscaling and serverless deployment experience it. Use production-like batch sizes, text lengths, concurrency, hardware, and precision. Report median and tail percentiles from observed runs, with sample count and environment. Do not claim one model is "twice as fast" from a single local call.

Candidate dimensions affect more than embedding time. Larger vectors increase memory, network payload, index build time, and search work. Quantization can reduce cost but is another variable that may alter recall. Evaluate float candidate quality first, then quantify the precision tradeoff if quantization is planned.

Load tests need realistic filter selectivity. A tenant filter that leaves ten candidate points behaves differently from a broad public corpus. Include sparse tenants, large tenants, and filters with no matches. Verify authorization filters before comparing latency, since accidentally omitting a filter can make retrieval faster and unsafe.

## Recalibrate hybrid fusion and thresholds

If retrieval combines dense vectors with lexical search, the embedding change alters one branch's ranking and score distribution. Reusing fusion weights can overpromote or suppress dense results. Refit weights on a training subset and evaluate on a held-out set, or use a predeclared tuning procedure to avoid hand-optimizing release cases.

Deduplication may change too. If two chunks from the same document occupy top ranks, candidate semantics may require source-level diversification. Test the exact post-retrieval pipeline: filters, ANN, fusion, deduplication, reranking, and context selection. Model-only nearest neighbors are a diagnostic layer, not the final user experience.

Thresholded "no result" behavior is especially sensitive. Plot labeled candidate score distributions, choose a candidate threshold based on false-positive and false-negative costs, and test queries that should return no evidence. Copying a cosine threshold from the baseline is unjustified even when both models normalize vectors.

## Shadow indexing makes rollback credible

A safe rollout keeps baseline vectors and search available while candidate indexing proceeds. Use separate collection names or versioned aliases. Do not mutate points in place if rollback would require re-embedding the entire corpus.

An operational sequence can be:

1. Freeze and validate the corpus snapshot for offline evaluation.
2. Build the candidate collection and reconcile IDs.
3. Run exact or controlled ANN comparisons.
4. Shadow production queries to candidate search without serving its results.
5. Compare latency, empty results, filters, and ranked IDs using privacy-reviewed telemetry.
6. Canary a small eligible traffic segment with an immediate alias or configuration rollback.
7. Expand only while quality and service indicators remain inside declared gates.
8. Retain baseline index until rollback and delayed defect windows close.

Shadow requests should not double bill users, emit duplicate analytics, or trigger downstream actions. Retrieval should be read-only. Sample and redact queries according to data policy.

The [RAG regression testing guide](/blog/rag-regression-testing-guide) covers maintaining fixed and rotating evaluation sets as the corpus, prompts, retriever, reranker, and generator continue changing after migration.

## Inspect production disagreement without treating clicks as truth

Candidate and baseline top results will disagree. Sample disagreements by query slice, score margin, and importance. Review whether the candidate found better evidence, merely different equivalent evidence, or a harmful distractor.

Clicks and citation opens can provide signals, but position bias and interface changes confound them. A user may not click because the generated answer was sufficient, or may click a wrong result because its title was attractive. Combine behavioral data with judgments rather than converting clicks directly into relevance labels.

Monitor candidate-only failure modes: embedding API timeouts, rejected text, dimension mismatches, backlog age, index lag, and mixed model-version writes. A quality-perfect model that cannot keep its index current is not a successful migration.

## Decide what blocks release

Write gates before looking at candidate results. Include:

- No missing or duplicate chunk IDs after backfill.
- No dimension, NaN, or mixed-version vector defects.
- No recall loss on designated critical queries.
- Slice-level quality within product-owned tolerances.
- Tail latency, error rate, and indexing throughput within capacity limits.
- Authorization filters verified against the candidate collection.
- Rollback rehearsed while new candidate writes are occurring.

Separate blocking gates from investigation alerts. A modest top-K overlap is not automatically bad, because a better model should change neighbors. A forbidden obsolete policy entering rank 1 is a clear blocker even if average NDCG rises.

Record the final evidence bundle: manifests, corpus hash, judgment version, package lock, hardware, index settings, per-query results, aggregate report, approved exceptions, and rollback owner. That bundle turns a model swap into a reproducible engineering decision.

## Test continuous writes during the backfill

A corpus rarely stops changing while millions of historical chunks are embedded. The migration needs a watermark or change-data strategy so creates, updates, and deletes occurring during backfill reach the candidate index exactly once in their latest state. A completed bulk job is not proof of convergence.

Design a migration test with a controlled sequence: start the baseline snapshot, update document A, delete document B, create document C, finish candidate backfill, then apply the change stream. Query candidate storage by stable IDs and content hashes. A must contain its newest chunks, B must have no searchable tombstoned chunks, and C must be present with the candidate model version.

Race a document update with its historical backfill write. Version or timestamp conditions should prevent the older embedding from overwriting the newer one. Then replay the change event and prove idempotency. At-least-once delivery is common, so duplicate processing must not create duplicate vector points.

Dual-write systems need failure tests too. If baseline indexing succeeds and candidate indexing times out, record repairable state rather than failing the user write after one side has committed without visibility. Reconciliation should detect and repair divergence before traffic moves.

## Confirm rollback after candidate-only writes

Once a canary begins, new documents may exist only in the candidate path if dual-write coverage is incomplete. Rehearse switching the read alias back while writes continue. Baseline results must include all content promised during the rollout window, or rollback creates a silent freshness regression.

Keep model-neutral source chunks as the system of record. Vectors are rebuildable derivatives. A rollback plan based only on old vectors cannot recover documents added after the old index stopped ingesting. Verify baseline catch-up lag and delete propagation before announcing that an alias switch is sufficient.

Application caches can outlive the index switch. Include collection or model generation in cache keys, or purge retrieval caches during cutover and rollback. Otherwise a baseline request can receive candidate-ranked IDs from cache, complicating diagnosis and invalidating the rollback experiment.

## Audit downstream assumptions about dimension and score

Vector dimensions leak into database schemas, protobuf fields, memory preallocation, telemetry sampling, and test fixtures. Search the codebase for hard-coded lengths and validate every integration with a candidate probe. A reranker may accept text pairs and remain unaffected, while a clustering or novelty component that consumes raw vectors can break immediately.

Score assumptions spread just as easily. UI confidence labels, "no answer" rules, analytics buckets, and anomaly alerts may embed baseline thresholds. Inventory each consumer and either recalibrate it or remove the unsupported interpretation. Retrieval scores are not probabilities unless a separately validated calibration layer makes them so.

## Frequently Asked Questions

### Can old and new embeddings share a collection if dimensions match?

They should not. Equal dimensions do not mean compatible vector spaces. Store model-version metadata and use separate collections or strict partitions with no mixed search.

### Should we compare raw cosine scores between the two models?

No direct semantic equivalence should be assumed. Compare rankings and labeled outcomes. Recalibrate any score threshold using the candidate's own distributions.

### Must the corpus be re-embedded completely?

Yes when the embedding function changes. Every searchable document vector must inhabit the candidate space, and query vectors must use the compatible candidate configuration.

### How can we separate model regression from ANN index loss?

Compare candidate approximate search with exact search over the same candidate vectors. Model relevance uses judged queries; index recall measures whether ANN returns the exact nearest neighbors.

### When is it safe to delete the baseline index?

Only after the planned rollback window, delayed quality review, backfill verification, and operational rollback rehearsal are complete. Storage cost should be weighed against the time required to reconstruct baseline service.
`,
};
