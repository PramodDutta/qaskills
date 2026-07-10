import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Hallucination Detection Pipeline Guide',
  description:
    'Hallucination detection pipeline guide for building groundedness checks, source verification, and triage loops that reduce unsupported AI answers.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# Hallucination Detection Pipeline Guide

The answer cites a policy that does not contain the sentence. The summary names a feature that was removed last quarter. The model sounds certain, the UI looks polished, and the only visible clue is a source link that jumps to an unrelated paragraph. That is the failure a hallucination detection pipeline is supposed to catch before users do.

Hallucination testing is not one assertion. It is a pipeline that gathers evidence, checks whether claims are supported, labels failures for review, and feeds patterns back into prompts, retrieval, or product constraints. The pipeline has to be strict enough to find unsupported content and practical enough that reviewers can act on the results.

This guide covers source-grounded product QA: RAG answers, support assistants, internal knowledge bots, summarizers, and agent responses that cite documents. For retrieval-specific checks, connect this to [the RAG groundedness testing guide](/blog/rag-groundedness-testing-guide-2026). For scoring choices and evaluator terminology, [the LLM output evaluation metrics explainer](/blog/llm-output-evaluation-metrics-explained-2026) provides the metric layer.

## Define hallucination in terms your product can enforce

The word hallucination is too broad for a test plan. A support bot inventing a refund policy, a summarizer omitting a risk, and an agent using a stale tool result are different failures. Start by defining detectable categories.

| Failure label | Observable symptom | Example product risk |
|---|---|---|
| Unsupported claim | Answer states something absent from cited sources | User follows nonexistent policy |
| Contradicted claim | Answer conflicts with source text | Wrong eligibility or pricing advice |
| Citation mismatch | Citation points to irrelevant source chunk | Reviewers cannot verify answer |
| Stale claim | Answer uses old content when newer source exists | Outdated procedure in production |
| Overconfident uncertainty | Answer should abstain but asserts | Bad guidance under missing evidence |

Each label should map to an action. Unsupported claims may trigger prompt changes or stricter citation requirements. Citation mismatches may indicate retriever chunking problems. Stale claims may require index freshness monitoring. If a label has no owner or action, it will become dashboard decoration.

## Split answers into checkable claims

Groundedness cannot be measured well against a full paragraph blob. Break the answer into claims that can be checked independently. A claim is a sentence or clause that makes a factual assertion about the source material. Not every sentence needs checking. Greetings, caveats, and navigation text may be ignored.

The claim extractor can be model-based, rule-based, or hybrid. For high-risk products, keep the extraction visible so reviewers can inspect what the pipeline judged. A failure to extract the important claim is itself a pipeline bug.

\`\`\`ts
// src/eval/claim-extractor.ts
export type Claim = {
  id: string;
  text: string;
};

export function extractSimpleClaims(answer: string): Claim[] {
  return answer
    .split(/(?<=[.!?])\\s+/)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .filter((text) => !/^I (can|cannot|am unable to)\\b/i.test(text))
    .map((text, index) => ({
      id: 'claim-' + String(index + 1).padStart(2, '0'),
      text,
    }));
}

export function requiresCitation(claim: Claim) {
  return /\\b(must|should|required|supports|costs|available|expires|policy)\\b/i.test(
    claim.text,
  );
}
\`\`\`

This simple extractor is not enough for every product, but it is runnable and testable. It also shows a useful principle: claim selection should be explicit. If every sentence is scored equally, your pipeline may waste attention on filler while missing the one risky assertion.

## Verify citation coverage before semantic scoring

Before asking whether a source supports a claim, check that the answer actually cites sources in the required places. A claim with no citation in a product that promises citations is an immediate failure. A citation id that does not exist in the retrieved context is also an immediate failure.

This kind of structural check is cheap, deterministic, and catches many defects that model-based graders would obscure.

\`\`\`ts
// src/eval/citation-check.ts
export type SourceChunk = {
  id: string;
  title: string;
  text: string;
};

export type CitationCheck = {
  claimId: string;
  missingCitation: boolean;
  unknownCitationIds: string[];
};

export function extractCitationIds(text: string) {
  const matches = text.matchAll(/\\[source:([A-Za-z0-9_-]+)\\]/g);
  return Array.from(matches, (match) => match[1]);
}

export function checkClaimCitations(
  claims: { id: string; text: string }[],
  sources: SourceChunk[],
): CitationCheck[] {
  const sourceIds = new Set(sources.map((source) => source.id));

  return claims.map((claim) => {
    const citationIds = extractCitationIds(claim.text);

    return {
      claimId: claim.id,
      missingCitation: citationIds.length === 0,
      unknownCitationIds: citationIds.filter((id) => !sourceIds.has(id)),
    };
  });
}
\`\`\`

If your product uses inline links instead of source ids, adapt the parser. The important behavior remains the same: claims that need evidence must point to evidence the system actually retrieved.

## Groundedness scoring with source snippets

After structural checks, evaluate whether each cited source supports the claim. There are several ways to do this. Lexical overlap is fast but shallow. Natural language inference models can classify entailment and contradiction. LLM judges can reason over messy text but need calibration and audit logs. Human review is slow but necessary for high-risk samples.

| Method | Strength | Weakness | Good use |
|---|---|---|---|
| Exact phrase check | Deterministic and cheap | Misses paraphrases | Policy names, IDs, quoted requirements |
| Token overlap | Fast ranking signal | Easy to fool with related words | Triage before deeper grading |
| NLI classifier | Explicit entailment categories | Domain drift and context length limits | Claim support classification |
| LLM evaluator | Handles nuanced prose | Needs prompt/version control | Review queue prioritization |
| Human adjudication | Highest trust for edge cases | Expensive and slow | Calibration and release gates |

Do not start with an all-knowing grader. Build a layered pipeline where deterministic failures are caught first, then semantic scoring handles the ambiguous cases. This keeps cost and reviewer load under control.

## Triage records that reviewers can use

A hallucination finding should be reviewable without replaying the whole system. Store the prompt or task id, answer text, extracted claims, retrieved sources, citation checks, semantic scores, model and retriever versions, and final label. If the answer came from an agent, include tool outputs used in the answer.

The record should answer three questions quickly:

1. What claim is suspicious?
2. What evidence did the model cite or fail to cite?
3. Which system component likely caused it?

Without that, the evaluation pipeline becomes a scoreboard. Teams need diagnosis. A citation mismatch often points to chunking or UI source mapping. A contradicted claim may point to stale index data. An unsupported but plausible claim may point to a prompt that rewards completeness over abstention.

## Building a small deterministic gate

A practical first gate can run in CI against curated fixtures. Each fixture contains a user question, retrieved source chunks, a candidate answer, and expected labels. This does not replace live monitoring, but it prevents regressions in prompt templates and citation formatting.

\`\`\`ts
// test/hallucination-gate.test.ts
import { describe, expect, it } from 'vitest';
import { checkClaimCitations } from '../src/eval/citation-check';
import { extractSimpleClaims, requiresCitation } from '../src/eval/claim-extractor';

describe('hallucination detection gate', () => {
  it('flags policy claims that do not cite retrieved sources', () => {
    const sources = [
      {
        id: 'refunds',
        title: 'Refund policy',
        text: 'Annual plans can be refunded within 14 days of purchase.',
      },
    ];

    const answer =
      'Annual plans must be refunded within 14 days. Enterprise plans should include a dedicated QA manager.';

    const claims = extractSimpleClaims(answer).filter(requiresCitation);
    const citationChecks = checkClaimCitations(claims, sources);

    expect(citationChecks).toEqual([
      {
        claimId: 'claim-01',
        missingCitation: true,
        unknownCitationIds: [],
      },
      {
        claimId: 'claim-02',
        missingCitation: true,
        unknownCitationIds: [],
      },
    ]);
  });
});
\`\`\`

This test intentionally fails both factual sentences because neither cites evidence. A production pipeline would go further and check whether the first claim is supportable by the refund source while the second is unsupported. The deterministic gate still catches a major product rule: cited answers must cite.

## Sampling production without leaking data

Production sampling is essential because curated fixtures age quickly. Real users ask messy questions, retrieval returns odd chunks, and model updates change behavior. Sample responsibly. Redact personal data, control access to evaluation records, and avoid sending sensitive content to external graders unless your compliance model permits it.

Use stratified sampling instead of pure random sampling. Include high-traffic intents, low-confidence retrieval, answers with many citations, answers with no citations, fresh documents, and escalations. Track rates by category, not just a single hallucination percentage. A single number hides the difference between citation formatting bugs and dangerous unsupported claims.

## Feedback loops that actually reduce hallucinations

Finding hallucinations is only useful if the system changes. The feedback loop should connect labels to fixes:

| Dominant finding | Likely fix |
|---|---|
| Missing citations on factual claims | Prompt rule, response schema, or generation constraint |
| Citations point to wrong chunks | Source mapping, chunk ids, reranker behavior |
| Claims contradicted by newer docs | Index freshness and document version priority |
| Correct source retrieved but answer invents detail | Stricter answer synthesis, abstention rule |
| No relevant source retrieved | Retriever query rewriting or corpus coverage |

Review a batch, pick the leading failure mode, change one system component, then rerun the same evaluation set. Multiple simultaneous changes make it hard to know what helped.

## Release gates and thresholds

Avoid universal thresholds without context. A consumer medical support product and an internal release-note summarizer do not need the same release gate. Define thresholds per risk tier. For high-risk workflows, any critical unsupported claim may block release. For lower-risk summarization, a trend increase may trigger investigation rather than a block.

Keep a golden evaluation set that is small enough to run often and important enough to matter. Refresh it when the product changes. Mark expected abstentions explicitly. A model that refuses to answer unsupported questions is often behaving correctly, even if a naive helpfulness metric dislikes it.

## Evaluating abstention without punishing safety

Hallucination pipelines often accidentally punish the behavior they need. If the source material does not contain an answer, the safest response may be an abstention: I do not have enough information in the provided sources. A grader that rewards completeness over evidence will mark that as unhelpful and push the model toward invention.

Create fixtures where the correct behavior is refusal or escalation. The source set should be intentionally insufficient. The expected label should distinguish unsupported answer from supported abstention. A supported abstention cites the absence of evidence or names the missing source requirement. An unsupported answer fills the gap with plausible detail.

Track abstention rate by intent. A rising abstention rate on well-documented topics may indicate retrieval failure. A low abstention rate on poorly documented topics may indicate hallucination risk. The metric is only meaningful when paired with source coverage and user intent.

## Source freshness as a first-class check

A response can be grounded in a source and still be wrong if the source is stale. This happens when old policy pages remain indexed, changelog entries outrank current docs, or the retriever does not prefer effective dates. Hallucination triage should include document version and freshness metadata, not just text snippets.

Add freshness checks for domains where content changes often: pricing, eligibility, release status, incident procedures, and legal terms. If an answer cites an archived source while a newer active source exists for the same topic, flag it separately from unsupported content. The fix may be indexing and ranking, not prompt wording.

Freshness metadata should be visible to reviewers. Show source updated_at, effective date when available, and whether the document is archived. If a reviewer cannot tell which source is current, the model cannot be expected to get it right consistently.

## Calibrating evaluator prompts and labels

If you use an LLM evaluator, treat its prompt like test code. Version it, review it, and run calibration sets when it changes. The evaluator should receive the claim, the cited source snippets, and clear label definitions. It should not receive the entire retrieval corpus if the task is to judge whether the cited evidence supports a claim.

Build a calibration set with human labels: supported, unsupported, contradicted, unclear, and not factual. Include hard examples where the source uses different wording, where the answer overstates a qualified source, and where a citation is relevant but incomplete. Measure agreement before trusting the evaluator in release gates.

Do not hide evaluator uncertainty. If the evaluator says unclear, route to review or a second-stage check. Forcing every ambiguous claim into supported or unsupported creates brittle metrics and unnecessary arguments with product teams.

## Testing agents that use tools

Agent hallucinations are not limited to retrieval text. An agent can call a tool, ignore the result, use a stale observation, or describe an action it did not take. The pipeline should capture tool calls and tool outputs as evidence. A claim such as the ticket was updated needs support from the ticketing tool response, not from a knowledge base paragraph.

For tool-using agents, define claim types by evidence source: document-grounded, tool-grounded, memory-grounded, and user-provided. Each source needs different verification. A tool-grounded claim can be checked against structured tool output. A user-provided claim may be acceptable if the answer clearly attributes it to the user. A memory-grounded claim may be disallowed for regulated workflows unless memory retrieval is auditable.

This distinction prevents a common false pass: the answer cites a document that explains how to update a ticket, but the claim says the ticket was updated. Procedure documentation does not prove action completion. The tool result does.

## Regression buckets for recurring failures

Once triage starts, recurring patterns will appear. Create regression buckets for those patterns and add one or two fixtures per bucket. Examples include citation id lost during streaming, answer combines two similar products, archived source outranks current source, and model states a tool action before receiving tool output.

The bucket name should describe the failure mechanism, not just the symptom. Source id lost during streaming points engineers to response assembly. Similar products merged points to retrieval or prompt disambiguation. Good bucket names turn a review queue into an engineering backlog.

Review the buckets monthly with engineering, support, and product. Remove buckets that no longer reproduce, split buckets that hide multiple mechanisms, and promote recurring high-risk buckets into release-gate fixtures. This keeps the pipeline connected to current product risk instead of preserving old evaluator folklore.

Tie each promoted bucket to an owner and a mitigation path, otherwise reviewers keep relabeling the same preventable failure every release.

## Frequently Asked Questions

### Can an LLM judge be the whole hallucination detector?

It can be one layer, but it should not be the whole pipeline. Deterministic citation checks, source id validation, freshness checks, and human calibration catch failures that an LLM judge may miss or inconsistently label.

### How do I test answers without citations?

Decide whether the product requires citations for factual claims. If it does, missing citations are a structural failure. If citations are optional, use groundedness scoring against retrieved context and track unsupported claims separately from citation formatting.

### What should reviewers see in a triage item?

Show the suspicious claim, the full answer, cited source snippets, retrieved but uncited sources, model version, retriever version, and the pipeline label. Reviewers should not need to reconstruct the answer from logs.

### How often should the evaluation set change?

Keep a stable core set for regression trends, then add rotating production samples for freshness. Replace examples that no longer match the product, but preserve enough history to compare releases meaningfully.

### Is low retrieval similarity the same as hallucination?

No. Low similarity is a retrieval signal. Hallucination is an unsupported or contradicted output claim. Low similarity may predict hallucination risk, but the final label should inspect the generated answer and the available evidence.
`,
};
