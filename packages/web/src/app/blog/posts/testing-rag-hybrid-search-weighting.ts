import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Hybrid Search Weighting in RAG',
  description:
    'Test hybrid search weighting in RAG with judged query sets, lexical and vector diagnostics, score normalization, rank fusion sweeps, and retrieval guardrails.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Hybrid Search Weighting in RAG

Search for \`ERR_CONN_RESET 104\`, and the exact incident runbook should outrank a semantically similar networking overview. Search for "why does checkout forget my basket," and the embedding channel should recover a document titled "Session affinity failures" even though the wording barely overlaps. Hybrid retrieval exists because these two queries reward different evidence. Testing the weighting means discovering where lexical and vector signals complement each other, where one overwhelms the other, and whether the chosen combination stays reliable across query classes.

A single global relevance number is not enough. Build a judged corpus with exact identifiers, paraphrases, ambiguous acronyms, multilingual terms, fresh documents, and hard negatives. Capture each channel's candidate ranks before fusion. Sweep weights or rank-fusion parameters offline, then inspect slices and failure pairs. The outcome is not a magical optimum; it is a documented retrieval policy with regression thresholds.

## Define what the weight is combining

"Lexical weight 0.4, vector weight 0.6" sounds precise but is meaningless until the scoring pipeline is specified. BM25-style scores and cosine similarities have different ranges and distributions. Adding raw numbers lets scale, not relevance, decide the winner.

Hybrid implementations generally combine at one of two levels:

| Combination level | Inputs | Typical techniques | Important property |
|---|---|---|---|
| Score fusion | Normalized lexical and vector scores | Weighted sum, min-max, z-score, calibrated model | Magnitude after normalization matters |
| Rank fusion | Rank position from each candidate list | Reciprocal rank fusion, Borda-like methods | Mostly ignores raw score scale |

A weighted score might be \`alpha * lexicalNormalized + (1 - alpha) * vectorNormalized\`. A weighted reciprocal-rank variant might use \`lexicalWeight / (k + lexicalRank) + vectorWeight / (k + vectorRank)\`. Those alphas are not interchangeable. Record the formula, candidate depth, normalization scope, distance-to-similarity conversion, tie-breaking, and any filters.

Testing starts by making that contract observable. For every query, retain document ID, lexical raw score and rank, vector distance or similarity and rank, normalized values, fused score, and final rank. Without channel-level diagnostics, a poor result looks like "the model missed," even when the real issue is an empty lexical candidate list or a vector index filter.

## Construct a query set that forces signal disagreement

Random production queries overrepresent common easy cases. A useful benchmark deliberately includes places where channels disagree.

| Query slice | Example | Expected signal advantage | Characteristic risk |
|---|---|---|---|
| Exact identifiers | \`PAY-7392\` | Lexical | Embedding treats token as noise |
| Error fragments | \`SQLSTATE 42501\` | Lexical | Semantic neighbors outrank exact fix |
| Natural-language paraphrase | "receipts arrive twice" | Vector | Keyword mismatch |
| Product synonym | "workspace owner" vs "org admin" | Vector or curated synonym | Terminology drift |
| Ambiguous acronym | \`RLS\` | Context dependent | Wrong domain cluster |
| Mixed concept and code | "retry ECONNRESET upload" | Both | One channel dominates |
| Negated intent | "disable automatic renewal" | Both plus reranking | Semantically close opposite answer |
| Fresh unseen term | New release flag | Lexical | Embedding model never learned term |

Each judged query needs graded relevance, not only one "correct" document. A primary troubleshooting procedure might be highly relevant, a conceptual explanation partially relevant, and a similarly named page from another product irrelevant. Graded labels support nDCG; binary labels support recall and reciprocal rank. Use both when the product cares about finding all supporting chunks and ordering the best one first.

Judge at the retrieval unit. If the system retrieves chunks, label chunk IDs, not only parent documents. A relevant manual containing an irrelevant chunk should not receive full credit merely because its title looks right.

## Establish lexical-only and vector-only baselines

Before tuning fusion, measure each channel independently. If vector-only retrieval cannot find paraphrases, changing its weight will not repair bad embeddings or incorrect chunking. If lexical-only retrieval misses exact codes, inspect tokenization and indexed fields.

Baseline reporting should include:

- Recall@k for answer-bearing chunks.
- MRR for queries with one clearly preferred result.
- nDCG@k for graded rankings.
- Zero-candidate rate by channel.
- Overlap between the top-k candidate sets.
- Latency and candidate generation depth.
- Metrics for every named query slice.

Channel overlap is particularly diagnostic. Very high overlap means fusion may add little. Very low overlap can be valuable diversity, or it can indicate one broken channel. Inspect judged relevance among exclusive candidates.

A comparison table keeps technique selection grounded:

| Fusion method | Strength | Weakness | Use when |
|---|---|---|---|
| Raw score addition | Simple | Invalid when scales differ | Only when scores are already calibrated alike |
| Min-max weighted sum | Interpretable alpha | Sensitive to candidate-list extremes | Scores vary predictably within each query |
| Z-score fusion | Centers distributions | Unstable for tiny or flat lists | Candidate lists are sufficiently large |
| Reciprocal rank fusion | Scale independent and robust | Discards score gaps | Engines expose reliable ranks but incomparable scores |
| Learned-to-rank fusion | Can model query-dependent behavior | Needs quality labels and monitoring | Traffic and judgments justify added complexity |
| Cross-encoder reranking | Strong pairwise semantic judgment | Higher cost and limited candidate depth | First-stage hybrid retrieval already has good recall |

## A reproducible pgvector and full-text experiment

PostgreSQL with pgvector makes the mechanics visible. The following schema stores content, a generated English \`tsvector\`, and a three-dimensional embedding only to keep the runnable example compact. Production embeddings use the dimension required by the selected model.

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag_chunks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_key text NOT NULL,
  content text NOT NULL,
  textsearch tsvector GENERATED ALWAYS AS (
    to_tsvector('english', content)
  ) STORED,
  embedding vector(3) NOT NULL
);

CREATE INDEX rag_chunks_textsearch_idx
  ON rag_chunks USING gin (textsearch);

CREATE INDEX rag_chunks_embedding_idx
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);

INSERT INTO rag_chunks (document_key, content, embedding) VALUES
  ('runbook-104', 'ERR_CONN_RESET 104 during artifact upload retry procedure', '[0.98,0.05,0.02]'),
  ('network-guide', 'Troubleshooting interrupted network connections', '[0.95,0.10,0.04]'),
  ('billing-104', 'Invoice 104 refund approval workflow', '[0.20,0.90,0.10]'),
  ('upload-limits', 'Maximum artifact size and upload quotas', '[0.72,0.18,0.08]');
\`\`\`

pgvector documents cosine distance through \`<=>\`; cosine similarity is \`1 - distance\`. PostgreSQL full-text ranking can use \`ts_rank_cd\`. Candidate queries should order directly by the indexed distance operator with a limit so the vector index can be considered.

This rank-fusion query exposes both ranks and combines them. The query vector is supplied as a parameter in a real application; it is a literal here so the SQL can run as shown.

\`\`\`sql
WITH
params AS (
  SELECT
    plainto_tsquery('english', 'ERR_CONN_RESET 104 upload') AS text_query,
    '[0.96,0.08,0.03]'::vector(3) AS query_embedding
),
lexical AS (
  SELECT
    c.id,
    row_number() OVER (
      ORDER BY ts_rank_cd(c.textsearch, p.text_query) DESC, c.id
    ) AS lexical_rank,
    ts_rank_cd(c.textsearch, p.text_query) AS lexical_score
  FROM rag_chunks AS c
  CROSS JOIN params AS p
  WHERE c.textsearch @@ p.text_query
  ORDER BY lexical_score DESC, c.id
  LIMIT 20
),
semantic AS (
  SELECT
    c.id,
    row_number() OVER (
      ORDER BY c.embedding <=> p.query_embedding, c.id
    ) AS vector_rank,
    1 - (c.embedding <=> p.query_embedding) AS vector_similarity
  FROM rag_chunks AS c
  CROSS JOIN params AS p
  ORDER BY c.embedding <=> p.query_embedding, c.id
  LIMIT 20
),
candidates AS (
  SELECT id FROM lexical
  UNION
  SELECT id FROM semantic
)
SELECT
  c.document_key,
  l.lexical_score,
  l.lexical_rank,
  s.vector_similarity,
  s.vector_rank,
  0.7 * COALESCE(1.0 / (60 + l.lexical_rank), 0) +
  0.3 * COALESCE(1.0 / (60 + s.vector_rank), 0) AS fused_score
FROM candidates AS x
JOIN rag_chunks AS c ON c.id = x.id
LEFT JOIN lexical AS l ON l.id = x.id
LEFT JOIN semantic AS s ON s.id = x.id
ORDER BY fused_score DESC, c.id
LIMIT 5;
\`\`\`

The weights favor lexical rank for this identifier-heavy benchmark example. The constant 60 is the RRF rank constant, not a probability. Tune it separately from channel weights because it controls how quickly rank contribution decays. A large constant compresses differences near the top; a small one rewards top positions more sharply.

The \`COALESCE\` terms allow a candidate found by only one channel to participate. An inner join would silently discard the diversity hybrid search is supposed to add.

## Sweep weights without tuning on the test set

Separate queries into tuning and final evaluation sets. Use the tuning set to select candidate weights and the held-out set once for an unbiased comparison. If the corpus is small, use grouped cross-validation by intent family or parent document so near-duplicate questions do not leak across folds.

A minimal TypeScript evaluator can fuse precomputed ranks and report reciprocal rank. It is deliberately engine-independent: candidate generation should happen once, then many fusion settings can be evaluated cheaply.

\`\`\`typescript
type RankedCandidate = {
  id: string;
  lexicalRank?: number;
  vectorRank?: number;
};

type JudgedQuery = {
  id: string;
  relevantIds: Set<string>;
  candidates: RankedCandidate[];
};

function fuse(
  candidates: RankedCandidate[],
  lexicalWeight: number,
  vectorWeight: number,
  rankConstant = 60,
): string[] {
  return candidates
    .map((candidate) => ({
      id: candidate.id,
      score:
        (candidate.lexicalRank
          ? lexicalWeight / (rankConstant + candidate.lexicalRank)
          : 0) +
        (candidate.vectorRank
          ? vectorWeight / (rankConstant + candidate.vectorRank)
          : 0),
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((candidate) => candidate.id);
}

function reciprocalRank(ranking: string[], relevant: Set<string>): number {
  const index = ranking.findIndex((id) => relevant.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

export function sweep(queries: JudgedQuery[]) {
  return [0, 0.25, 0.5, 0.75, 1].map((lexicalWeight) => {
    const scores = queries.map((query) =>
      reciprocalRank(
        fuse(query.candidates, lexicalWeight, 1 - lexicalWeight),
        query.relevantIds,
      ),
    );
    return {
      lexicalWeight,
      vectorWeight: 1 - lexicalWeight,
      mrr: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    };
  });
}
\`\`\`

The deterministic document-ID tie-breaker matters. Without it, equal fused scores may change order across runs, producing metric noise and unstable citations.

Do not regenerate embeddings during every alpha sweep. Freeze the corpus version, embedding model and version, tokenizer configuration, index parameters, and candidate lists. Otherwise you are measuring several changes at once.

## Read the metric surface, not just its peak

If alpha 0.55 beats 0.50 by one query on the tuning set, that is not a mandate for two decimal places of precision. Plot or tabulate the metric across the sweep. Prefer a stable plateau that performs well across slices over a narrow peak vulnerable to corpus drift.

Review per-query deltas at each candidate setting:

| Change after increasing lexical influence | Likely interpretation | Follow-up |
|---|---|---|
| Exact-code slice improves | Desired identifier sensitivity | Check paraphrase regression |
| Most semantic queries drop together | Lexical weight too aggressive | Consider query-dependent routing |
| One acronym family improves | Token signal useful in that domain | Add acronym disambiguation judgments |
| Irrelevant exact match jumps to first | Keyword stuffing or field issue | Weight fields or add reranker |
| Results barely change | Candidate overlap or large RRF constant | Inspect ranks and decay |
| Exclusive vector candidates disappear | Candidate depth or missing-value handling | Verify union and fusion formula |

Metric averages hide tradeoffs. Set guardrails such as "exact identifier recall@5 must not regress" and "paraphrase nDCG@10 stays above the accepted baseline." The numbers should come from your benchmark and risk appetite, not an industry template.

## Normalize within a defensible population

For weighted score fusion, normalization scope changes rankings. Min-max normalization across only the top ten candidates makes the tenth score zero even if it is objectively strong. Normalizing each channel on different candidate depths changes their tails. A single outlier can compress every other value.

Test normalization with synthetic score distributions:

- All lexical scores are equal.
- Only one lexical match exists.
- Vector similarities occupy a narrow band.
- An exact title match has an extreme lexical score.
- One channel returns no candidates.
- Scores include negative values, which some similarity or model outputs can.

Define behavior for zero range rather than dividing by zero. Log the pre-normalized and post-normalized scores so changes in engine scoring do not masquerade as weight regressions.

Rank fusion avoids cross-scale arithmetic, but it is not free of tuning. Candidate depth, tie handling, RRF constant, and channel weights still matter. It also treats a tiny difference between ranks one and two according to position, even when their raw scores are virtually identical.

## Consider query-dependent weighting carefully

One global weight is operationally simple. Query classification can do better when intent families are clear: exact identifiers favor lexical retrieval, while conversational paraphrases favor vectors. But a router adds another model to test.

Start with transparent features:

- Presence of known error-code formats.
- Exact product SKU or ticket patterns.
- Quoted phrases.
- Query length.
- Ratio of out-of-vocabulary or rare tokens.
- Language detection confidence.

Create adversarial boundary cases. A natural-language query may contain an order ID but ask a conceptual question. An acronym can resemble a code. A malicious or accidental string can trigger the identifier regex. Report routing confusion separately from fusion performance.

If weights are learned, preserve a fallback policy for missing features and monitor feature distribution drift. A learned combiner should beat a fixed RRF baseline on held-out data by a margin meaningful to the product, not merely fit the labeling set.

## Evaluate retrieval before generation

An LLM can sometimes answer correctly from prior knowledge despite poor retrieval, or produce a persuasive wrong answer despite perfect context. End-to-end answer scoring alone cannot isolate weighting quality.

Use three layers:

| Layer | Assertion | Failure ownership |
|---|---|---|
| Candidate retrieval | Relevant chunk appears in channel top-k | Index, embedding, analyzer, filters |
| Fusion ranking | Relevant chunk reaches final context positions | Weighting, normalization, tie-breaking |
| Generated answer | Claims are supported by retrieved evidence | Prompt, model, context assembly |

Freeze the generator while comparing retrieval weights, or bypass generation entirely for the offline benchmark. After choosing candidates, run an end-to-end set to ensure improved retrieval actually helps answers and does not crowd the context with redundant chunks.

The [RAG retrieval testing best practices](/blog/rag-retrieval-testing-best-practices-2026) covers judged datasets and retrieval assertions more broadly. The [vector database recall testing guide](/blog/vector-database-recall-testing-guide) goes deeper on approximate-index recall versus an exact-search reference.

## Test filters and candidate depth with the weight

Tenant, language, permission, date, and document-type filters alter the candidate population before fusion. A vector index may apply filters after scanning approximate neighbors, returning fewer valid candidates than requested. A lexical query may find many filtered matches.

Run weighting benchmarks with representative filters and report the number of candidates from each channel. Increasing vector weight cannot compensate for a vector channel that returns only two permitted candidates. First adjust filtered search behavior or candidate depth, then retune.

Candidate depth is a quality and latency parameter. Fusion over top 20 may miss a relevant lexical result at rank 21; top 100 costs more and feeds weaker items into normalization. Sweep depth alongside weight, but avoid a combinatorial hunt. Use channel recall curves to select reasonable depths, then tune fusion within that range.

## Regression governance for corpus and model changes

The selected weight belongs to a particular retrieval stack. Re-run the benchmark when any of these change:

- Embedding model or vector normalization.
- Text analyzer, stemming, stop words, or synonyms.
- Chunk size and overlap.
- Document field boosts.
- Approximate-index configuration.
- Metadata filters.
- Reranker model.
- Corpus composition.

Version evaluation artifacts with those settings. Store per-query rankings, not only aggregate metrics, so reviewers can see what moved. A release gate should distinguish an approved relevance tradeoff from an accidental channel outage.

Production click data can supplement judgments but carries position bias and does not prove factual usefulness. Sample failed and low-confidence queries for human review. Never let raw click-through rate silently redefine relevance for safety or compliance content.

## Keep fusion experiments replayable

Persist the query text, corpus snapshot, channel rankings, judgments, and fusion configuration for each run. A metric without those inputs cannot be reproduced after the live index changes, so it cannot support a credible weighting decision.

## Frequently Asked Questions

### Is a 50/50 hybrid weight actually balanced?

Only if both channel values are calibrated to comparable meaning. Equal coefficients on raw BM25 and cosine values are not inherently equal influence. Rank fusion or explicit normalization makes the interpretation more defensible.

### Should lexical and vector candidate lists use the same depth?

Not automatically. Choose depths from each channel's recall and latency curves. Record them because changing depth can alter fused rankings even when weights stay fixed.

### How do I test a query where one channel returns no matches?

Include it deliberately. The fusion should retain candidates from the available channel, produce finite scores, and avoid inner joins or normalization errors that empty the final ranking.

### When should weighting vary by query?

Consider it when stable, testable query classes have materially different optima, such as exact error codes versus paraphrased questions. A routing policy adds complexity and needs its own boundary and drift tests.

### Can better hybrid retrieval guarantee a better RAG answer?

No. It improves the evidence available to generation. Context ordering, redundancy, prompting, and model behavior still affect the answer, so validate retrieval and grounded generation as separate layers.
`,
};
