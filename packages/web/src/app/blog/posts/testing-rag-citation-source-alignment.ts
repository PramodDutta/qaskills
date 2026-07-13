import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing RAG Citation-to-Source Alignment',
  description:
    'Test RAG citation-to-source alignment with claim-level evidence maps, deterministic validators, calibrated entailment grading, and actionable regression metrics.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing RAG Citation-to-Source Alignment

The answer says returns are accepted for 60 days and appends “[2].” Source 2 is a real policy document, but it states 30 days. The citation exists, resolves, and looks authoritative. It is still wrong because the cited passage does not support the claim attached to it.

Citation-to-source alignment tests that relationship at claim level. For each externally verifiable claim in a generated answer, the cited evidence must entail or directly substantiate the claim, and each citation marker must point to the passage the user can inspect. Link presence, retrieval relevance, and general groundedness are useful signals, but none alone proves alignment.

## Model the evidence chain explicitly

A RAG response normally moves through retrieval, context assembly, generation, citation rendering, and presentation. Alignment can break at any handoff.

| Stage | Artifact to retain | Alignment failure exposed |
|---|---|---|
| Retrieval | Document ID, chunk ID, score, text | Supporting source never retrieved |
| Context assembly | Ordered chunks actually sent to model | Citation index no longer matches displayed source |
| Generation | Raw answer with citation markers | Claim points to irrelevant or contradictory passage |
| Citation resolver | Marker-to-source mapping | Correct marker opens wrong document or chunk |
| UI rendering | Visible answer and source panel | User cannot inspect the quoted evidence |

Store stable document and chunk identifiers, not only array positions. Position “2” changes when reranking, deduplication, or filtering changes. The display layer can still number sources for readability, but evaluation should join through immutable IDs.

The [Phoenix RAG tracing and evaluation guide](/blog/phoenix-rag-tracing-evaluation-guide) shows how trace data can connect retrieval and generation. Alignment evaluation needs that lineage or an equivalent application record.

## Distinguish four citation quality questions

Teams frequently combine different problems into one “citation score.” Separate them so failures lead to a specific repair.

1. **Validity:** Does the citation marker resolve to an existing source artifact?
2. **Correctness:** Does the cited passage support the attached claim?
3. **Completeness:** Do claims that require evidence have citations?
4. **Quality:** Is the source appropriate and authoritative for the claim?

A citation can be valid but incorrect, correct but attached to only one of several claims, or aligned to a low-quality secondary source when an approved primary source is required. Source quality is partly a product policy, not a pure semantic property.

| Example answer behavior | Valid | Correct | Complete | Quality concern |
|---|---:|---:|---:|---|
| Marker points to missing chunk | No | Not scorable | No | Broken lineage |
| Passage says 30 days, answer says 60 | Yes | No | Citation present | Contradiction |
| Two factual sentences, one cited | Yes | Maybe for cited claim | No | Uncited claim |
| Claim supported by an old forum post | Yes | Possibly | Yes | Authority or freshness |
| Several sources jointly support one synthesis | Yes | Yes if combined evidence entails it | Yes | Resolver must show all evidence |

Do not reward citation density. Adding markers to every sentence can lower usability and create false authority if the sources do not align.

## Use an output schema that preserves claim linkage

Parsing free-form bracket markers is possible, but structured output makes evaluation and rendering safer. Ask the RAG task to return claims with source IDs, then render prose from that structure or preserve a sidecar evidence map.

\`\`\`typescript
export type RagEvidence = {
  sourceId: string;
  chunkId: string;
  quotedText?: string;
};

export type SupportedClaim = {
  claimId: string;
  text: string;
  evidence: RagEvidence[];
};

export type RagAnswer = {
  answerText: string;
  claims: SupportedClaim[];
};

export function validateEvidenceReferences(
  answer: RagAnswer,
  availableChunks: Set<string>,
): string[] {
  const errors: string[] = [];

  for (const claim of answer.claims) {
    if (claim.evidence.length === 0) {
      errors.push(\`Claim \${claim.claimId} has no evidence\`);
    }

    for (const evidence of claim.evidence) {
      const key = \`\${evidence.sourceId}:\${evidence.chunkId}\`;
      if (!availableChunks.has(key)) {
        errors.push(\`Claim \${claim.claimId} references unknown \${key}\`);
      }
    }
  }

  return errors;
}
\`\`\`

This deterministic validator proves referential integrity and evidence presence. It does not prove semantic support. Keep that boundary clear: a successful join is necessary but insufficient.

If the product must generate natural prose with inline markers, record the resolved claim spans and source IDs after generation. Test marker parsing separately with adjacent citations, repeated markers, multi-digit numbers, punctuation, code blocks, and missing references.

## Construct a gold set around claims and passages

A useful alignment dataset contains questions, approved claims, supporting passages, contradictory passages, tempting but irrelevant passages, and time-sensitive metadata. The negative passages matter. If every retrieved chunk supports the answer, even a random citation can appear correct.

For a policy assistant, one example could include:

- question: “Can an opened device be returned after 45 days?”
- approved claim: opened devices have a 30-day return window;
- supporting chunk: current electronics return policy with effective date;
- contradiction: archived 60-day holiday policy;
- hard negative: current return instructions that omit the deadline;
- expected behavior: answer no, cite current policy, optionally mention exceptions only when supported.

Label at the smallest passage that supplies enough evidence. A full 40-page manual is technically a source but gives a weak user experience and makes semantic grading noisy. Preserve surrounding context when a sentence depends on a heading, definition, or table column.

Include multi-source synthesis. If the answer combines an eligibility rule from one document with a regional exception from another, neither source alone entails the complete claim. The evidence set may support it jointly.

## A deterministic quoted-evidence check

When the response includes a verbatim evidence excerpt, first verify that the excerpt occurs in the referenced chunk after conservative normalization. This catches fabricated quotes and resolver mismatches without an LLM judge.

The following Python uses only the standard library. It normalizes Unicode, case, and whitespace but deliberately keeps punctuation and words. Aggressive normalization can turn materially different text into a false match.

\`\`\`python
import re
import unicodedata
from dataclasses import dataclass

@dataclass(frozen=True)
class Evidence:
    source_id: str
    chunk_id: str
    quote: str

def normalize(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text)
    return re.sub(r"\\s+", " ", normalized).strip().casefold()

def quote_occurs_in_chunk(evidence: Evidence, chunks: dict[tuple[str, str], str]) -> bool:
    chunk = chunks.get((evidence.source_id, evidence.chunk_id))
    if chunk is None or not evidence.quote.strip():
        return False
    return normalize(evidence.quote) in normalize(chunk)

chunks = {
    ("returns-v4", "eligibility-2"):
        "Opened electronics may be returned within 30 days of delivery with proof of purchase."
}
evidence = Evidence(
    source_id="returns-v4",
    chunk_id="eligibility-2",
    quote="Opened electronics may be returned within 30 days of delivery",
)

assert quote_occurs_in_chunk(evidence, chunks)
\`\`\`

Passing this check proves quote fidelity, not claim entailment. The answer could quote “30 days” and still claim “60 days.” Pair it with a claim-to-evidence assessment.

## Grade semantic support with a constrained rubric

For each claim and evidence set, classify one of four relationships:

- **entailed:** the evidence directly supports the full claim;
- **contradicted:** the evidence conflicts with a material part of the claim;
- **insufficient:** evidence is related but does not establish the claim;
- **not applicable:** the sentence is non-factual, a transition, or does not require external evidence under policy.

An LLM evaluator can apply this rubric at scale, but calibrate it. Provide the exact claim, evidence text, document metadata needed for freshness, and no unrelated context. Require a label and short rationale grounded only in the evidence. Do not ask the judge whether the answer is generally plausible, because its own knowledge can mask unsupported claims.

Blindly sample judge decisions for human review. Pay particular attention to numbers, negation, modal verbs, comparisons, temporal qualifiers, and entity identity. “May,” “must,” and “usually” are not interchangeable. A passage about Plan A does not support the same feature for Plan B.

## Calculate claim-level metrics

Suppose each evaluated claim has \`requires_citation\`, a list of citations, and an alignment label for each cited evidence set. The following runnable Python summarizes citation completeness and aligned citation precision.

\`\`\`python
from dataclasses import dataclass

@dataclass(frozen=True)
class ClaimResult:
    requires_citation: bool
    citation_labels: tuple[str, ...]

def citation_metrics(results: list[ClaimResult]) -> dict[str, float]:
    required = [result for result in results if result.requires_citation]
    cited_required = [result for result in required if result.citation_labels]
    all_citations = [
        label
        for result in results
        for label in result.citation_labels
    ]

    aligned = sum(label == "entailed" for label in all_citations)
    return {
        "citation_completeness": (
            len(cited_required) / len(required) if required else 1.0
        ),
        "aligned_citation_precision": (
            aligned / len(all_citations) if all_citations else 1.0
        ),
    }

results = [
    ClaimResult(True, ("entailed",)),
    ClaimResult(True, ("insufficient",)),
    ClaimResult(True, ()),
    ClaimResult(False, ()),
]

assert citation_metrics(results) == {
    "citation_completeness": 2 / 3,
    "aligned_citation_precision": 1 / 2,
}
\`\`\`

The names are deliberate. “Citation precision” here means the fraction of emitted citations whose evidence entails the claim. Completeness is the fraction of evidence-requiring claims with at least one citation, regardless of whether that citation is correct. Report correctness and completeness together to prevent gaming.

Add severity weighting only after publishing the unweighted counts. A wrong dosage citation is more serious than a wrong office-hours citation, but a weighted score can hide how many users encounter each type.

## Segment failures by the component that can fix them

An aligned source absent from retrieval is a retrieval recall defect. A supporting chunk in context but the wrong marker selected is a generation or citation-attribution defect. A correct raw mapping that opens a different document is a resolver defect. Aggregate alignment cannot distinguish these.

| Observed trace | Primary failure bucket | Likely investigation |
|---|---|---|
| Gold evidence not in top-k | Retrieval miss | Query rewrite, embeddings, filters, chunking |
| Evidence retrieved then removed | Context assembly | Reranking, token budget, deduplication |
| Evidence present, unsupported claim generated | Generation grounding | Prompt, model choice, decoding, abstention |
| Correct claim, wrong source ID | Attribution | Structured output and evidence mapping |
| Correct source ID, wrong UI target | Resolution/rendering | Index join, URL construction, version mapping |
| Current answer cites archived policy | Freshness/metadata | Effective-date filtering and corpus lifecycle |

The [TruLens RAG Triad guide](/blog/trulens-rag-triad-groundedness-context-relevance-2026) explains related groundedness and relevance dimensions. Citation alignment adds the explicit attachment between a claim and its displayed evidence.

## Test stale and contradictory sources

Enterprise corpora contain superseded policies, duplicate pages, and regional variants. A semantic retriever may rank an obsolete passage highly because its wording closely matches the question. Include effective dates, jurisdiction, product version, and document status in fixtures.

The correct behavior may be to cite the current source, mention a conflict, or abstain until the user supplies location. The test oracle must encode that choice. Simply checking that “some return policy” was cited rewards stale evidence.

Contradictory sources also test synthesis honesty. When two current authorities disagree, the model should not silently select the convenient one. It may need to expose the disagreement and cite both, based on the product’s policy.

## Inspect citation spans in the rendered answer

Even correct source IDs can be positioned ambiguously. A marker at the end of a paragraph containing four claims may appear to support all four. Define whether a citation attaches to the preceding sentence, clause, bullet, table row, or paragraph.

Render tests should verify that:

- each marker opens the expected document and passage;
- keyboard users can focus and activate it;
- repeated citations resolve consistently;
- source numbering remains stable after streaming completes;
- citations do not drift when markdown tables or lists render;
- hidden or access-restricted documents are not exposed through preview text.

Streaming creates a special risk: temporary marker numbers can change as sources arrive. Prefer stable internal IDs and assign display numbers only when the evidence list is known, or update answer and source panel atomically.

## Account for unanswerable questions

Alignment evaluation must reward abstention when the corpus lacks support. Otherwise the system is pressured to produce a well-cited guess. Add questions whose answer is absent, partially present, or requires a document the test user cannot access.

The expected result might be “the provided sources do not specify this,” optionally citing the closest passage only if it genuinely explains the limitation. A citation to a related document does not turn an unsupported answer into a supported one.

Measure unsupported answer rate separately from citation alignment. A system that refuses every question can achieve perfect citation correctness by emitting no citations, which is useless. Pair safety metrics with answer coverage and task success.

## Calibrate evaluators before gating releases

Build a calibration set with clear entailments, contradictions, insufficiencies, multi-source cases, and difficult qualifiers. Have at least two qualified reviewers label it under a written guide, resolve disagreements, then compare deterministic and model-based evaluators with that reference.

Do not tune and report on the same small set. Keep a held-out slice and periodically refresh it with production failures. Evaluator upgrades can change labels even when the RAG system does not, so version evaluator prompts and models and re-baseline before enforcing a new threshold.

A CI gate should include deterministic reference integrity, known critical regressions, and a stable semantic sample. Larger model-judged experiments can run nightly or before releases. Store case-level evidence so a developer can act on a failed score without rerunning an expensive experiment blindly.

## Use metamorphic checks when exact prose varies

RAG wording changes across runs, but several evidence relationships should remain stable. Remove the truly supporting chunk while leaving hard negatives in context: the system should abstain or qualify the answer rather than retain the original claim and citation. Replace an effective policy with a clearly newer version: the answer should follow the new rule and cite its identifier.

Swap the display order of equivalent retrieved chunks. Stable source IDs should preserve alignment even when bracket numbers change. If the cited document changes solely because it moved from position two to position three, the implementation is coupling attribution to an array index.

These metamorphic tests do not require one golden sentence. They assert how evidence changes should affect claims. They are especially useful when sampling makes exact-match assertions brittle.

## Evaluate tables and numbers at cell granularity

A generated comparison table can place several facts in one row and one citation at the row end. Segment each factual cell or explicitly define a row-level evidence set. Check units, currency, date, denominator, and aggregation window, because a passage can contain the same number with a different meaning.

Numeric contradictions deserve deterministic assistance. Extract expected values from curated fixtures and compare structured answer fields where the product supports them. Semantic judges can miss a changed decimal point or reverse a percentage direction. Keep the original passage visible for final review.

When source tables use merged headers, the chunk must retain header context. A cell reading “12” without its column and row labels cannot support a claim, even though the number is copied exactly.

## Turn production citation feedback into labeled evidence

User reports such as “this source does not say that” are high-value seeds, but reproduce the full source version and access context before labeling. The document may have changed after generation, the user may lack permission to view the cited passage, or the resolver may now point to a different revision.

Attach the trace, answer, claim span, source snapshot, and document version to the incident. Add a minimized case to the regression set only after determining whether the defect was retrieval, attribution, freshness, or rendering. This prevents a prompt tweak from masking a broken resolver.

## Frequently Asked Questions

### Is a resolvable citation considered aligned?

No. Resolution proves that the source exists. Alignment requires the cited passage to support the specific claim attached to it. A real document can be irrelevant, insufficient, stale, or contradictory.

### How small should the evaluated source passage be?

Use the smallest passage that preserves enough context to judge support, including headings or table labels when needed. Entire documents create noise, while isolated sentences can remove definitions and qualifiers.

### Can groundedness replace citation correctness testing?

No. Groundedness asks whether the answer is supported by provided context. Citation correctness asks whether each displayed citation points to the evidence supporting its attached claim. The answer may be grounded overall but cite the wrong chunk.

### What should happen when several sources jointly support one claim?

Evaluate the evidence set together and preserve all required source IDs. Also check that no single marker is presented as sufficient when the claim depends on combining separate rules or facts.

### How are uncited conversational sentences handled?

Define a policy for which statements require evidence. Greetings, transitions, and clearly marked reasoning may not. Factual claims about external or corpus content should be segmented and checked for citation completeness under that policy.
`,
};
