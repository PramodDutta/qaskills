import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing RAG Chunk-Overlap Regressions',
  description:
    'Test RAG chunk-overlap regressions by freezing documents, measuring boundary retrieval, tracking duplication, and comparing answer evidence before rollout.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing RAG Chunk-Overlap Regressions

The answer to “What happens after the appeal window closes?” disappears after overlap drops from 120 tokens to 40. The relevant sentence still exists in the corpus, embeddings are healthy, and the generator has not changed. What moved is the sentence's neighborhood: the condition landed at the end of one chunk and its consequence at the start of the next.

Chunk overlap is a retrieval transformation with competing effects. More overlap can preserve boundary context, but it also creates near-duplicate vectors, consumes index space, crowds top-k results, and repeats evidence in the prompt. A regression test must measure both recovery and redundancy on a frozen corpus. Comparing answer prose alone cannot tell whether the retriever improved or the language model improvised.

## Construct questions that expose chunk boundaries

Random factual questions rarely reveal overlap behavior. Build a labeled set around document transitions: prerequisite followed by action, definition followed by exception, table header followed by a row, section title followed by its first rule, and a pronoun whose antecedent sits in the preceding sentence.

For each query, store evidence spans as document ID plus character offsets in the canonical unchunked text. Do not label only chunk IDs, because changing the splitter invalidates those IDs. Span labels can be remapped to every candidate chunking.

| Boundary pattern | Example query intent | Why overlap can matter |
|---|---|---|
| Condition then consequence | Action after appeal deadline | Each half alone is ambiguous |
| Heading then paragraph | Meaning of a named policy section | Heading supplies subject omitted below |
| List introduction then item | Constraints on the third option | Item inherits qualifier from introduction |
| Table header then row | Value and unit for a product | Row cells need column semantics |
| Cross-reference sentence | What “this exception” permits | Antecedent lies just before split |
| Code explanation then snippet | Why a flag is set | Retrieval needs prose and code together |

Include control queries whose evidence lies comfortably inside a chunk. If those regress, the cause may be changed chunk count, embedding batch behavior, metadata, or ranking, not boundary preservation specifically.

## Freeze every variable except overlap

An overlap experiment is interpretable only when document bytes, normalization, splitter algorithm, target chunk size, embedding model, embedding parameters, vector index settings, query text, filters, top k, and reranker remain fixed. Rebuild separate indexes for each overlap candidate rather than mutating one collection in place.

Record the chunker's unit. “100 overlap” can mean characters, tokenizer tokens, words, or splitter-specific units. Recursive splitters may honor semantic separators and produce variable lengths. Persist actual start and end offsets with every chunk so the realized overlap can be inspected.

Use stable chunk identifiers derived from corpus version, document ID, offsets, and transformation version. Hashing only chunk text merges repeated clauses and makes provenance ambiguous. Changing overlap necessarily changes many IDs; that is expected and should appear as a new index version.

The baseline must be reproducible. Save dependency versions and model identifiers. If the embedding service silently upgrades behind a floating alias, the test no longer isolates overlap.

## Implement a splitter that preserves source offsets

The following Python utility uses a Hugging Face tokenizer to create token windows and stores character offsets from the tokenizer's offset mapping. It is suitable for plain normalized text and makes overlap explicit. Production splitters may add semantic separators, but the same provenance principle applies.

\`\`\`python
from dataclasses import dataclass
from transformers import AutoTokenizer

@dataclass(frozen=True)
class Chunk:
    document_id: str
    start_char: int
    end_char: int
    text: str

tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')

def token_chunks(document_id: str, text: str, size: int, overlap: int) -> list[Chunk]:
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError('Require size > overlap >= 0')

    encoded = tokenizer(text, add_special_tokens=False, return_offsets_mapping=True)
    offsets: list[tuple[int, int]] = encoded['offset_mapping']
    chunks: list[Chunk] = []
    step = size - overlap

    for token_start in range(0, len(offsets), step):
        token_end = min(token_start + size, len(offsets))
        if token_start == token_end:
            break
        start_char = offsets[token_start][0]
        end_char = offsets[token_end - 1][1]
        chunks.append(Chunk(document_id, start_char, end_char, text[start_char:end_char]))
        if token_end == len(offsets):
            break

    return chunks
\`\`\`

Tokenizer offset behavior around Unicode normalization and special characters deserves a fixture test. Normalize once before labeling and chunking. PDFs also require layout-aware extraction before this stage; overlap cannot repair scrambled reading order or lost table structure.

## Score evidence-span retrieval, not chunk identity

A retrieved chunk is relevant when it covers enough of a labeled evidence span. Exact containment is straightforward for short facts. Multi-span questions may require two chunks, such as a definition in one section and an exception in another.

Define the rule before seeing results. For example, a chunk matches a span if the intersection covers at least 80 percent of the labeled characters, or if the span is fully contained. Character coverage is imperfect for markup and tables, but it is stable across overlap candidates when canonical text is fixed.

\`\`\`python
from collections.abc import Sequence

def coverage(chunk: Chunk, span_start: int, span_end: int) -> float:
    intersection = max(0, min(chunk.end_char, span_end) - max(chunk.start_char, span_start))
    return intersection / max(1, span_end - span_start)

def evidence_recall_at_k(
    ranked_chunks: Sequence[Chunk],
    evidence_spans: Sequence[tuple[str, int, int]],
    k: int,
) -> float:
    found = 0
    for document_id, start, end in evidence_spans:
        matched = any(
            chunk.document_id == document_id and coverage(chunk, start, end) >= 0.8
            for chunk in ranked_chunks[:k]
        )
        found += int(matched)
    return found / max(1, len(evidence_spans))
\`\`\`

Report query-level results as well as the mean. A one-point aggregate change can conceal a catastrophic loss for a small but critical policy category. Group by boundary type, document format, language, and evidence length.

## Measure duplicate pressure in the ranked list

Overlap can improve span coverage while making the top results less diverse. Two adjacent chunks may repeat most of their tokens and occupy two of five prompt slots. Track lexical or span overlap among returned chunks from the same document.

A provenance-based duplicate measure is easy to audit: for each pair from one document, calculate intersection length divided by the smaller chunk length. Count pairs above a declared threshold, such as 0.7. An embedding-similarity duplicate measure can catch paraphrastic repetition but is less directly tied to the chunking change.

| Metric | Desired direction | Failure it reveals |
|---|---|---|
| Evidence recall at k | Higher or stable | Required span no longer retrieved |
| Boundary-query success rate | Higher or stable | Split separated dependent statements |
| Same-source overlap among top k | Lower | Adjacent duplicates crowd results |
| Unique evidence spans in prompt | Higher | Token budget repeats identical support |
| Indexed chunk count | Lower, subject to recall | Storage and embedding cost growth |
| Prompt evidence tokens | Controlled | Excess overlap inflates generation input |

Do not automatically deduplicate before measurement. First record the raw retriever behavior, then evaluate a diversification or maximal marginal relevance stage as a separate treatment. Otherwise overlap and deduplication effects become inseparable.

## Compare several overlaps as a frontier

There is rarely one universally correct percentage. Evaluate a small set grounded in chunk size, for example 0, 32, 64, and 128 tokens for a 512-token target. Extremely high overlap creates many windows with little new information. The useful result is a frontier showing recall against redundancy, index size, and latency.

Use the same labeled queries for baseline and candidates. Apply paired comparisons at the query level: which queries were gained, lost, or unchanged? Bootstrap confidence intervals can describe uncertainty when the set is large enough, but do not present tiny evaluation sets as statistically decisive.

Define release gates by risk. Critical compliance questions may allow no evidence loss. A broad help-center corpus might tolerate a small aggregate tradeoff if duplicate pressure and cost fall substantially, provided lost queries are reviewed. State the rule before tuning to avoid choosing the candidate that happens to flatter the current set.

Chunk count affects approximate-nearest-neighbor behavior. More overlapping vectors can alter graph construction and candidate competition even when the evidence text remains present. Build indexes with identical ANN parameters and enough time for indexing to finish. For small diagnostic corpora, compare exact search if the vector system supports it, isolating chunking from ANN approximation.

## Inspect losses by rendering chunk neighborhoods

When a query regresses, print the canonical evidence with proposed chunk boundaries and the top-ranked chunks from both indexes. Numbers reveal that a loss exists; a boundary view explains it.

Look for evidence split across windows, removed heading context, repeated boilerplate dominating similarity, an answer span truncated just below the coverage threshold, or metadata filters attached inconsistently after rechunking. Check ranks beyond k. A relevant chunk moving from rank 4 to rank 6 is a ranking crowding issue, while disappearance from the candidate set points to embedding or indexing.

Preserve nearby chunks in diagnostic artifacts, but keep sensitive document text access-controlled. Store offsets and hashes in general CI output, then render full text only in an authorized evaluation environment.

Some losses indicate the splitter needs structure awareness rather than more overlap. Tables, code blocks, legal clauses, and question-answer pairs have natural units. A parser that keeps those units intact often beats increasing overlap everywhere. Use overlap as insurance around acceptable boundaries, not as a replacement for document understanding.

## Add generation checks after retrieval qualifies

First gate retrieval with evidence labels. Then send equivalent retrieved contexts to the generator and grade grounded answer behavior. This order prevents a language model from masking missing retrieval through parametric memory.

Generation evaluation should verify citation alignment, unsupported claims, answer completeness, and abstention when evidence is absent. Keep model version and decoding settings fixed. If the candidate contains more duplicate context, watch for repeated answer sentences or overconfident weighting of a repeated claim.

An answer can improve even when recall at k is unchanged because the preserved boundary gives the model more coherent context. Conversely, recall can improve while answer quality falls because duplicate chunks displace complementary evidence. Both layers are necessary, and their metrics should not be blended into one opaque judge score.

For a wider retrieval methodology, see the [RAG regression testing guide](/blog/rag-regression-testing-guide). If chunk size is changing alongside overlap, the [chunk-size regression guide](/blog/rag-chunk-size-regression-testing-guide) helps design that separate experiment.

## Account for ingestion and serving cost

With fixed-size windows, increasing overlap reduces the step size and increases chunk count. The relationship is nonlinear near the chunk size because each window contributes less new text. Measure actual count rather than quoting a generic multiplier, especially with variable-length structural splitting.

Track embedding requests, vector storage, indexing duration, retrieval latency distribution, reranker candidates, and prompt tokens. Costs vary by provider and deployment, so report measured quantities first. A platform team can apply current unit prices separately without baking unstable prices into the regression suite.

Cache behavior can skew latency comparisons. Warm and cold runs should be labeled. Randomize candidate order or run enough repetitions to reduce time-of-day effects. Performance is secondary to correctness for many evaluations, but a recall gain that doubles prompt evidence may not be viable.

## Version the corpus and migration

Changing overlap requires reingestion. During a rolling migration, old and new indexes can coexist. Tag every chunk and query result with transformation version so mixed results cannot silently enter evaluation or production.

Use shadow traffic to query the candidate without serving its answers. Log ranked IDs, offsets, scores, and filters for offline comparison, respecting privacy controls. After gates pass, canary a small share and monitor no-answer rate, citation coverage, latency, and user feedback. Keep rollback as an index alias switch rather than an emergency re-embed.

Incremental document updates are another trap. If only new documents use the new overlap, evaluation becomes corpus-version dependent. Either rebuild consistently or explicitly support versioned hybrid indexes and test their ranking behavior.

The test suite should fail if candidate and baseline counts suggest missing documents, duplicated ingestion, or mismatched metadata. Before interpreting recall, verify document IDs, canonical hashes, and filter distributions.

## Maintain labels as the corpus evolves

Evidence offsets shift when source documents change. Bind labels to a corpus hash and provide a review tool that shows stale spans against the new text. Do not automatically slide a label to the nearest matching sentence without review, because repeated policy language can map to the wrong section.

Add production misses only after validating that the source truly contains an answer and that the expected response is allowed. Queries with no supporting evidence belong in an abstention set, not the recall denominator. Track them separately to ensure added overlap does not increase spurious retrieval confidence.

Periodically inspect the evaluation distribution. A set dominated by single-sentence facts will favor low overlap and miss the very boundary failures under study. Maintain named slices and publish candidate results for each.

## Catch overlap defects in tables and code samples

Tables and code expose overlap weaknesses that prose-only evaluations miss. A flattened table may place headers in one chunk and values in later chunks. Repeating the preceding tokens can preserve a header for the first few rows, then lose it again in a long table. Label questions that require both a row value and its column or unit, and render extracted text before deciding that more overlap is the remedy.

For tables, record structural coordinates when the extractor provides them: table identifier, row, column, and header relationships. Character spans remain useful for retrieval scoring, but structural metadata helps explain why a chunk is insufficient. Compare a row-aware splitter with the token-window baseline as a separate candidate. It may repeat headers intentionally without duplicating arbitrary neighboring rows.

Code blocks have a different dependency pattern. A function signature, doc comment, and error-handling branch may be separated by fixed token windows. Queries often need the symbol name plus a specific behavior. Build cases for configuration keys, return conditions, exceptions, and the prose immediately preceding a snippet. Preserve file path and symbol metadata through ingestion so retrieval does not depend entirely on repeated tokens.

Do not score a chunk as relevant simply because it contains the queried identifier. For a question about why a retry stops, the label should cover the stopping condition or explanatory comment. Identifier-only matches inflate recall while providing no answer evidence. Conversely, a code chunk containing the logic may be useful without the exact natural-language query terms, which is where embeddings and symbol enrichment can complement each other.

Markdown fences and indentation must survive extraction. If the ingestion pipeline strips them, chunks can merge code with navigation or unrelated prose. Add golden extraction fixtures before the overlap experiment. Changing overlap over corrupted input produces precise measurements of the wrong representation.

Long configuration examples also create near duplicates. High overlap may return four windows from one sample while excluding the explanatory section that tells users when to choose it. Measure unique structural units in the assembled context, not just unique chunk IDs. A diversification step can cap adjacent windows per source, but test whether that cap removes a necessary continuation.

Include syntax-aware and structure-aware candidates only after the fixed-window comparison is understood. Otherwise a broad “new chunker” experiment changes separators, sizes, overlap, metadata, and normalization simultaneously. Stage the work: prove the boundary failure, measure overlap alone, introduce structural splitting, then evaluate their interaction.

These fixtures tend to remain stable and diagnostic. A lost prose fact may have many paraphrased substitutes, but a table unit, configuration key, or code condition identifies a precise ingestion failure. Keep them as protected slices even when the broader query set grows.

## Frequently Asked Questions

### Is overlap best expressed as a percentage of chunk size?

A ratio helps compare configurations, but record the absolute unit and realized offsets too. Tokenizers and structure-aware splitters produce variable chunks, so a nominal percentage may not describe actual repeated text.

### Why did more overlap reduce recall at k?

Near-duplicate chunks can crowd the ranked list, and a larger index can change approximate search behavior. Inspect ranks beyond k, same-document duplicates, and exact-search results before blaming the embedding model.

### Can answer-quality grading replace evidence recall?

No. A generator may answer from prior knowledge or produce plausible unsupported prose. Evidence-span recall shows whether the changed retriever supplied the labeled source, while generation grading measures use of that source.

### How many overlap candidates should we test?

Use a small, predeclared range that spans no overlap through a plausible upper bound. Four or five candidates usually reveal the tradeoff more clearly than fine-tuning dozens against one evaluation set.

### When should we change the splitter instead of increasing overlap?

When losses cluster around tables, headings, code, or other structural units, preserve those units explicitly. Global overlap is expensive and may still fail to reconstruct structure that extraction already damaged.
`,
};
