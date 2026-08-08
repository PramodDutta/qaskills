import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG Testing Embedding Dimension Migration Without Retrieval Regressions',
  description: 'Plan RAG testing embedding dimension migration with dual indexes, invariant checks, retrieval evaluation, rollback gates, and runnable validation scripts.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# RAG Testing Embedding Dimension Migration Without Retrieval Regressions

RAG testing embedding dimension migration is the process of proving that a retrieval system can move from one embedding shape to another without mixing incompatible vectors, losing document coverage, corrupting index behavior, or degrading answer quality. The safe pattern is parallel storage and retrieval: create a new dimensioned column or collection, backfill from source text, dual-write new content, compare old and new retrieval offline, canary reads, then switch traffic with rollback still available.

Dimension validation alone is not enough. A vector can have the expected length while representing the wrong model, normalization rule, document revision, or chunking pipeline. A complete test plan binds every vector to model identity, dimension, preprocessing version, source checksum, and chunk identity. It then evaluates both mechanical invariants and retrieval outcomes on a frozen, judged query set.

## Treat the migration as a data-contract change

An embedding is derived data with a strict but incomplete shape contract. Moving from an illustrative 768 dimensions to 1,024 changes storage schema, client payloads, index definitions, memory use, and distance calculations. It may also imply a different model whose semantic behavior is unrelated to the size increase. More dimensions do not automatically mean better retrieval.

Write the contract before backfilling. Record the old and new model identifiers exactly as the embedding provider returns or documents them. Record the output dimension, distance metric, whether vectors are normalized, text preprocessing version, chunking version, and the source field used to produce the input. Store this metadata beside each vector or in an immutable embedding-version registry.

| Contract field | Example value | Test purpose |
|---|---|---|
| Embedding version | \`search-v2\` | Stable internal migration identity |
| Provider model ID | Provider-documented identifier | Prevents accidental model substitution |
| Dimensions | 1,024 (illustrative) | Rejects malformed storage and queries |
| Distance metric | Cosine distance | Keeps index and query semantics aligned |
| Normalization | Provider output unchanged | Detects hidden client transformation |
| Chunking version | \`chunk-v3\` | Separates embedding change from chunk change |
| Source checksum | SHA-256 of canonical input | Detects stale derived vectors |

Keep the embedding migration independent from chunking changes when possible. If chunk boundaries and embedding model change together, a retrieval gain or loss cannot be attributed. A clean migration re-embeds the same canonical chunks first. A later experiment can change chunking with its own baseline and acceptance criteria.

## Inventory every producer, store, and consumer

The obvious path is ingestion to vector database to retriever. Real systems have more: retry queues, batch backfills, user-upload pipelines, query embedding services, offline evaluators, caches, recommendation jobs, deletion handlers, disaster-recovery copies, and admin tools. Any component can continue producing the old dimension or reading the wrong index.

Draw a migration map and assign an observable version to each edge.

| Component | Writes vectors | Reads vectors | Migration risk |
|---|:---:|:---:|---|
| Live document ingestion | Yes | No | New documents missing from new index |
| Batch backfill | Yes | No | Stale source text or duplicate chunks |
| Query embedder | No | Produces query vector | Queries use old model against new store |
| Retriever API | No | Yes | Wrong collection or distance operator |
| Cache | Possibly | Yes | Old results mask new behavior |
| Deletion pipeline | Deletes | No | Removed document survives in one version |
| Evaluation runner | No | Yes | Compares unequal corpora or settings |

Search configuration and code for dimension literals, model names, collection names, vector column types, index operator classes, serialization schemas, and validation limits. An AI coding agent is helpful for inventory, but require file-and-line evidence. Do not let it infer that a generic field called \`embedding\` belongs to one version without tracing the write and read paths.

## Make incompatible vectors impossible to mix

The storage model should reject dimension mismatches before similarity search. In PostgreSQL with pgvector, a dimensioned column such as \`vector(1024)\` enforces the shape. Store old and new embeddings separately during migration rather than altering the only column in place.

\`\`\`sql
CREATE TABLE document_chunks (
  chunk_id uuid PRIMARY KEY,
  document_id uuid NOT NULL,
  source_text text NOT NULL,
  source_sha256 text NOT NULL,
  embedding_v1 vector(768),
  embedding_v2 vector(1024),
  embedding_v2_model text,
  embedding_v2_source_sha256 text,
  embedding_v2_created_at timestamptz
);

CREATE INDEX document_chunks_embedding_v2_hnsw
  ON document_chunks
  USING hnsw (embedding_v2 vector_cosine_ops)
  WHERE embedding_v2 IS NOT NULL;
\`\`\`

The dimensions above are illustrative. Use values supported by the chosen model and storage type. pgvector documents dimension limits and operator classes at https://github.com/pgvector/pgvector. Verify the installed extension and planned index type rather than copying a limit from an unrelated version or vector representation.

A separate table per embedding version can be even cleaner, especially when one chunk may have several representations. It enables a composite primary key on chunk and embedding version and keeps metadata normalized.

\`\`\`sql
CREATE TABLE chunk_embeddings (
  chunk_id uuid NOT NULL REFERENCES document_chunks(chunk_id) ON DELETE CASCADE,
  embedding_version text NOT NULL,
  provider_model text NOT NULL,
  dimensions integer NOT NULL,
  source_sha256 text NOT NULL,
  embedding vector NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_id, embedding_version),
  CHECK (dimensions = vector_dims(embedding))
);
\`\`\`

An unconstrained \`vector\` column allows different dimensions across rows, which is useful for versioned storage but shifts enforcement to metadata checks and queries. Approximate indexes generally need a consistent indexed shape and appropriate partial or expression strategy. A dedicated dimensioned column or version-specific table is simpler to operate when only two versions coexist.

## Validate embedding responses at the producer boundary

Reject invalid embeddings before opening a write transaction. Check array type, exact length, finite numeric values, model identity if returned, and expected item count for a batch. NaN and infinity must not enter distance math. Empty or zero vectors deserve an explicit policy because they may have valid shape but no useful direction.

\`\`\`ts
export function validateEmbedding(
  value: unknown,
  expectedDimensions: number,
): asserts value is number[] {
  if (!Array.isArray(value)) throw new Error('embedding must be an array');
  if (value.length !== expectedDimensions) {
    throw new Error(\`expected \${expectedDimensions} dimensions, received \${value.length}\`);
  }
  if (!value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    throw new Error('embedding contains a non-finite number');
  }
  const squaredNorm = value.reduce((sum, item) => sum + item * item, 0);
  if (squaredNorm === 0) throw new Error('embedding must not be the zero vector');
}
\`\`\`

Test negative cases directly. These tests run without a provider and catch SDK response parsing regressions early.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { validateEmbedding } from './validate-embedding';

describe('validateEmbedding', () => {
  it('accepts the configured dimension with finite values', () => {
    expect(() => validateEmbedding([0.1, -0.2, 0.3], 3)).not.toThrow();
  });

  it.each([
    { name: 'too short', value: [0.1, 0.2] },
    { name: 'too long', value: [0.1, 0.2, 0.3, 0.4] },
    { name: 'NaN', value: [0.1, Number.NaN, 0.3] },
    { name: 'infinity', value: [0.1, Number.POSITIVE_INFINITY, 0.3] },
    { name: 'zero vector', value: [0, 0, 0] },
  ])('rejects $name', ({ value }) => {
    expect(() => validateEmbedding(value, 3)).toThrow();
  });
});
\`\`\`

Do not validate dimensions by checking only the first item in a batch. Providers can return fewer items after partial filtering or an application can misalign outputs with inputs. Assert response item count equals request item count, preserve a stable input index or identifier, and fail the batch rather than shifting embeddings onto the wrong chunks.

## Bind vectors to the exact source revision

A backfill competes with live edits. The worker can read chunk text, call a provider, and write the resulting vector after the chunk changed. The dimension is valid, but the embedding is stale. Prevent this with an optimistic checksum guard.

Canonicalize the exact string sent to the embedding model, hash it, and write the vector only if the source checksum remains the same. Do not trim or normalize solely for hashing unless the same canonicalization is used for the provider input.

\`\`\`ts
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

export function sourceChecksum(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export async function storeEmbeddingV2(input: {
  pool: Pool;
  chunkId: string;
  sourceText: string;
  embedding: number[];
  model: string;
}): Promise<boolean> {
  const checksum = sourceChecksum(input.sourceText);
  const vectorText = \`[\${input.embedding.join(',')}]\`;
  const result = await input.pool.query(
    \`UPDATE document_chunks
     SET embedding_v2 = $1::vector,
         embedding_v2_model = $2,
         embedding_v2_source_sha256 = $3,
         embedding_v2_created_at = now()
     WHERE chunk_id = $4 AND source_sha256 = $3\`,
    [vectorText, input.model, checksum, input.chunkId],
  );
  return result.rowCount === 1;
}
\`\`\`

If the update affects zero rows, the worker should reload and requeue the latest source rather than marking the chunk complete. Test this race by pausing a fake embedding provider after it receives old text, updating the chunk and checksum, then releasing the response. The old vector write must fail, and a later attempt must embed the new text.

## Backfill in resumable, measurable batches

A safe backfill is idempotent. It selects rows missing the new version, claims a bounded batch, embeds them, writes with the checksum guard, and records failures without blocking unrelated chunks. It can restart without duplicating rows or skipping work.

Measure coverage with several counts, not one percentage. The denominator should be eligible current chunks, excluding intentionally unsupported or deleted data. Track missing vectors, stale checksums, wrong models, wrong dimensions, and orphan embeddings separately.

\`\`\`sql
SELECT
  count(*) FILTER (WHERE embedding_v2 IS NULL) AS missing,
  count(*) FILTER (
    WHERE embedding_v2 IS NOT NULL
      AND embedding_v2_source_sha256 <> source_sha256
  ) AS stale,
  count(*) FILTER (
    WHERE embedding_v2 IS NOT NULL
      AND embedding_v2_model <> 'configured-model-id'
  ) AS wrong_model,
  count(*) AS eligible_total
FROM document_chunks
WHERE deleted_at IS NULL;
\`\`\`

Replace the model identifier and dimension with configuration values used by your migration. Avoid interpolating them into SQL from untrusted input. A production health query can group by version metadata rather than embed one migration's constants permanently.

| Backfill invariant | Gate before canary | Gate before full cutover |
|---|---|---|
| Missing eligible vectors | Small known canary subset only | Zero, or documented excluded set |
| Source checksum mismatch | Zero in sampled corpus | Zero across eligible corpus |
| Wrong model metadata | Zero | Zero |
| Failed jobs | Classified and retrying | Zero unresolved permanent failures |
| Delete parity | Verified sample | Automated reconciliation passes |

Throttle provider calls according to documented quotas and retry guidance. Persist retry state and distinguish transient transport errors from permanent input rejection. Do not invent SDK options or retry flags. Wrap the provider behind an interface, and test your own retry policy with a fake that returns a scripted sequence.

## Dual-write new and updated chunks

If the backfill runs while ingestion continues, the finish line moves. Deploy dual-write before or at the start of backfill. For a new chunk, create both old and new embeddings if rollback requires the old path. For an update, invalidate both derived versions before or atomically with source replacement, then regenerate. For a deletion, remove both.

Strict atomicity across an external embedding API and a database is impossible with one local transaction. Use durable workflow state. Store the source chunk first, enqueue versioned embedding work transactionally with the source change if your architecture supports an outbox, and expose readiness per version. Retrieval should ignore a vector whose checksum does not match current source.

Test these lifecycle transitions:

| Lifecycle event | Old version | New version | Assertion |
|---|---|---|---|
| New document | Created while rollback needed | Created | Same current chunk set |
| Text edit | Marked stale, then replaced | Marked stale, then replaced | Neither stale vector is retrievable |
| Document delete | Deleted | Deleted | No result in either retriever |
| ACL change | Metadata updated | Metadata updated | Unauthorized query sees neither |
| Retry after failure | Remains available | Eventually created | No duplicate chunk-version row |

Access-control parity is especially important. A new vector collection copied from text but missing tenant or document ACL metadata can improve semantic scores while causing a security breach. Run authorization-filter tests on both retrieval paths before comparing relevance.

## Build a frozen retrieval evaluation set

Mechanical correctness says the new path can run. It does not say users will retrieve useful context. Create an evaluation set of real query patterns with judged relevant chunk IDs or documents. Include exact terminology, paraphrases, acronyms, rare product names, negation, multilingual text if supported, and queries that should return nothing.

Freeze the corpus snapshot, chunk IDs, access context, query text, retrieval depth, filters, and distance metric. Generate each query embedding with the corresponding version. Comparing an old query vector against the new document index is invalid and should fail on dimensions anyway.

\`\`\`ts
export type RetrievalCase = {
  id: string;
  query: string;
  relevantChunkIds: string[];
  tenantId: string;
};

export function recallAtK(
  retrievedIds: string[],
  relevantIds: string[],
  k: number,
): number {
  // Returning 1 here would hand a perfect score to every query with no known
  // relevant document, including ones that returned a full page of results. Those
  // cases are not recall cases; score them with noResultAtK instead.
  if (relevantIds.length === 0) {
    throw new Error('recallAtK requires at least one relevant id; use noResultAtK for no-answer cases');
  }
  const top = new Set(retrievedIds.slice(0, k));
  const hits = new Set(relevantIds.filter((id) => top.has(id))).size;
  return hits / new Set(relevantIds).size;
}

// For queries that should return nothing, assert emptiness directly rather than
// letting recall report a vacuous 1.
export function noResultAtK(retrievedIds: string[], k: number): boolean {
  return retrievedIds.slice(0, k).length === 0;
}

export function reciprocalRank(retrievedIds: string[], relevantIds: string[]): number {
  const relevant = new Set(relevantIds);
  const index = retrievedIds.findIndex((id) => relevant.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}
\`\`\`

Recall at k measures how much judged relevant material appears in the first k results. Reciprocal rank emphasizes the first relevant result. Also inspect precision, normalized discounted cumulative gain when graded relevance exists, no-result behavior, latency, and downstream answer evidence. No single metric represents RAG quality.

Use paired comparisons by query. An overall mean can hide a severe regression for one intent class behind small gains elsewhere. Report changed top results and segment by language, tenant, document type, query length, and known difficult categories.

## Add semantic invariants that do not need human labels

Judged evaluation sets are valuable but limited. Metamorphic tests create related inputs with expected relationships. A small punctuation change should usually keep important neighbors stable. Adding an access filter must remove forbidden chunks without introducing them under another ID. Re-embedding identical canonical text with the same deterministic provider configuration should produce compatible output according to the provider's documented behavior.

Do not assert that floating-point vectors are byte-for-byte identical unless the provider promises determinism. Instead, validate shape and compare retrieval or cosine similarity within a tolerance derived from observed controlled runs. Avoid universal thresholds copied from another model.

Useful transformations include:

| Transformation | Expected invariant | Caveat |
|---|---|---|
| Whitespace normalization | Similar top neighbors | Only if canonicalizer treats it as equivalent |
| Product acronym expansion | Relevant document remains near top | Requires domain synonym knowledge |
| Tenant filter added | Foreign chunks disappear | Ranking among allowed results may change |
| Duplicate chunk inserted | Deduplication prevents repeated context | Retriever may dedupe by document or checksum |
| Query language changed | Equivalent result for supported languages | Needs bilingual judgment |

These tests are regression sensors, not proof of semantic truth. Investigate failures rather than automatically weakening thresholds.

## Compare shadow traffic without affecting users

After offline evaluation passes, run the new retriever in shadow mode for a sampled set of production-like queries, subject to privacy and cost controls. The old result still serves the user. The system records versioned result IDs, ranks, latency, filters, and errors for comparison. Do not log raw sensitive queries unless policy explicitly permits it.

Use stable sampling keyed by a non-sensitive request identifier so the same traffic slice remains comparable. Bound the shadow call with its own cancellation and capacity budget. A slow experimental retriever must not delay the served response. If the old path itself is near capacity, shadowing can create a misleading performance incident, so load-test the combined demand.

Ready-made QA skills install from qaskills.sh with the qaskills CLI if you need a repeatable evaluation workflow. The judged cases, security filters, metrics, and release thresholds still need to reflect your corpus and product risks.

## Canary reads and rollback must be symmetric

Canary a small, stable traffic cohort on new retrieval after coverage and evaluation gates pass. Keep writes going to both versions. Compare error rate, empty-result rate, retrieval latency, answer-grounding outcomes, and user feedback where available. Avoid changing the generation model in the same rollout because it obscures retrieval attribution.

Rollback should be a read-routing change, not a hurried data restore. Preserve the old index and continue old writes until the observation window ends. Test rollback before cutover by routing a test cohort to new, then old, while verifying both serve current document revisions and enforce current ACLs.

\`\`\`ts
import { expect, it } from 'vitest';

export type EmbeddingVersion = 'search-v1' | 'search-v2';

export function chooseEmbeddingVersion(input: {
  canaryEnabled: boolean;
  stableBucket: number;
  canaryPercent: number;
}): EmbeddingVersion {
  if (!input.canaryEnabled) return 'search-v1';
  if (input.canaryPercent < 0 || input.canaryPercent > 100) {
    throw new Error('canaryPercent must be between 0 and 100');
  }
  return input.stableBucket < input.canaryPercent ? 'search-v2' : 'search-v1';
}

it('routes only configured buckets to the new version', () => {
  expect(chooseEmbeddingVersion({ canaryEnabled: true, stableBucket: 4, canaryPercent: 5 }))
    .toBe('search-v2');
  expect(chooseEmbeddingVersion({ canaryEnabled: true, stableBucket: 5, canaryPercent: 5 }))
    .toBe('search-v1');
});
\`\`\`

The bucketing function that produces \`stableBucket\` must also be tested for its documented range and stability. Percentages here illustrate routing mechanics, not a universal rollout recommendation.

## Diagnose the dimension-correct migration that retrieves nonsense

Imagine all new rows report 1,024 dimensions, backfill coverage is complete, and queries execute without error. Yet the top results are almost random. Inspect metadata and discover that document vectors use the new model while the query service still calls the old model with an option that also returns 1,024 values. Shape validation passes because both arrays have equal length.

The root defect is embedding-space identity, not dimension. Add an embedding version to the query request and retriever configuration, expose the chosen version in internal telemetry, and prevent a retriever from accepting a query vector without matching version metadata. Re-run the paired evaluation. This is why model identity and preprocessing belong in the contract.

Another realistic failure appears as declining coverage during backfill. Rows complete, then become stale faster than the worker can catch up. Source edits are racing with vector writes, and the completion metric counts any non-null new vector. Change the metric to require matching source checksums, deploy dual-write for current edits, and make stale writes fail their guarded update.

An authorization failure can look like a quality improvement: recall rises because the new index searches every tenant. Segment results by tenant and run forbidden-canary queries before celebrating metric gains. Security filters are a precondition to relevance comparison.

## What people get wrong about larger dimensions

The most persistent misconception is that a larger vector is inherently more accurate. Dimension is a representation shape, not a quality score. A smaller model can outperform a larger representation for a particular corpus, and a model change can alter strengths across languages or domain terminology. Decide with paired retrieval and downstream answer evaluation.

Teams also attempt an in-place column alteration and immediate reindex. That removes the old read path before new data and queries are proven, making rollback slow and risky. Parallel versioned storage costs more temporarily but creates observable coverage and a fast routing rollback.

Finally, many migrations verify only successful inserts. They miss stale source races, deletes, ACL changes, partial batches, query model mismatch, and caches keyed without embedding version. Test the complete lifecycle of derived data.

## Connect retrieval checks to end-to-end RAG behavior

The new retriever should eventually be tested in the full answer pipeline. Preserve retrieved chunk IDs and citations so a failed answer can be separated into retrieval failure, context assembly failure, or generation failure. The [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) provides a broader framework for nondeterministic workflows, tool choices, and outcome evaluation.

If retrieval is exposed through tools or external context providers, validate transport schemas and failure behavior as well. The [MCP servers test automation guide](/blog/mcp-servers-test-automation-2026) is relevant when an agent obtains the new retriever through an MCP server rather than an in-process call. Keep model-space compatibility enforcement inside the retrieval service so every transport receives the same protection.

Do not let answer fluency hide retrieval defects. An LLM can produce a plausible response from prior knowledge even when no relevant chunk was returned. Evaluate citation support, required-fact coverage, and abstention when the corpus lacks evidence. Compare answers on the same retrieval snapshot and generation configuration when isolating the embedding migration.

## Build the final migration evidence packet

Before full cutover, assemble evidence that another engineer can reproduce: schema and index definitions, embedding contract, corpus snapshot ID, backfill reconciliation, producer validation results, delete and ACL parity, offline paired metrics, shadow comparison, canary telemetry, cost impact, and rollback drill. Record illustrative thresholds as project decisions, not industry facts.

After the observation window, removing the old index is a separate destructive migration. First stop old reads, then stop old writes, verify no rollback requirement remains, archive evaluation evidence, and delete through the normal reviewed database process. Reclaiming storage should never be bundled into the traffic cutover.

## Frequently Asked Questions

### Can a vector database store two embedding dimensions at once?

Many stores can hold separate collections, indexes, columns, or versioned records with different dimensions. The important rule is that one similarity index and its queries operate in one compatible embedding space. With pgvector, separate dimensioned columns or version-specific tables are straightforward migration patterns. An unconstrained vector column can hold varying lengths, but consistent indexing and strong application checks become more complicated. Prefer a layout that makes accidental mixing difficult.

### How do I know whether the new embedding model is better?

Evaluate both versions on the same frozen corpus, chunk boundaries, access filters, query set, and retrieval depth. Use judged relevant chunks to calculate recall, rank-sensitive metrics, and per-segment regressions. Then inspect downstream answers for supported claims and abstention. Compare latency and cost too. A higher average score is not sufficient if important languages, tenants, document types, or safety-critical queries regress beyond the release criteria.

### Should query and document embeddings be migrated simultaneously?

They must be compatible at read time, but deployment can be staged through explicit version routing. Continue producing old and new document vectors, and have each retriever create or accept the matching query embedding for its own space. Never send an old-space query vector to the new index, even if the dimensions happen to match. Version metadata and service boundaries should reject that configuration before executing similarity search.

### When is it safe to delete the old embeddings?

Delete them only after full traffic has used the new path for the agreed observation period, dual-write and rollback drills have passed, current document and ACL parity is reconciled, and stakeholders explicitly release the rollback requirement. Stop old reads first, then old writes, and monitor for hidden consumers. Treat storage removal as a separate reviewed migration with backups and evidence, not as the final line of the initial cutover script.
`,
};
