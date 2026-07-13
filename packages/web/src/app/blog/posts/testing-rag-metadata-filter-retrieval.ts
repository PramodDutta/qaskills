import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Metadata-Filtered Retrieval in RAG',
  description:
    'Test RAG metadata-filtered retrieval for tenant, date, and document-type boundaries with adversarial fixtures, SQL checks, and recall diagnostics.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Metadata-Filtered Retrieval in RAG

The nearest vector to "renewal terms" belongs to another tenant. The second nearest is an expired policy, and the third is a marketing slide rather than a contract. A metadata-filtered retriever must skip all three and return the less-similar document that is actually authorized and in scope.

That scenario exposes why relevance-only RAG evaluations are incomplete. Tenant id is a security boundary. Effective date can be a legal or operational boundary. Document type controls which corpus is appropriate for the question. A fluent answer grounded in a forbidden chunk is still a critical failure, even if a semantic relevance judge scores it highly.

## Express filter semantics as a retrieval contract

Start with a typed request contract rather than a free-form metadata object. The product must decide whether date bounds are inclusive, which timezone interprets a date, whether missing metadata is eligible, and how multiple document types combine.

For this article, the contract is:

| Filter field | Semantics | Failure severity |
|---|---|---|
| \`tenantId\` | Exact match, always required | Cross-tenant result is a security defect |
| \`validAt\` | \`valid_from <= validAt\` and \`valid_to\` is null or later | Stale or future policy may mislead the answer |
| \`documentTypes\` | Result type must be in the requested list | Wrong source class contaminates grounding |
| Result limit | At most K eligible chunks after filtering | Underfill can reduce answer quality |
| Similarity order | Increasing distance among eligible rows | Incorrect ordering changes supplied context |

The date boundary needs an exact decision. Here, \`valid_to\` is exclusive: a policy with \`valid_to = 2026-07-01T00:00:00Z\` is not valid at that instant. This half-open interval composes cleanly when a replacement starts at the same timestamp.

Do not let the LLM invent these filters from the user's prose without testing that translation layer separately. Retrieval tests should receive a known structured filter and prove enforcement. Query-understanding tests should prove that "current security policy" becomes the intended structure.

## Build adversarial neighbors, not random documents

A weak fixture puts allowed and forbidden documents far apart in embedding space. Even a retriever that ignores filters might return the allowed document, producing a false sense of safety. Construct near-collisions where the forbidden chunk is semantically closer.

The fixture matrix should include:

| Fixture | Tenant | Validity | Type | Vector relationship | Expected |
|---|---|---|---|---|---|
| A | alpha | Current | contract | Second nearest | Returned first |
| B | beta | Current | contract | Exact query vector | Excluded by tenant |
| C | alpha | Expired | contract | Slightly nearer than A | Excluded by date |
| D | alpha | Current | marketing | Slightly nearer than A | Excluded by type |
| E | alpha | Starts tomorrow | contract | Near A | Excluded as future |
| F | alpha | Current | contract | Third eligible | Returned after A |

Use tiny hand-authored vectors for retrieval mechanics. They are not meaningful language embeddings, which is a feature: the expected distance order can be computed and reviewed. A separate corpus evaluation should use the production embedding model.

## Test a pgvector query with filters inside SQL

The strongest enforcement puts restrictive predicates in the same query that orders vectors. The following example uses PostgreSQL with pgvector, node-postgres, and Vitest. It assumes the \`vector\` extension is installed.

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag_chunks (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  document_type text NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  content text NOT NULL,
  embedding vector(3) NOT NULL,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX rag_chunks_filter_idx
  ON rag_chunks (tenant_id, document_type, valid_from);

SELECT id, content, embedding <=> $1::vector AS distance
FROM rag_chunks
WHERE tenant_id = $2
  AND document_type = ANY($3::text[])
  AND valid_from <= $4::timestamptz
  AND (valid_to IS NULL OR valid_to > $4::timestamptz)
ORDER BY embedding <=> $1::vector
LIMIT $5;
\`\`\`

The \`<=>\` operator is cosine distance in pgvector. Lower values are nearer. The tenant predicate is not applied after retrieval in application code; PostgreSQL considers only rows satisfying the \`WHERE\` clause for the result.

Parameterize values exactly as shown rather than concatenating metadata into SQL. Dynamic filter construction should map an allowlisted input schema to parameterized predicates. User-provided metadata keys or operators must never become raw SQL.

The multicolumn B-tree index helps filter lookup, while vector index choices depend on corpus size and query distribution. Exact nearest-neighbor search is the pgvector default. HNSW and IVFFlat are approximate and introduce additional recall considerations, especially because filtering and approximate scans interact.

## A runnable isolation and boundary test

The test inserts deliberate collisions, retrieves for tenant alpha at one instant, and proves both positive ordering and negative exclusion. It uses an outer transaction so fixtures disappear afterward.

\`\`\`typescript
import { Client } from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';

const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });

type SearchFilters = {
  tenantId: string;
  validAt: string;
  documentTypes: string[];
};

async function retrieve(queryVector: number[], filters: SearchFilters, limit: number) {
  const vector = \`[\${queryVector.join(',')}]\`;
  const result = await db.query<{ id: string; distance: number }>(
    \`SELECT id, embedding <=> $1::vector AS distance
       FROM rag_chunks
      WHERE tenant_id = $2
        AND document_type = ANY($3::text[])
        AND valid_from <= $4::timestamptz
        AND (valid_to IS NULL OR valid_to > $4::timestamptz)
      ORDER BY embedding <=> $1::vector
      LIMIT $5\`,
    [vector, filters.tenantId, filters.documentTypes, filters.validAt, limit],
  );
  return result.rows;
}

beforeAll(async () => {
  await db.connect();
  await db.query('BEGIN');
  await db.query(
    \`INSERT INTO rag_chunks
      (id, tenant_id, document_type, valid_from, valid_to, content, embedding)
     VALUES
      ('allowed-current', 'alpha', 'contract', '2026-01-01Z', NULL,
       'Alpha renewal requires 30 days notice', '[0.99,0.01,0]'),
      ('other-tenant', 'beta', 'contract', '2026-01-01Z', NULL,
       'Beta renewal requires 90 days notice', '[1,0,0]'),
      ('expired-alpha', 'alpha', 'contract', '2025-01-01Z', '2026-06-01Z',
       'Old Alpha renewal required 60 days', '[0.999,0.001,0]'),
      ('wrong-type', 'alpha', 'marketing', '2026-01-01Z', NULL,
       'Renew today for a special offer', '[0.998,0.002,0]'),
      ('allowed-second', 'alpha', 'contract', '2026-01-01Z', NULL,
       'Renewals are submitted in the portal', '[0.95,0.05,0]')\`,
  );
});

afterAll(async () => {
  await db.query('ROLLBACK');
  await db.end();
});

test('filters before ranking for tenant, effective date, and type', async () => {
  const rows = await retrieve(
    [1, 0, 0],
    { tenantId: 'alpha', validAt: '2026-07-13T00:00:00Z', documentTypes: ['contract'] },
    5,
  );

  expect(rows.map((row) => row.id)).toEqual(['allowed-current', 'allowed-second']);
  expect(rows.every((row, index) => index === 0 || rows[index - 1].distance <= row.distance)).toBe(
    true,
  );
});
\`\`\`

The expected list asserts more than absence of the beta row. It proves the eligible set is not underfilled despite three closer forbidden neighbors. That catches a common flawed architecture: retrieve top K globally, then discard metadata mismatches in application code. With K equal to two, that architecture could return zero allowed chunks.

## Detect post-filtering by testing underfill

Post-filtering is not always wrong. Some vector services expose it as the only mode, or teams intentionally overfetch candidates before applying business rules. The test must then measure whether the candidate budget reliably fills K eligible results.

Create N forbidden near-neighbors ahead of K allowed rows, where N exceeds the upstream candidate limit. Ask for K results. If the retriever returns fewer despite enough eligible corpus rows, you have quantified an underfill defect.

Avoid asserting that every query always returns K. A restrictive filter may genuinely match fewer documents. Compute the eligible corpus count independently and expect \`min(K, eligibleCount)\`. This oracle can use an exact database query without the approximate vector index.

## Verify filter combinations, not only single fields

One test per field will not expose composition mistakes such as tenant OR type instead of tenant AND type. Use pairwise and high-risk combinations:

| Case | Tenant filter | Date filter | Type filter | Defect targeted |
|---|---|---|---|---|
| Tenant alone | alpha | None | None | Missing tenant predicate |
| Tenant and type | alpha | None | contract | Accidental OR composition |
| Tenant and instant | alpha | Boundary time | None | Inclusive/exclusive date bug |
| All filters | alpha | Current instant | contract, policy | Dropped field during query translation |
| Empty type list | alpha | Current | Empty | Match-none versus no-filter ambiguity |
| Unknown tenant | absent | Current | contract | Unsafe fallback to global corpus |

Decide empty-list semantics in the API. An empty array might mean no types are allowed, while an omitted property means any type. Collapsing both to a falsy JavaScript branch can cause an empty restriction to become unfiltered retrieval. Test them separately.

Unknown tenant must return no results or an authorization error. It must never fall back to a shared default namespace. Include tenant ids that differ only by case or Unicode normalization if identifiers can enter through external systems.

## Exercise temporal edges with instants, not vague dates

Date filters fail at boundaries, daylight-saving changes, and serialization points. Store and compare instants as \`timestamptz\` when the business concept is an instant. Send ISO 8601 timestamps with an explicit offset. Avoid relying on the database session timezone.

For each validity record, test one instant before \`valid_from\`, exactly at \`valid_from\`, immediately before \`valid_to\`, and exactly at \`valid_to\`. The half-open rule in this design includes the start and excludes the end. Also test \`valid_to IS NULL\` as open-ended rather than missing-data corruption.

If metadata stores calendar dates rather than instants, define the responsible business timezone before converting. "Valid on July 13" is not a universal instant. Retrieval code should not silently interpret it using whichever timezone the CI runner happens to use.

## Approximate indexes change the evaluation plan

With exact pgvector search, the database can produce the true nearest eligible rows. HNSW and IVFFlat trade recall for speed. Filtering can reduce results because approximate candidates may be scanned before predicates remove them. Recent pgvector supports iterative index scans that continue scanning to find enough filtered results, but settings and version matter.

Maintain an exact oracle query for a fixed evaluation corpus. For each query and filter combination, compare approximate result ids with exact eligible neighbors. Report recall at K and underfill separately:

| Metric | Calculation | Diagnostic meaning |
|---|---|---|
| Filter precision | Eligible returned / total returned | Any value below 1 indicates filter leakage |
| Eligible recall@K | Relevant eligible ids found / expected relevant eligible ids | Measures missed useful context |
| Fill rate | Returned count / min(K, eligible count) | Exposes post-filter or scan exhaustion |
| Rank agreement | Relative order versus exact eligible neighbors | Reveals approximate reordering |
| Cross-tenant count | Forbidden tenant results | Must always be zero |

Security filters are hard constraints, not metrics to average. One cross-tenant result should fail the evaluation regardless of strong aggregate recall. Relevance measures can tolerate a threshold; authorization leakage cannot.

The [RAG retrieval testing best practices](/blog/rag-retrieval-testing-best-practices-2026) covers chunking, query sets, and end-to-end grounding beyond metadata. The [vector database recall testing guide](/blog/vector-database-recall-testing-guide) develops the exact-versus-approximate oracle in more depth.

## Keep authorization outside model discretion

Never ask the LLM to remove forbidden chunks after retrieval. At that point sensitive content has already entered model context and may affect the answer, logs, traces, or caches. Enforce tenant and access-control predicates in the retrieval boundary, ideally backed by database row-level security or an equally strong service authorization layer.

Tests should inspect raw retrieved ids before prompt construction. An answer-level assertion alone can pass if the model happens not to mention leaked text. Add a canary phrase to a forbidden chunk and assert it never appears in the retrieval result, assembled prompt, model trace, or cache key where those artifacts are available.

Metadata returned from the vector store is untrusted application data. Validate its shape. A missing tenant field should not be treated as globally visible. Migration tests should cover old chunks whose metadata predates a required field and quarantine or backfill them deliberately.

## Test caching and pagination with filter identity

A retrieval cache key must include every filter that changes eligibility: tenant, instant or date bucket, document types, access groups, and embedding model or index version as appropriate. If the key contains only query text, tenant alpha can receive beta's cached neighbors even though the underlying database query is correct.

Create two requests with identical text and vectors but different tenants. Execute the restricted request second so it can hit the cache. Assert raw ids remain tenant-correct. Repeat for different effective dates around a policy replacement.

Pagination is uncommon for prompt retrieval but common in admin search. A cursor derived from an unfiltered ranking must not be reused under another filter. Bind cursors to normalized filter identity or reject mismatches. Include this in service-level contract tests.

## Verify normalization before building the query

Filter values often pass through an HTTP schema, application object, vector-store adapter, and SQL builder. Test the normalized object at each boundary. Document types should use a controlled enum or registry, tenant identity should come from authenticated context rather than request body, and timestamps should be parsed once.

Reject contradictory intervals and excessive filter lists before querying. If a user asks for a document type they cannot access, return no results or an authorization response according to product policy, never silently widen the list. Preserve a canonical ordering of multi-value filters so cache keys remain stable for \`['policy', 'contract']\` and the reversed input.

A contract test for the adapter can capture SQL text and parameters, but it should complement the database test, not replace it. String inspection may prove that a tenant predicate appears while missing a type-cast or null edge that changes actual PostgreSQL behavior. The adversarial integration fixture remains the final oracle for enforcement.

## Diagnose failures by layer

When a forbidden chunk appears, inspect the structured request first. If the tenant id is already missing, the defect lies in identity or query translation. If the request is correct but generated SQL omits a predicate, the adapter is at fault. If SQL is correct but an approximate index underfills, tune the scan or indexing strategy. If raw retrieval is safe but the final answer cites an old document, inspect prompt assembly and caching.

Retain compact evidence: query id, normalized filters, returned chunk ids, distances, and metadata eligibility decisions. Do not log chunk bodies from sensitive tenants into shared CI artifacts. Synthetic fixtures let tests expose the mechanism without carrying production content.

When a failure appears only at scale, replay the same structured filters against a reduced corpus containing the returned ids and expected neighbors. If exact search passes there, investigate approximate scan settings and index distribution. If it still fails, the predicate or normalization layer is the more likely source. This reduction avoids tuning vector parameters to compensate for an authorization bug.

## Frequently Asked Questions

### Should metadata filters be applied before or after vector ranking?

Hard authorization filters should be enforced within the retrieval query or underlying access-control layer. Post-filtering a small global top K can leak data internally and underfill results when forbidden neighbors rank highly.

### How do I test an empty documentTypes array?

Define it explicitly. A strong default is that an empty provided list matches no documents, while an omitted field applies no type restriction. Test both because a simple falsy check can accidentally merge them.

### Can relevance@K prove tenant isolation?

No. Relevance metrics can look excellent while one forbidden chunk is present. Assert tenant eligibility for every returned id and fail on any cross-tenant result.

### What is the best oracle for an approximate filtered index?

Run an exact nearest-neighbor query over the same eligible corpus and filters, then compare ids, fill rate, and rank. Keep the fixture corpus stable enough that expected results are reviewable.

### How should null validity metadata behave?

Decide per field. An absent \`valid_to\` can intentionally mean open-ended, but a missing required \`valid_from\` should normally make the chunk ineligible until repaired. Never silently interpret malformed temporal metadata as current.
`,
};
