import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RAG Testing Citation Accuracy Scoring That Finds Unsupported Claims',
  description: 'Build RAG testing citation accuracy scoring with claim-level evidence checks, span validation, graded metrics, and CI diagnostics that expose false support.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# RAG Testing Citation Accuracy Scoring That Finds Unsupported Claims

RAG testing citation accuracy scoring should evaluate each verifiable claim against the exact source span cited for it. Split the answer into atomic claims, resolve every citation to retrieved evidence, classify whether that evidence fully supports, partially supports, contradicts, or does not address the claim, then aggregate results with explicit penalties for missing, invalid, and misleading citations. A link count is not an accuracy metric.

The essential distinction is between citation correctness and answer correctness. An answer can state a true fact but cite a passage that does not prove it. It can also faithfully cite an obsolete or incorrect source. QA needs separate measurements for citation entailment, citation completeness, source quality, and overall answer accuracy. Combining them into one opaque score makes failures hard to diagnose and easy to game.

This guide presents a runnable evaluation design for engineers testing retrieval-augmented generation systems. It covers dataset structure, claim extraction, span matching, deterministic checks, LLM-assisted entailment, metric calculation, adversarial fixtures, and CI release rules.

## Model the evidence chain before writing a scorer

A citation travels through several components: document ingestion, chunking, retrieval, prompt assembly, generation, citation rendering, and link resolution. A displayed citation may fail even when retrieval found the right document, or the model may cite a valid document that never appeared in its context. Preserve the chain so the evaluator can identify which component broke.

| Chain stage | Required artifact | Example defect | Diagnostic question |
|---|---|---|---|
| Corpus | Immutable document revision | Policy page changed | Which source version was authoritative? |
| Chunking | Chunk ID and character span | Sentence split removes qualifier | Did the chunk contain the full condition? |
| Retrieval | Ranked chunk IDs and scores | Relevant source ranked too low | Was supporting evidence available to generation? |
| Prompt context | Exact chunks sent to model | Truncation drops final sentence | What evidence could the model actually see? |
| Answer | Exact generated text | Claim merges two facts | Which atomic propositions were asserted? |
| Citation map | Marker to source and span | Marker points to adjacent chunk | Does the displayed source support the claim? |

Store these artifacts at evaluation time rather than trying to reconstruct them from logs later. Source documents should have stable identifiers and revisions. URLs alone are insufficient because their contents can change. For internal knowledge bases, a document ID plus content digest and ingestion timestamp gives reviewers much stronger provenance.

Define a citation record independently of presentation syntax. Whether the UI shows [3], a footnote, or a clickable card should not affect evidence scoring.

\`\`\`ts
export interface CitationRef {
  citationId: string;
  documentId: string;
  documentRevision: string;
  chunkId: string;
  quotedSpan?: string;
}

export interface RetrievedChunk {
  documentId: string;
  documentRevision: string;
  chunkId: string;
  text: string;
  rank: number;
}

export interface RagAnswer {
  answerId: string;
  text: string;
  citations: CitationRef[];
  promptChunks: RetrievedChunk[];
}
\`\`\`

This separation also makes UI tests simpler. A browser test can verify that marker 3 opens the source represented by citationId 3, while the semantic evaluator verifies whether that source supports the attached claim.

## Create claim-level gold cases, not answer-level labels

An answer-level “good” label hides mixed evidence. A five-sentence answer may contain three supported claims, one uncited claim, and one claim contradicted by its source. Break expected answers into atomic, independently verifiable propositions. Each gold case should state which source revisions support each claim and whether a citation is required.

Atomic does not mean artificially short. “The trial lasts 14 days and requires no credit card” contains two propositions because one may be supported while the other is not. “Restart the service after changing the port” may be one procedural claim if the source states it as a single requirement.

\`\`\`json
{
  "caseId": "retention-policy-004",
  "question": "How long are audit logs retained on the Team plan?",
  "expectedClaims": [
    {
      "claimId": "c1",
      "text": "Team plan audit logs are retained for 90 days.",
      "citationRequired": true,
      "supportingSources": [
        {
          "documentId": "plans-policy",
          "documentRevision": "2026-07-12",
          "requiredText": "Team plan: 90 days"
        }
      ]
    }
  ],
  "criticality": "high",
  "slice": "plan-limits"
}
\`\`\`

Include negative expectations. Some questions should be unanswerable from the available corpus. The correct behavior is to state the limitation rather than synthesize a confident answer with a nearby citation. Also include sources that mention the same entity but do not establish the requested fact. Those “near miss” documents are essential for detecting citation laundering.

| Fixture type | Purpose | Example mutation | Expected finding |
|---|---|---|---|
| Fully supported | Confirm normal evidence mapping | Exact policy statement | Full support |
| Missing citation | Test completeness | Remove marker from factual sentence | Uncited claim |
| Wrong neighboring span | Test precision | Point to preceding paragraph | No support |
| Partial support | Test compound claims | Source proves duration, not price | Partial support |
| Contradiction | Test directional reasoning | Source says disabled, answer says enabled | Contradicted |
| Stale revision | Test provenance | Cite last quarter’s policy | Invalid or stale source |
| Unanswerable | Test abstention | No relevant corpus evidence | Unsupported if answered confidently |

Gold cases should retain reviewer notes explaining why evidence is sufficient. When policy changes, create a new dataset revision. Do not overwrite the source revision and relabel historical test runs as though their evidence never existed.

## Extract claims with a reviewable intermediate format

Claim extraction can be rule-based, model-assisted, or hybrid. Whatever method you choose, persist the extracted claims and their character spans in the answer. Otherwise a failed score offers no clue about what the evaluator considered a claim.

Start with a typed intermediate structure:

\`\`\`ts
export interface AnswerClaim {
  claimId: string;
  text: string;
  start: number;
  end: number;
  citationIds: string[];
  verifiable: boolean;
}

export function validateClaimSpans(answer: string, claims: AnswerClaim[]): string[] {
  const errors: string[] = [];
  for (const claim of claims) {
    if (claim.start < 0 || claim.end > answer.length || claim.start >= claim.end) {
      errors.push(claim.claimId + ': invalid span');
      continue;
    }
    if (answer.slice(claim.start, claim.end) !== claim.text) {
      errors.push(claim.claimId + ': span does not match text');
    }
  }
  return errors;
}
\`\`\`

Treat extraction failures separately from citation failures. If a model-assisted extractor silently omits the riskiest sentence, the answer can receive a perfect citation score. Build extractor fixtures for lists, tables, parenthetical claims, numerical ranges, negation, and sentences with multiple citation markers.

What people get wrong is asking one evaluator prompt to extract claims, decide support, assess source quality, and produce a final percentage in one response. That design is difficult to audit. A plausible score can survive even when the evaluator missed a claim. Decompose the process and validate every intermediate artifact.

Non-verifiable language also needs policy. “This approach is easy” may be opinion, while “setup takes five minutes” is a measurable claim. Mark opinions as non-verifiable rather than counting them as automatically supported. Safety recommendations and instructions should usually be treated as verifiable when authoritative evidence is expected.

## Resolve every citation before judging semantic support

Run deterministic integrity checks first. Verify that each citation ID exists, maps to one known source revision, refers to a chunk present in the recorded context when that is a product requirement, and opens the intended destination. A semantic judge should not waste tokens deciding whether an invented chunk ID is valid.

\`\`\`ts
export interface ResolutionResult {
  citationId: string;
  valid: boolean;
  reason?: string;
  chunk?: RetrievedChunk;
}

export function resolveCitations(answer: RagAnswer): ResolutionResult[] {
  const chunks = new Map(
    answer.promptChunks.map((chunk) => [
      chunk.documentId + ':' + chunk.documentRevision + ':' + chunk.chunkId,
      chunk
    ])
  );

  return answer.citations.map((citation) => {
    const key = citation.documentId + ':' + citation.documentRevision + ':' + citation.chunkId;
    const chunk = chunks.get(key);
    return chunk
      ? { citationId: citation.citationId, valid: true, chunk }
      : { citationId: citation.citationId, valid: false, reason: 'source not in prompt context' };
  });
}
\`\`\`

Whether a citation must point only to prompt context is a product contract. Some architectures allow a post-generation citation service to find support afterward. If yours does, record that path explicitly and score generation grounding separately from displayed citation accuracy. A post-hoc source may make the UI claim defensible, but it does not prove the generator used that evidence.

Check quoted spans literally after normalizing only what the renderer is allowed to change. Do not use permissive fuzzy matching that can attach a quote to the wrong repeated phrase. If the product displays paraphrased snippets, name them snippets rather than quotes and evaluate them semantically.

## Classify support with a four-way evidence label

Binary supported or unsupported labels discard valuable diagnosis. Use at least four classes:

| Support label | Meaning | Scoring treatment | Example |
|---|---|---|---|
| full | Evidence establishes the whole claim with required conditions | Full credit | Source states exact retention period and plan |
| partial | Evidence establishes only part of the claim | Reduced or zero credit by risk | Source proves period but not plan tier |
| none | Evidence is related but does not establish claim | No credit | Source describes audit logs generally |
| contradiction | Evidence conflicts with claim | Negative penalty and review | Source says 30 days, answer says 90 |

For each claim-citation pair, provide the claim, exact source text, surrounding context when required, and rubric. The evaluator should return a structured label plus the minimal evidence span. Keep unsupported external knowledge out of the judging prompt when the question is whether the provided source supports the claim.

\`\`\`ts
export type SupportLabel = 'full' | 'partial' | 'none' | 'contradiction';

export interface EvidenceDecision {
  claimId: string;
  citationId: string;
  label: SupportLabel;
  evidenceText: string;
  rationale: string;
}

export function supportCredit(label: SupportLabel): number {
  if (label === 'full') return 1;
  if (label === 'partial') return 0.4;
  if (label === 'contradiction') return -1;
  return 0;
}
\`\`\`

The 0.4 partial credit is an example policy, not a standard. A medical or security answer may grant no credit for partial evidence because omitted qualifiers create danger. A low-risk summary may reasonably distinguish partial from absent support. Declare the policy before comparing systems.

Calibrate model-assisted evidence decisions against human-adjudicated claim pairs. Include lexical traps where claim and source share words but differ in negation, dates, units, plan names, or scope. High overlap is not entailment.

## Calculate precision, completeness, and a misleading-citation penalty

Citation precision asks how many attached citations support their claims. Citation completeness asks how many citation-required claims have at least one supporting citation. They must remain separate. A system that cites only one easy claim can have perfect precision and terrible completeness.

\`\`\`ts
interface ScoredClaim {
  claimId: string;
  citationRequired: boolean;
  decisions: EvidenceDecision[];
}

export function citationPrecision(claims: ScoredClaim[]): number {
  const decisions = claims.flatMap((claim) => claim.decisions);
  if (decisions.length === 0) return 0;
  const supporting = decisions.filter((item) => item.label === 'full').length;
  return supporting / decisions.length;
}

export function citationCompleteness(claims: ScoredClaim[]): number {
  const required = claims.filter((claim) => claim.citationRequired);
  if (required.length === 0) return 1;
  const covered = required.filter((claim) =>
    claim.decisions.some((item) => item.label === 'full')
  ).length;
  return covered / required.length;
}

export function contradictionCount(claims: ScoredClaim[]): number {
  return claims.flatMap((claim) => claim.decisions)
    .filter((item) => item.label === 'contradiction').length;
}
\`\`\`

Also report invalid citation rate, stale citation rate, and citation density. Density is descriptive, not a target. More citations can reduce usability and allow a system to shotgun several sources at a claim, hoping one appears relevant. A sensible scorer can cap credit at one fully supporting citation per claim while still penalizing every misleading citation attached to it.

| Metric | Numerator | Denominator | Release interpretation |
|---|---|---|---|
| Citation precision | Fully supporting claim-citation pairs | All resolved claim-citation pairs | Are displayed citations trustworthy? |
| Citation completeness | Required claims with full support | All citation-required claims | Is factual coverage sufficiently cited? |
| Invalid rate | Unresolvable citation references | All displayed citations | Does citation plumbing work? |
| Contradiction rate | Contradicting evidence decisions | All evaluated pairs | Are citations actively misleading? |
| Stale-source rate | Disallowed source revisions | All resolved citations | Is provenance current? |

Do not average a contradiction away. A single misleading citation on a critical claim can be a release blocker even when hundreds of routine claims pass. Apply severity at claim level and aggregate by criticality.

## Distinguish retrieval failure from generation failure

When an answer lacks support, ask whether supporting evidence was available. This creates three actionable categories:

1. The corpus contains support, but retrieval did not return it. Investigate indexing, filters, query rewriting, or ranking.
2. Prompt context contains support, but the answer ignores or misstates it. Investigate generation instructions and context usage.
3. The answer is correct and context contains support, but citation mapping points elsewhere. Investigate attribution and rendering.

An evaluator can encode this attribution without using provider-specific APIs.

\`\`\`ts
export type FailureOwner =
  | 'none'
  | 'corpus'
  | 'retrieval'
  | 'generation'
  | 'citation-mapping';

export function assignFailureOwner(input: {
  corpusHasSupport: boolean;
  promptHasSupport: boolean;
  answerClaimCorrect: boolean;
  displayedCitationSupports: boolean;
}): FailureOwner {
  if (!input.corpusHasSupport) return 'corpus';
  if (!input.promptHasSupport) return 'retrieval';
  if (!input.answerClaimCorrect) return 'generation';
  if (!input.displayedCitationSupports) return 'citation-mapping';
  return 'none';
}
\`\`\`

This attribution prevents a common waste pattern: tuning retrieval when the correct chunk was already in the prompt. It also makes ownership visible in test reports.

The broader [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) is useful when retrieval is one tool among many. In that architecture, preserve the tool call and result that supplied each claim’s evidence. Final-answer citation scoring should be complemented by trace tests that verify the agent did not cite data from an unrelated step.

## Attack the scorer with realistic citation failure modes

Before trusting the metric, test the test. Create controlled answer mutations and confirm the score reacts in the expected direction. Useful mutations include changing a number, swapping a plan name, removing a qualifier, reversing a comparison, moving a citation marker to the next sentence, and attaching several irrelevant sources.

A realistic incident illustrates the need. A policy assistant says, “Exports are retained for 30 days [2].” Citation 2 opens the correct retention policy, but the cited chunk says audit logs are retained for 30 days. The word overlap is high, the duration matches, and the domain is related. A naive similarity scorer passes it. Claim-level entailment should fail because the subject is exports, not audit logs.

Diagnose such a failure in this order:

1. Inspect the parsed claim and marker attachment. Confirm the evaluator associated [2] with the correct sentence.
2. Resolve source revision and chunk. Rule out a broken or stale ID.
3. Compare entities, quantities, units, negation, conditions, and effective dates.
4. Check whether a different retrieved chunk actually supported the claim.
5. Replay the evidence judge on an adversarial pair with the same lexical trap.
6. Add the case to the permanent calibration set.

Do not patch this only with a special string rule for “exports.” Add a general boundary fixture that tests subject identity, then verify it across several domains.

## Gate releases with slice-aware scorecards

A CI gate should output both a concise decision and inspectable claim records. Run a fast, deterministic subset on pull requests, then a broader semantic suite on scheduled builds or before promotion. Cache only inputs whose model, prompt, rubric, source revision, and evaluator revision are identical.

\`\`\`yaml
name: rag-citation-evaluation

on:
  pull_request:
  workflow_dispatch:

jobs:
  citation-score:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run eval:citations
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: citation-evaluation
          path: artifacts/citation-evaluation
\`\`\`

Set different rules for critical slices. A documentation summarizer might require very high precision and zero contradictions for security configuration, while permitting a small completeness decline on low-risk release-note summaries. Report sample counts and confidence. One perfect example does not establish a slice.

| Gate decision | Precision | Completeness | Contradictions | Action |
|---|---:|---:|---:|---|
| Accept | Meets policy | Meets policy | None in critical claims | Promote with report |
| Investigate | Stable precision | Slight slice decline | None | Review changed cases |
| Reject mapping | Invalid references rise | Any | Any | Fix citation pipeline |
| Reject semantics | Precision falls | Any | Present | Fix evidence use or generation |
| Rebaseline dataset | Mixed | Mixed | Source policy changed | Adjudicate new corpus revision |

If sources are obtained through Model Context Protocol, the [MCP servers for test automation guide](/blog/mcp-servers-test-automation-2026) can help test tool schemas, result handling, and error paths independently. A malformed tool result should not be mislabeled as an unsupported model claim if the evidence transport failed first.

Version every part of the evaluation: corpus snapshot, chunker, retrieval settings, answer generator, claim extractor, evidence judge, rubric, and scorer. When a score moves, the run manifest should reveal which dimension changed. That discipline turns a percentage into engineering evidence.

Make the CI artifact useful without opening a notebook. Include a summary JSON file, a claim-level JSONL file, and a human-readable markdown report. The summary should list every denominator, threshold, corpus revision, and evaluator revision. Each claim row should retain its answer offset, attached citation IDs, resolved chunk digests, support label, importance, and failure owner. Sort the markdown report by severity, then by case and claim identity, so the first screen shows contradictions and invalid references rather than hundreds of passes.

For a candidate-versus-baseline comparison, join on stable case and claim IDs. Show newly supported claims, newly unsupported claims, changed citation targets, and cases that could not be paired because claim segmentation changed. Do not present unmatched records as score improvement. A claim extractor revision may split one sentence into two claims and change the denominator while answer quality stays identical. Re-score stored answers with both extractor versions or adjudicate the unmatched cases before approving the new measurement pipeline.

## Frequently Asked Questions

### Is citation faithfulness the same as citation accuracy?

The terms are sometimes used differently across tools, so define them in your project. A useful convention is that citation accuracy measures whether the cited evidence supports the attached claim, while faithfulness measures whether generated claims stay within supplied context more broadly. Under that convention, an answer can be faithful to prompt context but display the wrong citation marker. Publish the exact numerator, denominator, and support labels behind every metric so teams compare behavior rather than metric names.

### Should every sentence in a RAG answer have a citation?

No. Require citations for externally verifiable factual claims, quoted material, numerical statements, policies, and important instructions. Greetings, transitions, clearly marked opinion, and text that merely restates the user’s input may not need one. Define the policy by claim type and risk. Over-citation makes answers difficult to read and encourages citation shotgun behavior. Completeness should therefore use citation-required claims as its denominator, not every sentence or every extracted fragment.

### Can lexical similarity validate citation support cheaply?

Similarity is useful for candidate selection and anomaly detection, but it cannot reliably prove support. A claim and source can share nearly every word while differing in negation, entity, date, unit, or condition. Use deterministic checks for identifiers and spans, then an entailment-oriented classifier or calibrated judge for semantic support. Keep adversarial lexical traps in the gold set. For high-risk claims, sample automated decisions for expert review even when the aggregate metric looks strong.

### How should unanswerable questions affect citation scoring?

Create explicit unanswerable fixtures and define the expected abstention. If the system clearly says the provided sources do not establish an answer, it should not be penalized for missing citations to a nonexistent fact. If it confidently invents an answer and adds a related citation, count that as unsupported and potentially misleading. Score abstention quality separately from ordinary completeness so a system cannot improve citation metrics simply by refusing every difficult question.
`,
};
