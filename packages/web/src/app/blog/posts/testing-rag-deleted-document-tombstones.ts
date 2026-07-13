import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Deleted-Document Tombstones in RAG',
  description:
    'Test deleted-document tombstones in RAG across vector retrieval, caches, citations, races, and reindexing so removed sources cannot resurface.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Deleted-Document Tombstones in RAG

Delete the travel policy, ask the assistant about the old meal allowance, and watch it quote the removed paragraph with a perfect citation. The source vanished from the content system, but its chunks remained in the vector index, a retrieval cache, or the conversation context. In retrieval-augmented generation, deletion is a distributed invalidation workflow, not a row-level event.

A tombstone is durable evidence that a logical document version must not be served. It protects the gap between deletion intent and physical cleanup. Retrieval must enforce that evidence even while asynchronous workers remove vectors, cached candidates expire, and replicas converge. Tests therefore need a canary fact unique to the deleted document, plus oracles at retrieval, prompt assembly, final answer, and citation layers.

## Draw the deletion path before choosing assertions

Inventory every copy and identifier. A typical ingestion creates a source record, immutable version, extracted text, chunks, embeddings, vector rows, keyword-index documents, summaries, and cache entries. A chat turn may copy chunks into durable conversation history. Deletion must either remove or deny all of them.

| Layer | Residual failure after source deletion | Strong test evidence |
|---|---|---|
| Source catalog | Status still active on a replica | Tombstone version visible to retrieval authority |
| Object storage | Extracted file remains readable | Authorized fetch is denied or object is purged per policy |
| Vector database | Old chunk remains nearest neighbor | Candidate absent before top-k truncation |
| Keyword index | Exact canary phrase still matches | Hybrid result contains no deleted chunk |
| Retrieval cache | Previously cached IDs bypass new search | Cache hit is filtered by current tombstones |
| Reranker cache | Old ranked list is reused | Deleted candidates removed before prompt assembly |
| Prompt builder | Filtered result still copied into context | Captured prompt contains neither canary nor source ID |
| Citation formatter | Model invents or reuses stale citation | Final citation set is a subset of permitted context |
| Conversation memory | Earlier answer preserves removed content | Documented redaction or historical-retention behavior |

The last row is a product and compliance decision. A user may already have seen the content before deletion. You may remove future retrieval while retaining audit logs, or scrub stored conversation material. State the policy explicitly; otherwise the test team cannot distinguish a leak from intended history.

## Use immutable versions and a monotonic tombstone

Stable logical document IDs simplify user workflows, while immutable version IDs keep ingestion races observable. Every chunk should carry \`tenant_id\`, \`document_id\`, and \`document_version\`. The authority store records whether that version is active and a monotonically increasing generation or event sequence.

A boolean copied into vector metadata is not enough. If deletion updates the vector row asynchronously, the stale vector still says active during the dangerous window. Retrieval should join or batch-check candidates against an authoritative active-version set, or use a deny structure updated before the deletion API acknowledges success.



\`\`\`sql
CREATE TABLE rag_documents (
  tenant_id bigint NOT NULL,
  document_id uuid NOT NULL,
  version integer NOT NULL,
  state text NOT NULL CHECK (state IN ('indexing', 'active', 'deleted', 'failed')),
  deletion_generation bigint,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, document_id, version)
);

CREATE TABLE rag_chunks (
  tenant_id bigint NOT NULL,
  document_id uuid NOT NULL,
  document_version integer NOT NULL,
  chunk_id uuid NOT NULL,
  content text NOT NULL,
  embedding vector(3) NOT NULL,
  PRIMARY KEY (tenant_id, chunk_id),
  FOREIGN KEY (tenant_id, document_id, document_version)
    REFERENCES rag_documents (tenant_id, document_id, version)
);

CREATE INDEX rag_chunks_embedding_hnsw
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);
\`\`\`



The three-dimensional vector keeps the example small; real embedding dimensions must match the model. The catalog state is the retrieval authority. Physical chunk deletion can follow, but an acknowledged tombstone makes the version immediately ineligible.

Make deletion idempotent. Replaying the same event must not reactivate a version or decrease its generation. If an old ingestion completion arrives after deletion, compare generations and reject the stale activation.

## Test retrieval with a canary that has nowhere else to come from

Create three documents: an active control, a soon-to-be-deleted target, and an unrelated distractor. Put a unique, synthetic fact only in the target, such as “Project Juniper's meal ceiling is 73 credits.” Avoid real secrets and common phrases. Confirm the target is retrievable before deletion, delete it, then issue exact and paraphrased queries.



\`\`\`ts
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

type Candidate = { chunk_id: string; document_id: string; content: string };

async function retrieveActive(
  tenantId: number,
  queryEmbedding: number[],
  limit: number,
): Promise<Candidate[]> {
  const result = await pool.query<Candidate>(
    \`SELECT c.chunk_id, c.document_id, c.content
       FROM rag_chunks AS c
       JOIN rag_documents AS d
         ON d.tenant_id = c.tenant_id
        AND d.document_id = c.document_id
        AND d.version = c.document_version
      WHERE c.tenant_id = $1
        AND d.state = 'active'
      ORDER BY c.embedding <=> $2::vector
      LIMIT $3\`,
    [tenantId, JSON.stringify(queryEmbedding), limit],
  );
  return result.rows;
}

test('a tombstoned version is ineligible even before chunk purge', async () => {
  const targetId = '8dffbd74-7e65-4d5a-85ae-98e4fbd7c269';
  const canary = "Project Juniper's meal ceiling is 73 credits";

  const before = await retrieveActive(401, [1, 0, 0], 5);
  expect(before.some((row) => row.content.includes(canary))).toBe(true);

  await pool.query(
    \`UPDATE rag_documents
        SET state = 'deleted', deleted_at = now(), deletion_generation = 18
      WHERE tenant_id = $1 AND document_id = $2 AND version = 3\`,
    [401, targetId],
  );

  const after = await retrieveActive(401, [1, 0, 0], 5);
  expect(after).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ document_id: targetId })]),
  );

  const physicalRows = await pool.query(
    'SELECT count(*)::int AS count FROM rag_chunks WHERE document_id = $1',
    [targetId],
  );
  expect(physicalRows.rows[0].count).toBeGreaterThan(0);
});
\`\`\`



This intentionally leaves chunk rows present. The test proves logical concealment during asynchronous purge. Add a later worker test that waits for physical removal, but never make physical cleanup the only protection.

For vector databases that cannot join an authority table, over-fetch candidates, filter every candidate against the current active set, then take the requested top k. Filtering after \`LIMIT k\` can return too few results and tempt teams to disable the check. It is not safe to return a tombstoned candidate merely to fill the list.

## Assert exclusion before generation, not only in the answer

An LLM may decline to mention the canary even when the deleted chunk entered its prompt. A final-answer assertion can pass by chance. Capture the retrieval result and the constructed prompt or structured context at the boundary immediately before model invocation.



\`\`\`python
from dataclasses import dataclass

@dataclass(frozen=True)
class Chunk:
    document_id: str
    chunk_id: str
    text: str

def build_context(candidates: list[Chunk], active_document_ids: set[str]) -> str:
    permitted = [
        chunk for chunk in candidates if chunk.document_id in active_document_ids
    ]
    return "\n\n".join(
        f"SOURCE {chunk.document_id}/{chunk.chunk_id}\n{chunk.text}"
        for chunk in permitted
    )

def test_deleted_candidate_is_removed_from_model_context():
    deleted_id = "doc-juniper-v3"
    candidates = [
        Chunk(deleted_id, "chunk-9", "Meal ceiling: 73 credits"),
        Chunk("doc-current-v1", "chunk-2", "Consult the current expense portal"),
    ]

    context = build_context(candidates, active_document_ids={"doc-current-v1"})

    assert deleted_id not in context
    assert "73 credits" not in context
    assert "doc-current-v1/chunk-2" in context
\`\`\`



In an end-to-end evaluation, additionally assert that the final answer does not state or paraphrase the canary and does not cite the deleted document. Keep the pre-generation exclusion as the deterministic security oracle. The [RAG source attribution guide](/blog/rag-source-attribution-testing-guide-2026) covers citation-to-context entailment beyond deletion.

## Flush or revalidate every cache boundary

Cache keys based only on query text are unsafe when document visibility changes. At minimum, include tenant and retrieval-policy identity. Deletion can invalidate by document ID if the cache maintains reverse references, or a generation number can make old entries miss automatically.

Test cache behavior with a deliberate sequence:

1. Query the canary online and prove a cache entry is populated.
2. Delete the document and acknowledge the tombstone.
3. Repeat the identical query, not a cache-busting paraphrase.
4. Assert a cache hit cannot return the target ID.
5. Recreate the process or cache client and repeat to cover local memory.

A robust result cache stores candidate IDs, then rechecks current eligibility before returning content. A cached fully assembled prompt is harder to make safe because it has lost structured identifiers. Prefer structured cache entries with source metadata.

Semantic caches can match paraphrases to an answer generated before deletion. They need provenance linking the cached answer to every supporting version. On lookup, invalidate or reject any entry whose provenance contains a tombstoned source. Test the exact old question and a close paraphrase.

## Race deletion against ingestion and query execution

The worst failures live between stages. Construct deterministic barriers rather than hoping CI timing lands in the window.

| Race | Unsafe outcome | Required invariant |
|---|---|---|
| Delete arrives while embedding job runs | Worker publishes chunks after deletion | Generation check prevents activation |
| Retrieval selects IDs, then deletion commits | Prompt receives content after acknowledgement | Eligibility rechecked before prompt assembly |
| Delete and update version cross | Old version becomes active again | Monotonic version and event ordering |
| Purge event delivered twice | Worker errors or deletes new version | Idempotent deletion scoped to exact version |
| Query cache write follows deletion | Stale result repopulates cache | Cache write validates generation |
| Restore follows purge | Missing content is marked active | Restore reingests as a new version |

Expose test hooks around “candidates selected” and “prompt assembled” in a non-production harness. Pause a request after vector search, commit the deletion, resume, and assert the pre-prompt check removes the candidate. This defines the strongest boundary: once deletion is acknowledged, no subsequently assembled prompt may include that version.

If your contract allows a short consistency window, state its start and end precisely. Does it begin when the API accepts the request or when the event is published? A vague “eventually deleted” promise cannot produce a useful test.

## Cover hybrid retrieval and reranking

Vector tests do not protect BM25, database fallback search, graph traversal, curated FAQ matches, or recommendation caches. Run the canary through every candidate generator and through their fusion stage. A deleted result from either branch must not survive reciprocal-rank fusion or reranking.

Rerankers should receive only permitted candidates when feasible. If they operate before authority filtering for performance reasons, the final filter remains mandatory and diagnostics must not expose deleted content. Test top-k behavior when the deleted document would rank first. The first active result should move up, not produce an empty answer if other evidence exists.

Metadata filters inside a vector query are helpful but require adversarial tests for type coercion and missing fields. A chunk with no \`state\` metadata must fail closed. Tenant filters and tombstone filters should be composed together. A deleted document from another tenant is not the only cross-scope case; an active document from another tenant is equally forbidden.

The [RAG retrieval testing guide](/blog/rag-retrieval-testing-best-practices-2026) provides broader recall, ranking, and filter evaluation patterns.

## Reindexing must preserve deletion intent

A full rebuild can resurrect records if it scans object storage rather than the authoritative catalog. Test a tombstoned source through an empty-index rebuild. After indexing completes, search for the canary and inspect chunk counts. Neither should show the deleted version.

Backups and disaster recovery need the same check. Restore a catalog backup and vector snapshot from slightly different times, replay deletion events, and ensure generations converge to deleted. A replay cursor that skips the tombstone can undo the protection.

Re-adding a document should create a new immutable version. It must not clear the old tombstone in place. Test that citations use the new version, old chunks remain ineligible, and content differences are respected. If the canary was removed in the new upload, it must stay unretrievable.

## Evidence to retain when a deletion test fails

Capture identifiers, never sensitive bodies unless the environment permits it. Useful artifacts include tenant, logical document ID, version, chunk IDs, deletion generation, event offset, vector candidate ranks, cache hit status, active-set response, and citations emitted. That evidence locates the stale layer without placing deleted content into CI logs.

Test cleanup must physically purge the synthetic canary and cache entries, even if the product's normal path retains tombstones. Use a namespaced tenant and an administrative fixture cleanup method. A failed deletion test should not poison later retrieval suites.

Monitor production using safe synthetic probes. Periodically delete a canary document and query for its unique marker across retrieval paths. Alert on any candidate or citation after the promised boundary. This measures the integrated pipeline rather than only worker queue health.

## A release gate for deletion safety

Keep these cases near the ingestion and retrieval code:

- Target is retrievable before deletion, proving fixture validity.
- Tombstone blocks retrieval while physical vectors remain.
- Exact cached query and semantic paraphrase are invalidated.
- Keyword, vector, and hybrid branches all exclude the version.
- Captured model context has no deleted ID or canary text.
- Final response neither reveals the fact nor cites the source.
- Deletion during ingestion cannot be overwritten by late completion.
- Deletion between candidate selection and prompt assembly wins.
- Duplicate purge events are safe.
- Full reindex and backup replay do not resurrect tombstones.
- New upload creates a distinct active version.
- Cross-tenant and missing-state chunks fail closed.

The key is layered proof. A clean final answer is welcome, but a clean candidate set, prompt, and citation graph explain why it is clean and keep it clean across model changes.

## Treat derived summaries as documents with provenance

RAG pipelines often create a collection summary, hypothetical questions, entity nodes, or knowledge-graph edges from source chunks. Deleting only the original vectors leaves those derived artifacts able to reproduce the fact without citing the old document directly.

Require every derivative to carry a provenance set of source version IDs. When any required source is tombstoned, either invalidate the derivative or recompute it from remaining active sources. The choice depends on whether its claims can still be supported. Test a summary derived solely from the canary document and another summary derived from two sources. After deletion, the first must vanish; the second must be regenerated so no deleted-only sentence survives.

Graph edges need the same treatment. If a removed policy created the triple “Juniper, meal ceiling, 73,” graph retrieval can leak it even with an empty vector result. Search by entity, relationship, and raw canary value. Assert provenance filtering before those edges reach generation.

## Authorization revocation is a tombstone-shaped problem

A document may remain active globally while one user loses access. Retrieval caches and precomputed conversation context face the same invalidation problem as deletion, but the authority is an access-control version rather than document state. Reuse the testing pattern without conflating the events.

Prime a query as an authorized user, revoke the user's group membership, then repeat the identical cached query. The active document must be excluded for that principal while remaining retrievable to a control user. Include tenant, principal policy generation, and document visibility in cache decisions. A globally active flag cannot represent per-user revocation.

Keeping these tests adjacent is valuable because fixes for deletion often introduce a fast-path cache that later bypasses authorization. The common invariant is current eligibility at prompt assembly, but diagnostics should identify whether denial came from tombstone, tenant isolation, version supersession, or access policy.

## Frequently Asked Questions

### Is deleting vectors enough to remove a RAG document?

No. Keyword indexes, caches, summaries, conversation memory, object storage, and replicas may retain it. Use an authoritative tombstone for immediate ineligibility and verify physical cleanup separately.

### Should tombstoned chunks be filtered in the vector database or application?

Filter as early as the store reliably supports, then enforce authorization and current version eligibility again before prompt assembly. Copied metadata can be stale, so high-assurance systems need an authoritative check.

### How can a test prove the LLM never saw deleted text?

Capture structured candidates and the final context passed to the model, then assert the deleted source ID and unique canary are absent. An answer-only assertion is probabilistic because a model may ignore supplied text.

### What happens if the same document is uploaded again?

Create a new immutable version and ingest it under a higher generation. Keep the old version tombstoned, verify citations point to the new version, and ensure old-only facts remain unavailable.

### How long should deletion convergence take?

Set the period from your product and compliance requirements. Logical retrieval denial should often occur when deletion is acknowledged, while physical purge may be asynchronous. Test each deadline independently and identify its exact starting event.
`,
};
