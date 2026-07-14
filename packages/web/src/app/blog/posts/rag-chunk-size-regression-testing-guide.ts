import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG Chunk Size Regression Testing Guide',
  description:
    'Test RAG chunk size changes with retrieval regression sets, citation checks, answer quality gates, and rollout metrics before re-indexing production.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# RAG Chunk Size Regression Testing Guide

A chunk-size change looks harmless in a pull request. One constant moves from 500 tokens to 900. Re-indexing gets faster. Context windows look less crowded. Then support asks why the assistant can no longer answer a pricing exception that used to work, and the retrieval logs show the answer buried inside a chunk that now contains three unrelated policy sections. Chunk size is a retrieval quality parameter, not a formatting preference.

This guide shows how to regression test chunk size changes before they reach production. It assumes your RAG system already has a retriever, an embedding model, a vector store, and an answer generator. The focus is the QA discipline around changing chunk size, overlap, separators, and indexing policy. You need enough evidence to decide whether a new chunking configuration improves retrieval, damages citations, or only moves cost around.

For chunking design choices, read the companion [RAG chunking QA guide](/blog/rag-chunking-qa-guide-2026). For broader release gates on retrieval and answer behavior, connect this with [RAG regression testing](/blog/rag-regression-testing-guide).

## What Actually Changes When Chunk Size Changes

Changing chunk size affects more than the number of records in a vector database. It changes semantic density, embedding representation, top-k competition, citation granularity, prompt packing, and answer synthesis. Smaller chunks can retrieve precise evidence but lose surrounding context. Larger chunks preserve context but may dilute the embedding and produce vague citations.

| Change | Likely benefit | Likely risk | Regression signal |
| --- | --- | --- | --- |
| Smaller chunks | More precise citations and less irrelevant text | Answer requires information split across chunks | Lower answer completeness for multi-step questions |
| Larger chunks | More local context in each retrieved item | Embedding represents several topics at once | Lower top-k hit rate on narrow questions |
| More overlap | Preserves boundary-spanning facts | Index size and duplicate evidence increase | Higher cost, repeated citations, slower retrieval |
| Less overlap | Smaller index and less duplication | Boundary facts disappear | Failures concentrated around section transitions |
| Header-aware splitting | Better section identity | Poor results if headers are noisy | Improved citation labels but possible missed body-only facts |

A regression test should separate these effects. If answer quality drops, you need to know whether retrieval missed the evidence, the reranker reordered it, the generator ignored it, or the citation formatter failed.

## Build a Fixed Evaluation Set Before Re-indexing

Chunk-size experiments need a stable question set. Do not evaluate a new index with whichever prompts happen to be in Slack that week. Build a versioned set of questions, expected source documents, required facts, and allowed answer notes.

The set should include:

- Narrow lookup questions with one exact source passage.
- Boundary questions where the answer crosses two adjacent sections.
- Multi-hop questions that require two documents.
- Negative questions where the correct answer is "not found" or "not documented".
- Ambiguous wording that should still retrieve the correct policy.
- Locale, version, or plan-specific questions if your product has variants.

| Case type | Example from a docs assistant | Why chunk size matters |
| --- | --- | --- |
| Exact fact | "What is the refund window for annual plans?" | Larger chunks may bury the sentence among unrelated billing terms |
| Boundary fact | "What happens after an invoice retry fails?" | Split boundaries can separate trigger and outcome |
| Multi-hop | "Can enterprise customers export audit logs after SSO is disabled?" | Top-k must include both entitlement and SSO policy |
| Negative | "Does the starter plan include HIPAA support?" | Bigger chunks may include adjacent enterprise language and cause false positives |
| Versioned | "Which webhook retries apply to API v2?" | Chunk metadata must preserve version filters |

Keep the set small enough to run often and rich enough to catch meaningful movement. Fifty well-owned cases can outperform five hundred unlabeled prompts.

## A Minimal Chunking Experiment Harness

The code below is a small TypeScript harness that compares chunk sizes using deterministic retrieval fixtures. It does not pretend to be a full RAG platform. It gives QA a repeatable way to run the same questions against two chunking configurations.

\`\`\`ts
// rag/chunk.ts
export type Chunk = {
  id: string;
  documentId: string;
  text: string;
  start: number;
  end: number;
};

export function chunkText(documentId: string, text: string, size: number, overlap: number): Chunk[] {
  if (size <= 0) throw new Error('size must be positive');
  if (overlap < 0 || overlap >= size) throw new Error('overlap must be smaller than size');

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push({
      id: \`\${documentId}:\${index}\`,
      documentId,
      text: text.slice(start, end),
      start,
      end,
    });

    if (end === text.length) break;
    start = end - overlap;
    index += 1;
  }

  return chunks;
}
\`\`\`

The splitter is character-based for clarity. Production systems often split by tokens, Markdown sections, HTML nodes, or semantic boundaries. The regression idea is the same: create chunks, index them, retrieve against a fixed set, and compare.

## Retrieval Hit Rate Before Answer Quality

Do not start by asking the LLM whether answers are better. First ask whether the expected evidence is retrieved. If the right chunk never reaches the prompt, answer evaluation becomes noise.

\`\`\`ts
// rag/retrieval-regression.test.ts
import { describe, expect, it } from 'vitest';
import { chunkText } from './chunk';

type Case = {
  id: string;
  question: string;
  documentId: string;
  requiredText: string;
};

const docs = new Map([
  [
    'billing-policy',
    'Annual plans may be refunded within 30 days. Monthly plans are refundable for 7 days. Enterprise exceptions require finance approval.',
  ],
  [
    'webhook-retries',
    'API v2 webhooks retry after 1 minute, 5 minutes, and 30 minutes. Retries stop after a successful 2xx response.',
  ],
]);

const cases: Case[] = [
  {
    id: 'annual-refund-window',
    question: 'What is the refund window for annual plans?',
    documentId: 'billing-policy',
    requiredText: 'Annual plans may be refunded within 30 days',
  },
  {
    id: 'api-v2-webhook-retries',
    question: 'Which retry delays apply to API v2 webhooks?',
    documentId: 'webhook-retries',
    requiredText: '1 minute, 5 minutes, and 30 minutes',
  },
];

function lexicalRetrieve(question: string, chunks: ReturnType<typeof chunkText>, topK: number) {
  const terms = question.toLowerCase().split(/\\W+/).filter(Boolean);

  return chunks
    .map((chunk) => ({
      chunk,
      score: terms.filter((term) => chunk.text.toLowerCase().includes(term)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.chunk);
}

describe('chunk size retrieval regression', () => {
  it.each([
    { size: 80, overlap: 20 },
    { size: 140, overlap: 30 },
  ])('retrieves required evidence for size $size', ({ size, overlap }) => {
    const chunks = Array.from(docs).flatMap(([documentId, text]) =>
      chunkText(documentId, text, size, overlap),
    );

    for (const testCase of cases) {
      const retrieved = lexicalRetrieve(testCase.question, chunks, 3);
      const found = retrieved.some(
        (chunk) =>
          chunk.documentId === testCase.documentId && chunk.text.includes(testCase.requiredText),
      );

      expect(found, \`missing evidence for \${testCase.id}\`).toBe(true);
    }
  });
});
\`\`\`

In production you would replace \`lexicalRetrieve\` with the real embedding and vector-store query path. Keep the assertion style: every case names the evidence it needs.

## Metrics That Make Chunk Experiments Comparable

A chunk-size regression report should include more than a single pass rate. Different metrics reveal different failures.

| Metric | Definition | Why QA should care |
| --- | --- | --- |
| Evidence hit rate | Required source appears in top-k | Proves retrieval can supply the answer |
| Mean reciprocal rank | Expected evidence rank, weighted by position | Penalizes evidence that appears too low to fit context |
| Citation precision | Cited chunks support the answer | Finds answers that quote irrelevant chunks |
| Citation coverage | Required facts have citations | Finds uncited generated claims |
| Refusal accuracy | Negative cases avoid unsupported answers | Protects against over-answering from broad chunks |
| Prompt token cost | Retrieved context size sent to the model | Shows cost and latency movement |

Avoid one magic score. Chunking is a tradeoff. A configuration that improves evidence hit rate by one point but doubles context cost may still be wrong for a high-volume assistant.

## Testing Boundary Failures Explicitly

Boundary failures are the easiest to miss. A policy sentence may be split after the condition but before the consequence. Overlap may fix it, or header-aware chunking may be better.

Create cases where the required text spans a boundary under at least one candidate size. Then assert retrieval contains enough context to answer, not just one side of the boundary.

\`\`\`ts
// rag/boundary.test.ts
import { describe, expect, it } from 'vitest';
import { chunkText } from './chunk';

describe('chunk boundaries', () => {
  it('keeps invoice retry condition and outcome together with configured overlap', () => {
    const document =
      'When an invoice retry fails three times, the subscription moves to past_due and account admins receive an email.';

    const chunks = chunkText('billing-retry', document, 72, 28);

    expect(
      chunks.some(
        (chunk) =>
          chunk.text.includes('fails three times') && chunk.text.includes('past_due'),
      ),
    ).toBe(true);
  });
});
\`\`\`

This test is intentionally surgical. It does not need an LLM. It validates a known chunking risk before retrieval even begins.

## Comparing Candidate Indexes

The most reliable experiment runs baseline and candidate indexes side by side. Do not overwrite the production index and then try to explain what changed. Create an index name or namespace that includes the chunking config, corpus version, embedding model, and build id.

Recommended metadata per chunk:

- Source document id.
- Source document version or commit.
- Chunker name and version.
- Chunk size and overlap.
- Start and end offsets.
- Section heading path.
- Locale or product version filters.
- Hash of the source text.

With that metadata, QA can answer whether a bad result came from the chunker, stale documents, a filter mistake, or retrieval ranking.

## Answer Evaluation After Retrieval Passes

Once expected evidence is retrieved, evaluate the generated answer. For chunk size changes, answer checks should focus on evidence use:

- Does the answer include every required fact?
- Does it avoid facts absent from retrieved chunks?
- Are citations attached to the right statements?
- Does it refuse when evidence is missing?
- Does it preserve plan, region, or version constraints?

Use deterministic rubric grading where possible, but keep human review for cases with legal, safety, or customer-impacting language. If an LLM judge is used, pin its prompt and record its model version. The point is trend comparison, not pretending a grader is absolute truth.

## Rollout Gates for Re-indexing

A chunk-size change often requires re-indexing the corpus. Treat that as a release. The gate should include:

1. Retrieval regression pass on fixed cases.
2. Answer quality comparison on selected cases.
3. Cost and latency comparison.
4. Citation audit for high-risk flows.
5. Negative-case review.
6. Rollback plan to the previous index.

The rollback plan matters. If the new index harms a support workflow, you should be able to route traffic back to the prior namespace without rebuilding from scratch.

## Cost and Latency Are Regression Dimensions

Chunk changes often look good on quality metrics while quietly harming cost or latency. Larger chunks can increase prompt tokens. More overlap can inflate the index and slow ingestion. Smaller chunks can require larger \`topK\` values to recover enough context. QA should report these as release facts, not infrastructure trivia.

Track at least:

- Number of chunks produced per corpus version.
- Average retrieved context tokens per question.
- P95 retrieval latency.
- P95 answer generation latency.
- Vector index storage size.
- Re-index duration.
- Duplicate citation rate.

Use the same evaluation set for cost comparison that you use for quality comparison. Otherwise the numbers are not comparable. A candidate index that is tested on shorter questions will appear cheaper for the wrong reason.

## Segment Results by Question Family

Aggregate scores hide important regressions. A new chunk size may improve exact lookup questions and damage multi-hop questions. It may help public docs and hurt API reference pages. Segment the report so product owners can make a real decision.

Useful segments:

- Source type: docs, tickets, policies, release notes, API reference.
- Answer type: exact fact, procedure, comparison, troubleshooting, refusal.
- Document length: short, medium, long.
- Section structure: strong headings, weak headings, tables, code-heavy pages.
- Customer risk: low, support-critical, revenue-critical, regulated.

If a candidate chunker improves the average by two points but fails regulated policy questions, it should not ship. The segment tells you that. The average does not.

## Human Review for Borderline Cases

Some chunk-size decisions need human judgment. A generated answer may be technically correct but cite a chunk that is too broad for audit use. Another answer may be complete but slower because it retrieves duplicated overlap. Bring a small set of borderline cases to human review and ask narrow questions:

- Is the cited evidence specific enough?
- Would a support agent trust this answer?
- Is any required caveat missing?
- Did the answer mix versions or plans?
- Is the refusal appropriate?

Do not ask reviewers whether the new chunk size "feels better." Give them paired baseline and candidate outputs with source chunks and case ids. Reviewers should make a decision on evidence, not formatting.

## Production Shadowing Before Full Cutover

If traffic volume and privacy rules allow it, shadow production questions against the candidate index without showing candidate answers to users. Compare retrieval overlap, latency, and refusal behavior. Shadowing is especially useful for long-tail questions that never appear in a curated regression set.

Keep guardrails:

- Do not store sensitive prompts longer than policy allows.
- Do not use shadow answers for user-visible actions.
- Sample traffic rather than duplicating every request if cost is high.
- Label candidate logs clearly.
- Stop the experiment if cost or latency exceeds limits.

Shadow data should add confidence after the fixed regression suite passes. It should not replace labeled cases, because unlabeled production prompts rarely tell you what the correct answer should have been.

## Chunk Size and Reranking

If your RAG pipeline uses a reranker, chunk-size changes must be tested through both vector retrieval and reranking. A candidate chunk might appear in the initial top twenty but fall out of the reranked top five because the chunk is too broad. Another chunk might score well because it repeats the question terms while lacking the answer. Without reranker-level evidence, the regression report can claim retrieval succeeded even though the generator never sees the right context.

Record initial rank and final rank for required evidence. A healthy change should not only retrieve the evidence somewhere. It should keep the evidence high enough to fit into the context window. For citation-heavy assistants, final rank matters because the generator tends to cite the most visible chunks, not every chunk that existed upstream.

## Metadata Filters Can Hide Chunking Regressions

Chunk-size tests should include metadata filters because production queries rarely search the whole corpus. Plan, region, version, language, permission, and product filters change which chunks compete. A chunking strategy that passes global retrieval can fail under filters if metadata is attached to the wrong chunk or if large chunks mix content from multiple filtered sections.

Test examples:

- Enterprise-only policy does not leak into starter-plan answers.
- API v1 and API v2 chunks remain separated.
- Regional legal text is retrieved only for the matching region.
- Private workspace documents are excluded for unauthorized users.
- Translated chunks preserve locale metadata.

Metadata mistakes are especially dangerous because the retrieved text may look plausible. The answer can be fluent, cited, and wrong for the user's entitlement.

## Tables, Code Blocks, and Structured Documents

Chunk size behaves differently on structured content. Markdown tables, API parameter lists, code examples, and troubleshooting matrices can lose meaning when split naively. A row separated from its header may be unreadable. A code block split in the middle may retrieve syntax without explanation. A table captured as one giant chunk may rank poorly for a specific row.

Add structured-document cases to the regression set. The expected evidence should include enough surrounding structure for the generator to answer accurately. For API docs, that might mean parameter name, type, default, and description. For troubleshooting docs, it might mean symptom, cause, and fix in the same retrieved context.

Chunk size is not only about length. It is about preserving useful units of meaning.

## Versioning the Chunker Itself

Treat the chunker as versioned production code. Store a chunker version with every indexed chunk and include it in regression reports. If an engineer changes separator rules, table handling, overlap, or metadata extraction, the version should change. That makes it possible to explain why two indexes built from the same documents behave differently.

Versioning also helps rollback. If production traffic is routed back to the previous index, support and QA can see which chunker produced it. Without that trace, teams waste time comparing document content when the real change was the chunking algorithm.

## Ownership After a Failed Experiment

When a candidate chunk size fails, record the failure pattern. Was it boundary loss, metadata mixing, broad citations, cost, latency, or answer incompleteness? That classification guides the next experiment. Simply trying another number repeats the same mistake. Many failures call for section-aware splitting, table handling, or better metadata, not a slightly different size.

Add the classification to the pull request or experiment record. Future engineers should know why a tempting chunk size was rejected, especially when index cost or context-window pressure makes the same proposal return months later during another optimization cycle or model migration.

## Frequently Asked Questions

### Should I optimize chunk size using only answer quality scores?

No. Check retrieval evidence first. If the expected chunks are missing, answer scores will mix retrieval failure, generation behavior, and grader noise into one unclear signal.

### How many regression questions do I need for a chunk-size change?

Start with 50 to 100 well-labeled cases across exact, boundary, multi-hop, negative, and versioned questions. Add cases whenever production issues reveal a missing pattern.

### Is a larger chunk always better for long-context models?

No. Larger chunks can preserve context, but they can also dilute embeddings and make citations less precise. Long context does not remove the need for accurate retrieval.

### Should overlap be measured in characters, words, or tokens?

Use the unit your chunker and model pipeline actually operate on. Token-based overlap is usually more predictable for LLM context cost, while document-aware splitters may use headings and sections.

### What should block a production re-index?

Missing required evidence for critical questions, worse refusal behavior on negative cases, broken citations for regulated content, or a cost and latency increase that violates product limits should block rollout.
`,
};
