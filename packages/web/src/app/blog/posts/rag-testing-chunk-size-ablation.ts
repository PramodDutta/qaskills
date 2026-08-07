import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG Testing Chunk Size Ablation: A Reproducible Workflow',
  description: 'Run RAG testing chunk size ablation with controlled corpora, retrieval metrics, paired answer checks, and diagnostics that reveal the best indexing tradeoff.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# RAG Testing Chunk Size Ablation: A Reproducible Workflow

RAG testing chunk size ablation is a controlled experiment in which the same documents, queries, embedding model, retrieval settings, generator, and graders are evaluated across indexes built with different chunk sizes. The result should identify a defensible operating region, not crown one universal number. Small chunks can improve retrieval precision but lose surrounding meaning; large chunks preserve context but consume the retrieval budget and can bury the decisive sentence.

To make the conclusion trustworthy, freeze every factor except chunk construction, express size in the tokenizer or unit the production splitter actually uses, rebuild each index from identical source revisions, and compare query-level outcomes. Measure retrieval first, then grounded answer behavior, latency, and cost. Slice results by question type because a setting that excels at pinpoint facts may fail procedures, tables, or cross-section reasoning.

## Write the ablation hypothesis in operational terms

“Find the best chunk size” is not a testable requirement until best has a metric and constraints. A support assistant may prioritize supported answers and p95 latency. A compliance search tool may require near-perfect recall for high-risk policy clauses. A coding agent may need complete function bodies and surrounding imports.

A useful hypothesis looks like this:

> For the current product-document corpus, reducing target chunk size from 800 tokens to 400 tokens will improve evidence recall for single-fact questions without lowering procedure completeness by more than an agreed margin or exceeding the retrieval latency budget.

The numbers are experimental candidates, not recommendations. Choose candidates around the current setting after inspecting document structure and token-length distribution.

| Decision element | Example definition | Why it prevents ambiguity |
|---|---|---|
| Primary metric | Evidence recall at fixed retrieved-token budget | Stops larger chunks receiving more context unfairly |
| Guardrail | No new unsupported high-risk answers | Prevents aggregate gain hiding safety regression |
| Latency constraint | p95 retrieval time within service objective | Keeps offline quality connected to production |
| Unit | Tokens from the production tokenizer | Makes “400” reproducible |
| Population | Versioned product docs and adjudicated query set | Defines where the conclusion applies |
| Pairing | Same query executed against every index variant | Reduces noise and enables case-level diagnosis |

State what the experiment will not answer. A chunk-size ablation does not independently choose an embedding model, reranker, top-k, overlap, query rewrite strategy, or generation prompt. Those may interact with size, but changing them simultaneously prevents attribution.

## Freeze the experiment envelope before building indexes

Record an experiment manifest. It should resolve source documents by content hash, splitter implementation by code revision, tokenizer identity, embedding configuration, vector-store configuration, query dataset revision, retrieval budget, generator prompt, and evaluator versions.

\`\`\`yaml
experimentId: chunk-ablation-2026-08-07
corpus:
  id: product-docs
  revision: docs-2026-08-05
  manifestSha256: recorded-corpus-digest
splitter:
  implementationRevision: splitter-17
  boundaryPolicy: heading-aware
  overlapTokens: 64
variants:
  - targetTokens: 200
  - targetTokens: 400
  - targetTokens: 800
retrieval:
  retrievedTokenBudget: 2400
  filtersRevision: tenant-and-product-4
queries:
  datasetRelease: rag-questions-2026-08-06.2
generation:
  promptRevision: grounded-answer-12
evaluation:
  relevanceRevision: 3
  supportRevision: 5
\`\`\`

This manifest intentionally names concepts rather than pretending that every vector store shares the same keys. Persist resolved model identifiers and library configuration using the documented interface of your stack.

Control stochastic components where supported, but do not mistake a seed for universal determinism. Hosted models, parallel hardware, approximate nearest-neighbor search, and index insertion order can introduce variation. Repeat the full query set or a representative subset and retain each attempt when variability is material.

| Keep fixed | Why | Verification evidence |
|---|---|---|
| Source bytes | Text edits change both chunks and answers | Corpus manifest digest |
| Parser output | PDF or HTML extraction shifts boundaries | Stored normalized documents |
| Embedding model | Representation change overwhelms chunk effect | Resolved model configuration |
| Retrieval filters | Missing tenant or product filters alter candidates | Filter test and run manifest |
| Retrieved token budget | Equal top-k favors different total context | Per-query token accounting |
| Generator input template | Prompt changes answer quality | Prompt revision and rendered input |
| Graders | Moving thresholds rewrite outcomes | Evaluator revisions |

One subtle confounder is caching. An embedding cache keyed only by document ID can reuse vectors from the previous chunking variant. Cache keys must include normalized chunk text and relevant embedding configuration. Validate index counts and sample vectors after each build.

## Define chunk identity so results can be traced back to source

Every retrieved chunk needs enough metadata to reconstruct it: document revision, logical section path, start and end offsets in normalized text, tokenizer count, splitter revision, overlap ancestry, and a content digest. Without traceability, a failed query yields only an opaque vector-store ID.

\`\`\`ts
import { createHash } from 'node:crypto';

export type ChunkRecord = {
  chunkId: string;
  documentId: string;
  documentRevision: string;
  sectionPath: string[];
  startOffset: number;
  endOffset: number;
  tokenCount: number;
  targetTokens: number;
  overlapTokens: number;
  text: string;
  textSha256: string;
};

export function buildChunkId(input: Omit<ChunkRecord, 'chunkId' | 'textSha256'>) {
  const identity = [
    input.documentId,
    input.documentRevision,
    input.startOffset,
    input.endOffset,
    input.targetTokens,
    input.overlapTokens,
  ].join(':');
  return createHash('sha256').update(identity, 'utf8').digest('hex').slice(0, 24);
}
\`\`\`

Offsets need a declared coordinate system. Byte offsets, Unicode code-point offsets, JavaScript string indices, and tokenizer positions are not interchangeable. Pick one for reconstruction and test it with non-ASCII text. Store tokenizer counts separately.

Overlap creates duplicated text. Record it so evidence scoring does not treat the same sentence in adjacent chunks as two independent relevant results. When measuring unique evidence coverage, collapse retrieved spans that map to the same source region.

## Choose candidate sizes from the corpus, not folklore

Inspect distributions before selecting variants. Measure tokens per document, heading section, paragraph, table, code block, and list. A target of 400 tokens behaves differently when most sections are 60 tokens than when most are 2,000.

\`\`\`python
from dataclasses import dataclass
from statistics import median, quantiles

@dataclass
class Block:
    kind: str
    token_count: int

def summarize(blocks: list[Block]) -> dict[str, dict[str, float]]:
    grouped: dict[str, list[int]] = {}
    for block in blocks:
        grouped.setdefault(block.kind, []).append(block.token_count)

    result: dict[str, dict[str, float]] = {}
    for kind, counts in grouped.items():
        ordered = sorted(counts)
        q = quantiles(ordered, n=100) if len(ordered) > 1 else [ordered[0]] * 99
        result[kind] = {
            "count": len(ordered),
            "median": median(ordered),
            "p90": q[89],
            "max": max(ordered),
        }
    return result
\`\`\`

Use the actual tokenizer wrapper in the production pipeline to populate \`token_count\`. The example analyzes counts already calculated and avoids claiming a universal tokenizer API.

Select at least three meaningfully separated candidates around the present value. Too many close variants spend evaluation budget without revealing a response curve. If the first pass shows a promising region, run a narrower second pass. Keep overlap fixed initially. A later factorial experiment can test size and overlap interaction.

## Build structure-aware variants without changing parser semantics

Chunk size is not simply “take N tokens.” A production splitter may prefer heading, paragraph, sentence, or code boundaries; attach headings to children; keep tables intact; and use overlap when a boundary must split continuous prose. The ablation must run the same policy at different targets.

A minimal splitter interface makes the controlled variable visible:

\`\`\`ts
type SplitOptions = {
  targetTokens: number;
  overlapTokens: number;
};

type NormalizedDocument = {
  id: string;
  revision: string;
  blocks: Array<{
    kind: 'heading' | 'paragraph' | 'list' | 'table' | 'code';
    text: string;
    startOffset: number;
    endOffset: number;
  }>;
};

export interface Chunker {
  split(document: NormalizedDocument, options: SplitOptions): ChunkRecord[];
}

export function buildVariant(
  documents: NormalizedDocument[],
  chunker: Chunker,
  options: SplitOptions,
): ChunkRecord[] {
  return documents.flatMap((document) => chunker.split(document, options));
}
\`\`\`

Test invariants rather than one giant snapshot. Chunks must reconstruct source coverage according to the overlap policy, stay within a documented hard maximum, retain source metadata, avoid empty text, and behave deterministically for identical input.

\`\`\`ts
import { expect, it } from 'vitest';

it('preserves ordered source coverage for every target size', () => {
  for (const targetTokens of [200, 400, 800]) {
    const chunks = chunker.split(document, { targetTokens, overlapTokens: 64 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((chunk) => chunk.text.trim().length > 0)).toBe(true);
    expect(chunks[0].startOffset).toBe(0);
    expect(chunks.at(-1)?.endOffset).toBe(documentText.length);

    for (let index = 1; index < chunks.length; index += 1) {
      expect(chunks[index].startOffset).toBeLessThanOrEqual(
        chunks[index - 1].endOffset,
      );
      expect(chunks[index].endOffset).toBeGreaterThan(chunks[index].startOffset);
    }
  }
});
\`\`\`

Real policies may intentionally omit boilerplate or normalize text, so adjust reconstruction assertions to the declared parser output. Never change HTML cleaning or PDF extraction between size variants, because then the experiment tests two variables.

## Label evidence spans, not only relevant documents

Document-level relevance is too coarse for chunk experiments. If a 40-page manual contains the answer, every chunk from that document is not relevant. Annotate evidence spans or section-level evidence for each query. Then derive which chunks cover those spans for each variant.

For a question like “What happens to queued jobs when a workspace is deleted?”, gold evidence might span a warning paragraph and the next bullet list. A small chunk may retrieve the warning but omit the list. A large chunk may contain both but rank below a superficially similar deletion section.

| Retrieval metric | Question answered | Chunk-specific caution |
|---|---|---|
| Evidence recall | Did retrieved context cover required source spans? | Merge overlapping source coverage |
| Evidence precision | How much retrieved context was relevant? | Long chunks contain mixed relevant and irrelevant text |
| Rank of first evidence | How quickly did useful support appear? | One partial span may not answer multi-part queries |
| Complete-evidence rate | Were all required spans within budget? | Essential for procedures and comparisons |
| Redundancy ratio | How much context repeated the same source text? | Overlap can waste the generator budget |
| Context utilization | Did the answer use retrieved evidence appropriately? | Requires answer-level analysis |

For tables, annotate cells and required headers together. Retrieving a cell value without its row or column meaning can create a confident wrong answer. For code, relevant spans may include a definition plus imported type or call site.

## Hold the retrieval budget constant across variants

Comparing top five chunks is usually unfair. Five 800-token chunks can provide roughly four times the context of five 200-token chunks, before overlap and metadata. If production has a context budget, retrieve up to a fixed token allowance.

\`\`\`python
from dataclasses import dataclass

@dataclass
class Hit:
    chunk_id: str
    score: float
    token_count: int
    text: str

def take_within_budget(hits: list[Hit], budget: int) -> list[Hit]:
    selected: list[Hit] = []
    used = 0
    for hit in hits:
        if hit.token_count > budget and not selected:
            selected.append(hit)
            break
        if used + hit.token_count > budget:
            continue
        selected.append(hit)
        used += hit.token_count
    return selected
\`\`\`

This policy is only an example. A production system may truncate, compress, or reserve tokens for citations and the answer. Match production behavior and record actual rendered-context tokens after formatting. The important principle is that every size variant receives the same total opportunity.

Also report fixed-k retrieval as a diagnostic because it reveals ranking behavior independent of the packer. Do not use it as the only quality comparison.

## Run retrieval and generation as separate stages

First evaluate chunking plus retrieval without the generator. This stage is cheaper and directly explains whether the right evidence was available. Then run answer generation on saved retrieval results. Saving the ranked hits makes the generation comparison repeatable and avoids index drift midway through a long experiment.

\`\`\`json
{
  "experimentId": "chunk-ablation-2026-08-07",
  "variant": { "targetTokens": 400, "overlapTokens": 64 },
  "queryId": "rag_q_1042",
  "attempt": 1,
  "rankedHits": [
    {
      "rank": 1,
      "chunkId": "9a7c12f3e8d99111d4146c77",
      "score": 0.812,
      "tokenCount": 376,
      "documentId": "admin-handbook",
      "sourceStart": 18840,
      "sourceEnd": 20711
    }
  ],
  "selectedChunkIds": ["9a7c12f3e8d99111d4146c77"],
  "retrievalMs": 18
}
\`\`\`

Scores from different indexes are not necessarily calibrated, even with the same embedding model. Compare ranking and evidence outcomes, not raw similarity score distributions alone.

At answer stage, grade claim support, required-fact coverage, citation correctness, refusal when evidence is absent, and task-specific format. Tools such as Ragas and DeepEval provide evaluation concepts and integrations, but metric names and APIs evolve. Pin the library configuration in your project and consult its official documentation rather than copying an unverified call signature.

The [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) becomes relevant if the system rewrites queries, chooses among retrievers, or performs iterative retrieval. For the first chunk ablation, freeze those decisions or replay a stored query plan so chunk size remains the principal difference.

## Use paired comparisons and slices, not one leaderboard number

Every query should have results for every variant. Build a row containing retrieval metrics, answer metrics, latency, rendered context tokens, and error status. Then compare variants within each query.

\`\`\`python
from collections import defaultdict

def win_table(rows: list[dict], metric: str) -> dict[tuple[int, int], dict[str, int]]:
    by_query: dict[str, dict[int, float]] = defaultdict(dict)
    for row in rows:
        by_query[row["query_id"]][row["target_tokens"]] = row[metric]

    sizes = sorted({row["target_tokens"] for row in rows})
    output: dict[tuple[int, int], dict[str, int]] = {}
    for left, right in zip(sizes, sizes[1:]):
        counts = {"left": 0, "right": 0, "tie": 0, "missing": 0}
        for scores in by_query.values():
            if left not in scores or right not in scores:
                counts["missing"] += 1
            elif scores[left] > scores[right]:
                counts["left"] += 1
            elif scores[right] > scores[left]:
                counts["right"] += 1
            else:
                counts["tie"] += 1
        output[(left, right)] = counts
    return output
\`\`\`

The win table shows how widely a gain is distributed. It is descriptive, so add uncertainty analysis appropriate to paired binary or continuous metrics and repeated attempts. Retain missing and infrastructure-error counts rather than quietly dropping them.

Slice by evidence shape and user need:

| Slice | Likely chunk-size sensitivity | Diagnostic to inspect |
|---|---|---|
| Pinpoint fact | Smaller chunks may rank precisely | First-evidence rank and irrelevant tokens |
| Multi-step procedure | Larger or structured chunks may preserve sequence | Complete-evidence rate |
| Cross-section comparison | No single size solves multi-hop retrieval alone | Coverage of every required span |
| Table lookup | Boundary policy may matter more than target | Header and cell co-retrieval |
| Code explanation | Function and dependency boundaries matter | Complete symbol context |
| No-answer query | Large chunks may increase distracting lexical matches | Abstention accuracy |
| Multilingual query | Token lengths and embedding behavior differ | Per-language recall and budget |

Averages can conceal a 10-point improvement on fact lookup and a 15-point regression on procedures. The release decision should reflect traffic and risk, or route different document types through different chunk policies if operational complexity is justified.

## Diagnose when the smallest chunks appear to win

Imagine 200-token chunks produce the highest evidence precision and answer score. Before adopting them, inspect token budget utilization. Smaller chunks may allow more independent results and therefore more total unique sections. The real cause could be diversification rather than fine granularity.

Check overlap redundancy. If adjacent chunks dominate the ranking, the retriever may return four variations of one paragraph and miss a second required source. Add a diagnostic that unions source spans and calculates unique covered tokens.

Look for heading loss. Small children sometimes contain pronouns, “this setting,” or unlabeled numeric values with no parent title. The answer may be correct on common cases but fail when sections use similar vocabulary. Compare retrieval with and without inherited heading text in a separate experiment, not midway through the size ablation.

A realistic pipeline failure is accidental mixed indexing. If vector-store collection names are reused, an 800-token query may retrieve 200-token chunks left from an earlier build. Assert every hit's variant metadata, count indexed records, and create immutable collection identities from the corpus and chunk-policy digest.

\`\`\`ts
import { expect } from 'vitest';

export function assertVariantIntegrity(
  hits: Array<{ chunkId: string; targetTokens: number; corpusDigest: string }>,
  expected: { targetTokens: number; corpusDigest: string },
) {
  for (const hit of hits) {
    expect(hit.targetTokens).toBe(expected.targetTokens);
    expect(hit.corpusDigest).toBe(expected.corpusDigest);
  }
}
\`\`\`

If results change between identical retrieval runs, examine index construction order, approximate-search settings, concurrent updates, and ties. Store ranked hit IDs for diffing. Do not attribute unstable retrieval to the generator.

## What engineers get wrong about chunk-size tests

The common mistake is changing chunk size and top-k together. That may optimize a system configuration, but it is not an ablation because attribution is lost. First isolate size under a fixed token budget. Later test interactions deliberately.

Another mistake is judging chunks by whether they “look readable.” Human inspection is necessary, but retrieval depends on query distribution, embeddings, filters, and budget. Beautiful chunks can rank poorly; awkward boundary cases can dominate production failures.

Teams sometimes use only answer correctness. A capable generator can answer from prior knowledge even when retrieval fails, creating a false pass. Include evidence support and no-context controls. For selected queries, replace retrieved context with irrelevant text and verify the system does not confidently reproduce the gold from memory when policy requires source grounding.

Synthetic queries can cover planned scenarios, but they often echo document wording and make retrieval artificially easy. Include real user phrasing, misspellings, acronyms, indirect questions, and negative cases, with appropriate privacy review.

Finally, a single global chunk target may be the wrong endpoint. Tables, API references, prose, and code have different structural units. The ablation can justify a structure-aware policy, but each extra route adds index and maintenance complexity that must be tested.

## Turn the selected region into regression coverage

Choose a setting only after reviewing quality, safety gates, latency, index size, embedding volume, and operational complexity. Prefer a stable plateau over a narrow peak that may reverse with a small corpus change.

| Release artifact | Contents | Regression purpose |
|---|---|---|
| Experiment manifest | Frozen corpus, variants, retriever, generator, graders | Reproduce the decision |
| Per-query result file | Hits, contexts, answers, scores, errors | Diagnose later movement |
| Boundary-case fixture set | Tables, long procedures, code, multilingual text | Protect splitter behavior |
| Chosen-policy record | Target region, overlap, structural rules, rationale | Prevent folklore replacement |
| Index integrity check | Corpus and policy digests on every hit | Detect mixed or stale collections |
| Monitoring slices | Retrieval misses, unsupported answers, latency | Detect production drift |

Promote the most discriminating queries into a smaller pull-request suite. Run the full ablation when the corpus parser, chunker, embedding model, retrieval packing, or major document distribution changes. A corpus update can alter the optimal region, so do not treat one experiment as permanent truth.

For an MCP-enabled agent that calls retrieval as a tool, version the tool schema, mock responses, and error behavior. The [MCP servers test automation guide](/blog/mcp-servers-test-automation-2026) can frame protocol testing, while the ablation still needs real retrieval evaluation outside the mocked agent test.

The final recommendation should read like an engineering decision: “Use the 400-token target with 64-token overlap and heading-aware boundaries for this corpus revision because it preserved procedure coverage, improved fact-query evidence precision, stayed within latency limits, and occupied a stable region.” It should also list the slices where another policy may be needed.

## Frequently Asked Questions

### Is there a universally optimal chunk size for RAG?

No. The useful size depends on document structure, tokenizer, embedding behavior, query types, retrieval packing, generator context handling, and the evidence needed for an answer. Even within one corpus, tables may need different boundaries from prose or code. Run candidates against a versioned representative query set under a fixed retrieval budget. Select a stable region that meets quality and latency constraints, then preserve the experiment artifacts. Re-run when the parser, corpus distribution, embedding model, or retrieval strategy changes materially.

### Should chunk overlap change during a size ablation?

Keep overlap fixed in the first experiment so target size is the main variable. Because a fixed overlap is a larger fraction of a small chunk, report redundancy and unique source coverage. After locating a promising size region, run a second experiment that varies overlap, or use a planned factorial design if you have enough cases and budget to estimate interaction. Changing both casually makes it impossible to know whether a gain came from granularity or repeated boundary context. Structural boundaries may reduce the need for mechanical overlap.

### How do I evaluate chunking when questions need multiple documents?

Annotate every required evidence span and its source, then measure whether the selected context covers the complete evidence set within budget. Document-level recall is insufficient because retrieving one of three required documents cannot support a comparison. Report coverage by hop, rank, unique tokens, and final claim support. Inspect whether overlap or repeated high-scoring chunks crowds out another source. If an agent performs iterative retrieval, freeze or replay its query plan for the size ablation, then separately test whether planning adapts well to the selected index.

### When should a chunk-size ablation be repeated?

Repeat it after changes that can move chunk boundaries, representations, retrieval capacity, or query distribution. Examples include a new parser, tokenizer, embedding model, reranker, context-packing policy, major corpus migration, or a rise in new document types and languages. It is also worth rerunning when production diagnostics show evidence misses or unsupported answers concentrated in a slice. Small content edits do not always require a full experiment, but continuous regression queries and index-integrity checks should still run for every index release.
`,
};
