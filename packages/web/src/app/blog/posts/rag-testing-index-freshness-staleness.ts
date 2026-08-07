import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG Testing for Index Freshness and Staleness: A Release-Ready Method',
  description: 'Use rag testing index freshness staleness checks to measure ingestion lag, catch obsolete answers, and enforce evidence-age release gates in CI.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# RAG Testing for Index Freshness and Staleness: A Release-Ready Method

RAG testing for index freshness and staleness should prove that a source change becomes retrievable within a defined time, that superseded content stops influencing answers, and that every response exposes enough provenance to measure its age. The practical test is not "did indexing finish?" It is "can a user retrieve the newest authoritative fact, and can the system avoid an older conflicting fact, before the freshness objective expires?"

Treat freshness as an end-to-end service objective spanning source publication, connector discovery, parsing, chunking, embedding, index visibility, retrieval, and answer generation. Record timestamps and immutable revision identifiers at every boundary. Then run controlled document mutations with unique facts, poll retrieval separately from generation, and fail the release when observed lag or stale-answer rate exceeds the agreed budget.

This guide builds that workflow for QA and test-automation engineers. The examples use TypeScript-shaped harnesses and vendor-neutral interfaces so the same design works with scheduled crawlers, event-driven pipelines, vector databases, hybrid search, and AI coding agents that help maintain evaluation fixtures.

## Define freshness as an observable contract

"Fresh" is meaningless until the team agrees on the clocks, eligible sources, and user impact. A five-minute indexing delay may be harmless for a product manual and unacceptable for an incident runbook. Start with a contract that names the source event, the endpoint of measurement, and a percentile or maximum allowed delay.

Use four related measures rather than one vague freshness score:

| Measure | Numerator and denominator | What it reveals | Typical owner |
|---|---|---|---|
| Discovery lag | Connector-seen time minus source-published time | Polling, webhook, or permission delay | Connector team |
| Index visibility lag | First successful retrieval minus source-published time | Full ingestion-path delay | Retrieval platform |
| Answer freshness lag | First correct cited answer minus source-published time | User-visible delay | RAG application |
| Stale-answer rate | Stale answers divided by evaluated answers | Residual influence of old revisions | QA and product |

Do not substitute the latest crawler completion timestamp for these measures. A crawler can report success while skipping a page because its ACL changed, while parsing an empty body, or while writing embeddings to a shadow collection that production never queries. Freshness must be observed through the same retrieval boundary used by the application.

A useful contract might say: for high-priority operational documents, 95 percent of revisions must be retrievable within ten minutes, no tested revision may take longer than thirty minutes, and zero answers may cite a superseded revision after the replacement becomes visible. The values are product decisions, not universal defaults.

Represent the contract as data so test cases and reports use the same interpretation:

\`\`\`ts
export interface FreshnessObjective {
  sourceClass: 'operational' | 'policy' | 'reference';
  p95VisibilityMs: number;
  maximumVisibilityMs: number;
  staleAnswerRateLimit: number;
  observationWindowMs: number;
}

export const operationalObjective: FreshnessObjective = {
  sourceClass: 'operational',
  p95VisibilityMs: 10 * 60 * 1000,
  maximumVisibilityMs: 30 * 60 * 1000,
  staleAnswerRateLimit: 0,
  observationWindowMs: 35 * 60 * 1000,
};
\`\`\`

The observation window must exceed the maximum allowed visibility time. Otherwise a slow revision is censored as "not yet observed" instead of correctly reported as a breach.

## Instrument the chronology from source to answer

Freshness diagnosis depends on a trustworthy chronology. Capture server-side UTC timestamps where possible, because laptop clocks and distributed workers can drift. Store the source revision, content digest, ingestion run, chunk identifiers, index generation, retrieval time, and answer citations. A query result without revision metadata may prove relevance but cannot prove freshness.

| Timestamp or identity | Created by | Required diagnostic use |
|---|---|---|
| \`sourcePublishedAt\` | Authoritative source | Starts the freshness clock |
| \`connectorObservedAt\` | Connector | Separates discovery delay from processing delay |
| \`ingestionCompletedAt\` | Pipeline | Shows when parsing and embedding finished |
| \`indexGeneration\` | Index writer | Detects reads from an older collection or alias |
| \`retrievedAt\` | Test client | Marks first user-path visibility |
| \`documentRevision\` | Source or ingestion layer | Distinguishes current and superseded content |
| \`contentDigest\` | Test fixture or parser | Detects silent content mismatch |

Create one correlation identifier for the test mutation and carry it in fixture metadata. Do not put a random ID only in the query text and call a matching answer proof of production behavior. The source document itself must contain the marker, and the normal parser, chunker, and indexer must process it.

\`\`\`ts
export interface Provenance {
  documentId: string;
  revision: string;
  contentDigest: string;
  sourcePublishedAt: string;
  connectorObservedAt?: string;
  ingestionCompletedAt?: string;
  indexGeneration?: string;
}

export interface RetrievalHit {
  chunkId: string;
  text: string;
  score: number;
  provenance: Provenance;
}
\`\`\`

For systems that cannot return these fields to the application, add a privileged test or observability endpoint rather than scraping internal database tables. Direct database reads can show that a record exists while the production query service remains pinned to an old replica or alias.

## Build revision fixtures that expose false freshness

A strong fixture contains a stable question and a fact that changes across revisions. The old and new values must be mutually exclusive, easy to recognize, and unlikely to occur elsewhere in the corpus. For example, revision A says the emergency support code is \`ORCHID-17\`; revision B says it is \`MAPLE-42\` and explicitly withdraws the earlier code.

Test at least four mutation types:

| Mutation | Expected retrieval behavior | Failure it catches |
|---|---|---|
| New document | New marker becomes searchable | Missed discovery or indexing |
| In-place update | New value wins, old value disappears | Cached or duplicate old chunks |
| Delete or revoke | Content stops appearing | Tombstone and ACL propagation faults |
| Rename or move | One current copy remains | Duplicate identity and canonicalization faults |

Include a negative query for the retired value. A positive query alone can pass when both revisions coexist. If retrieval returns revision B at rank one and revision A at rank two, generation can still choose the obsolete statement, especially if the older chunk is clearer or appears twice.

Keep mutation facts semantically meaningful. A random token proves exact-match indexing but says little about embedding retrieval. Use a sentence such as "The 2026 escalation window closes at 18:40 UTC" and query it with a paraphrase like "When does this year's escalation period end?" Retain a unique marker in adjacent metadata for unambiguous fixture tracking.

Fixtures should live in an isolated test tenant or dedicated namespace. Editing real support or policy content to run a probe can create customer-visible misinformation. The test path should still use the same connector and index settings as production.

## Measure visibility with bounded polling

Indexing is asynchronous, so a single immediate assertion creates noise. Poll at a controlled interval until the new revision is retrieved or the objective expires. Capture every observation, not merely the final one. The sequence reveals whether an old revision persisted, results oscillated between generations, or the query returned nothing.

\`\`\`ts
type Search = (query: string) => Promise<RetrievalHit[]>;

export async function waitForRevision(
  search: Search,
  query: string,
  expectedRevision: string,
  deadlineMs: number,
  intervalMs = 5000,
) {
  const startedAt = Date.now();
  const observations: Array<{ elapsedMs: number; revisions: string[] }> = [];

  while (Date.now() - startedAt <= deadlineMs) {
    const hits = await search(query);
    const revisions = hits.map((hit) => hit.provenance.revision);
    observations.push({ elapsedMs: Date.now() - startedAt, revisions });

    if (revisions.includes(expectedRevision)) {
      return { visibleAfterMs: Date.now() - startedAt, observations };
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    \`Revision \${expectedRevision} was not visible within \${deadlineMs} ms\`,
  );
}
\`\`\`

Choose a polling interval much smaller than the objective but not so small that probes become load tests. Add randomized scheduling across many fixtures to avoid a synchronized query spike. If the search layer has caches, use the normal production cache behavior and record cache headers or diagnostics. Automatically appending random query text can bypass a cache but also change retrieval semantics, hiding the actual user experience.

Measure from the authoritative publication event, not from when the test starts polling. If a webhook arrives four minutes late and the timer begins after receipt, the report erases the exact lag it should expose.

## Separate retrieval freshness from generated-answer freshness

Once the expected revision appears in search, ask the application a controlled question and inspect both its answer and cited context. This separates two failure classes:

1. Retrieval staleness: the current revision is absent or ranked too low.
2. Generation staleness: current evidence is available, but the answer uses an obsolete value, cached response, or model prior.

Use a structured oracle for facts rather than brittle whole-answer equality. Extract the expected and forbidden values, verify the cited revision, and preserve the answer for review.

\`\`\`ts
interface AnswerResult {
  text: string;
  citedRevisions: string[];
  retrievedHits: RetrievalHit[];
}

export function assertFreshAnswer(
  result: AnswerResult,
  expectedValue: string,
  retiredValue: string,
  expectedRevision: string,
) {
  if (!result.text.includes(expectedValue)) {
    throw new Error('Answer omitted the current value');
  }
  if (result.text.includes(retiredValue)) {
    throw new Error('Answer repeated a retired value');
  }
  if (!result.citedRevisions.includes(expectedRevision)) {
    throw new Error('Answer did not cite the current revision');
  }
}
\`\`\`

Run the question several ways because query wording affects retrieval. Include the canonical wording, one domain synonym, and one conversational follow-up. Do not multiply paraphrases until they dominate the freshness sample. Retrieval-quality evaluation and freshness evaluation answer different questions, even though their failures can interact.

Teams building a wider evaluation program can place this freshness suite beside the lifecycle coverage in the [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026). If ingestion or retrieval is exposed through tools, the schema and transport checks in [MCP servers for test automation](/blog/mcp-servers-test-automation-2026) help isolate tool-call defects from index delay.

## Test deletions, revocations, and superseded chunks

Freshness is not only the arrival of new data. A source deleted for legal, privacy, security, or policy reasons must stop being retrievable. That path often uses tombstones, asynchronous cleanup, or access-control propagation that differs from ordinary updates.

For a deletion test, establish that the fixture is retrievable, remove or revoke it through the authoritative source, then poll for absence. Query by exact unique phrase and by semantic paraphrase. Verify that no child chunks, cached answer, keyword index entry, or replica still exposes the content.

\`\`\`ts
export function findRetiredEvidence(
  hits: RetrievalHit[],
  retiredRevision: string,
  forbiddenMarker: string,
) {
  return hits.filter((hit) =>
    hit.provenance.revision === retiredRevision ||
    hit.text.includes(forbiddenMarker),
  );
}

export function assertRetiredEvidenceAbsent(
  hits: RetrievalHit[],
  retiredRevision: string,
  forbiddenMarker: string,
) {
  const stale = findRetiredEvidence(hits, retiredRevision, forbiddenMarker);
  if (stale.length > 0) {
    throw new Error(\`Found \${stale.length} retired chunks\`);
  }
}
\`\`\`

An update can change chunk boundaries, leaving orphaned chunks whose IDs no longer map cleanly to a document. Therefore check document revision and content, not only an expected chunk ID. For ACL changes, test with both the revoked principal and a still-authorized control principal. If both lose access, the connector may have deleted the item rather than applying the intended permissions.

## Calculate distributions without hiding breached documents

One successful canary does not establish an ingestion service objective. Run probes across connector types, document sizes, source priorities, languages, and update operations. Report p50, p95, maximum, timeout count, and stale-answer rate. Always keep the raw document-level result so a percentile cannot hide a severe single-document breach.

\`\`\`ts
interface FreshnessSample {
  fixtureId: string;
  sourceClass: string;
  operation: 'create' | 'update' | 'delete' | 'revoke';
  visibilityMs?: number;
  timedOut: boolean;
  staleAnswer: boolean;
}

export function percentile(values: number[], fraction: number): number {
  if (values.length === 0) throw new Error('No measured values');
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.ceil(fraction * ordered.length) - 1;
  return ordered[Math.max(0, index)];
}

export function summarize(samples: FreshnessSample[]) {
  const measured = samples
    .filter((sample) => sample.visibilityMs !== undefined)
    .map((sample) => sample.visibilityMs as number);

  return {
    p50Ms: percentile(measured, 0.5),
    p95Ms: percentile(measured, 0.95),
    maximumMs: Math.max(...measured),
    timeoutCount: samples.filter((sample) => sample.timedOut).length,
    staleAnswerRate:
      samples.filter((sample) => sample.staleAnswer).length / samples.length,
  };
}
\`\`\`

Treat timeouts as breaches, not missing data. Excluding them from percentile calculation makes the slowest failures disappear. In the release decision, fail on any timeout that crossed the maximum, even if the percentile among completed samples looks healthy.

Avoid calculating a p95 from a tiny batch and treating it as stable. With twenty observations, one or two samples can move the result sharply. Use percentiles for accumulated monitoring and explicit per-sample maximums for small pre-release suites.

## Diagnose the classic "new document found, old answer returned" failure

Consider a run where revision B appears at rank one after six minutes, but the assistant still answers with revision A for another hour. Start at the generation boundary rather than rerunning ingestion blindly.

Inspect, in order:

| Check | Evidence | Interpretation |
|---|---|---|
| Retrieval response | B ranked above A | Search alias is at least partly current |
| Prompt trace | Which chunks reached the model | Context construction may reuse an old result |
| Response-cache key | Query, tenant, corpus generation | Cache may ignore document generation |
| Citation revision | A, B, or absent | Reveals evidence actually attributed |
| Replica or region | Index generation per request | Traffic may alternate between generations |

If direct retrieval is fresh but prompt context is stale, inspect application caches and orchestration state. If the prompt contains B and A together, fix lifecycle cleanup or add revision-aware deduplication. If the prompt contains only B but the answer repeats A, strengthen instructions and evaluate whether the model is following the supplied source. If results oscillate by request, compare region and replica metadata.

This is also where people get freshness testing wrong: they query for a unique token, see it once, and declare the index current. That proves one positive lookup at one instant. It does not prove old evidence is gone, aliases are consistent, answer caches are invalidated, or normal semantic queries prefer the new revision.

## Turn the suite into a safe CI and scheduled gate

Run a small deterministic mutation suite before changes to connectors, parsing, chunking, index writers, retrieval aliases, and answer caching. Run broader probes on a schedule because production source rate limits, queues, and replicas cannot be fully represented in an isolated build.

A vendor-neutral CI flow can publish a fixture, execute the polling harness, retain observations, and always clean up:

\`\`\`yaml
name: rag-freshness

on:
  workflow_dispatch:
  schedule:
    - cron: '23 * * * *'

jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:rag-freshness
        env:
          RAG_TEST_BASE_URL: \${{ secrets.RAG_TEST_BASE_URL }}
          RAG_TEST_TOKEN: \${{ secrets.RAG_TEST_TOKEN }}
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: freshness-observations
          path: artifacts/rag-freshness/
\`\`\`

The example schedule is illustrative. Select a cadence compatible with source quotas and fixture cleanup. The test command should remove documents in a \`finally\` block and tag every artifact with a run ID. A failed cleanup must alert separately, because abandoned revisions pollute later stale-content checks.

Store a compact evidence bundle: source event timestamps, fixture revision and digest, each polling observation, top retrieval hits with revisions, prompt-context identifiers, answer text, citations, region, and index generation. Redact sensitive chunk text if the environment uses production-like data.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when a team wants an agent to reproduce the same diagnostic routine. Keep the objective, environment secrets, and release decision in repository-owned configuration so the automation remains reviewable.

## Use failures to improve ownership, not merely rerun tests

Freshness failures are often intermittent because queue load, rate limiting, and replica rollout vary over time. An automatic rerun can collect evidence, but it must not erase the original breach. Classify the first failure by its last confirmed boundary and assign it to the component that owns that boundary.

| Last confirmed fact | Likely investigation area | Useful next artifact |
|---|---|---|
| Source revision exists, connector has not seen it | Polling, webhook, source permissions | Connector event log |
| Connector saw it, ingestion incomplete | Parser, embedding, queue, rate limit | Stage timings and error record |
| Ingestion complete, revision not retrieved | Index write, alias, replica | Collection generation and query trace |
| Retrieval current, prompt stale | Orchestrator or response cache | Cache key and prompt trace |
| Prompt current, answer stale | Generation grounding | Answer, citations, exact context |
| Revoked content still visible | Tombstone, ACL, cache | Principal, replica, retired chunk IDs |

Graph lag by source class and operation rather than one global average. A connector handling small text pages can mask a backlog for large PDFs. Updates may be fast while deletions wait on a separate cleanup queue. Regional graphs can expose an alias rollout that never completed in one location.

Do not set the release gate from the fastest environment if production has more documents, stricter permissions, or slower source APIs. Use a staging corpus with representative topology, then supplement it with non-destructive production canaries. The objective should represent user risk, while the test design accounts for environment differences explicitly.

## Frequently Asked Questions

### How is index freshness different from retrieval relevance?

Index freshness asks whether the latest eligible source revision is available to the user path within an allowed delay and whether retired revisions have stopped influencing results. Retrieval relevance asks whether the search system ranks useful evidence for a query. A fresh index can rank the wrong document, and a stale index can rank an obsolete document very confidently. Test them separately by first checking revision visibility with controlled fixtures, then evaluating rank and answer quality. Preserve revision metadata in both suites so an apparently relevant result cannot hide that its underlying evidence is old.

### Should a freshness test wait for an ingestion-complete event?

An ingestion event is useful diagnostic evidence, but it should not be the final assertion. The event may occur before replicas update, before an alias switches, or before an application cache expires. Start timing from the authoritative publication timestamp, record the ingestion event if available, and continue polling the same retrieval interface used by the application. That design measures the user-visible contract while still showing which pipeline segment consumed the time. If event delivery itself is unreliable, the polling observations remain a valid independent record.

### How can a team test staleness without changing production documents?

Use an isolated tenant, namespace, or source folder that flows through production-equivalent connectors and index settings. Publish synthetic documents containing plausible but harmless facts, then update and delete them through the authoritative source API or UI. Ensure ordinary users cannot discover the fixtures, apply short retention, and clean them up after every run. A small production canary can validate real infrastructure, while a larger staging corpus covers destructive cases. Avoid injecting rows directly into the vector store because that bypasses the very pipeline the freshness test must measure.

### What should happen when only one region returns stale evidence?

Treat it as a real breach, capture the affected region and index generation, and prevent a retry in a healthy region from replacing the result. Compare alias targets, replica health, cache entries, and deployment timing across regions. If routing is nondeterministic, run repeated pinned and unpinned queries to estimate exposure. The release rule should follow the product's availability promise: a region serving users cannot be ignored merely because a global percentile passes. Keep the failing retrieval hits and citations so operators can distinguish an old replica from a region-local answer cache.
`,
};
