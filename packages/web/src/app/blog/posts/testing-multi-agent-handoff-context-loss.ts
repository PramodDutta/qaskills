import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing Context Loss During Multi-Agent Handoffs",
  description:
    "Test multi-agent handoff context loss with constraint canaries, evidence lineage, mutation cases, and executable assertions that expose silent delegation gaps.",
  date: "2026-07-13",
  category: "AI Testing",
  content: `
# Testing Context Loss During Multi-Agent Handoffs

The researcher found that the refund policy applies only to annual plans purchased after March 1. The writer received “summarize the refund policy” and produced a polished answer for every customer. Nothing crashed, no tool failed, and the final prose was fluent. The defect was a lost qualifier at the agent boundary.

Multi-agent systems compress, route, and reinterpret state whenever work changes hands. A coordinator may send only the latest user message. A delegation tool may truncate long evidence. A specialist may return conclusions without citations. The next agent may preserve a fact but drop its scope, uncertainty, or prohibition. Conventional success metrics often miss these errors because the workflow completes and the answer remains plausible.

Testing handoff context loss requires observable contracts for the transfer itself. The suite needs to know which constraints and evidence items must cross a boundary, which should remain private, and how downstream output must cite or honor them. It also needs negative cases that remove one element at a time, because a happy-path transcript cannot show whether safeguards detect omissions.

## Treat the handoff as a versioned data boundary

A handoff should not be an unstructured prompt assembled from conversation fragments. Model it as a message with explicit fields. The exact schema depends on the system, but a useful envelope distinguishes assignment, constraints, evidence, decisions, unresolved questions, and provenance.

| Handoff field | Example | Loss consequence |
|---|---|---|
| Objective | Compare two enterprise plans | Receiver optimizes for the wrong deliverable |
| Hard constraints | Do not expose customer names | Privacy boundary is violated |
| Scope qualifiers | Applies only after 2026-03-01 | Correct fact becomes a false universal claim |
| Evidence references | Policy document, paragraph 18 | Downstream claim cannot be audited |
| Prior decisions | Use net price, not list price | Work is recomputed inconsistently |
| Open questions | Regional tax treatment unknown | Uncertainty is silently converted to certainty |
| Output contract | Return JSON matching schema v3 | Orchestrator cannot consume the response |

Version the envelope when independent services or agent runtimes exchange it. A schema validates shape, but semantic assertions must still verify that a summary preserves meaning. A required \`constraints\` array can be present and empty.

The boundary has two directions. The delegating agent must transmit sufficient context, and the receiving agent must demonstrate that it used the context. Testing only the final response collapses those failure locations together. Capture the exact handoff payload and the receiver's result as first-class test artifacts.

## Create constraint canaries that are hard to satisfy accidentally

A constraint canary is a synthetic, traceable requirement inserted into a scenario so the test can tell whether it survived. “Be accurate” is a poor canary because almost any answer appears to comply. “Quote no customer identifier, use EUR, and label estimates as estimates” creates observable conditions.

Good canaries vary by type:

- a prohibition, such as never include the internal codename \`MANGO-17\`;
- a formatting requirement, such as return three fields with a specific schema version;
- a scope condition, such as the exception applies only to German accounts;
- an evidence obligation, such as claim C7 must reference source S2;
- an uncertainty marker, such as delivery time is unverified and must not be stated as fact.

Do not rely on exact phrase matching for every canary. A receiving agent can preserve meaning through paraphrase. Use deterministic checks for structured fields, forbidden strings, identifiers, numbers, and citations. Use a rubric or human review for semantic qualifiers, with adversarial examples to calibrate it.

Canaries must resemble real production constraints. A bright nonsense token detects truncation but may receive unusual attention from a model. Combine it with ordinary domain requirements so the test does not optimize for an artificial marker alone.

## Capture lineage, not just the final answer

Instrument every delegation event with stable identifiers. A trace should connect the originating user requirement to a handoff field, the receiving agent's acknowledgement, tool evidence, and final claim. This is not hidden chain-of-thought collection. It is application-level provenance: inputs, outputs, citations, decisions, and state transitions your system already owns.

One workable trace model is:

\`\`\`py
from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class Constraint:
    id: str
    text: str
    kind: Literal['required', 'forbidden', 'qualified', 'uncertain']
    source_id: str


@dataclass(frozen=True)
class Evidence:
    id: str
    source_uri: str
    excerpt_hash: str
    supports_claims: tuple[str, ...]


@dataclass
class Handoff:
    trace_id: str
    sender: str
    receiver: str
    objective: str
    constraints: list[Constraint] = field(default_factory=list)
    evidence: list[Evidence] = field(default_factory=list)
    open_questions: list[str] = field(default_factory=list)
    schema_version: str = '1.0'


def validate_lineage(handoff: Handoff, required_ids: set[str]) -> list[str]:
    present = {constraint.id for constraint in handoff.constraints}
    return sorted(required_ids - present)
\`\`\`

This code is intentionally deterministic. It can prove that required IDs reached the envelope. It cannot prove the receiver understood them. The next layer evaluates use.

Hashing an evidence excerpt can detect mutation without duplicating sensitive content in telemetry. Keep the underlying source in an access-controlled store and record the retrieval version. A URL alone may later resolve to changed content.

## Write a handoff contract test around a real workflow

Choose a scenario where losing one qualifier creates a clearly wrong result. Suppose a triage agent delegates a support response. The case record says expedited replacement is available only for devices under warranty, and the customer is out of warranty. The handoff must carry the eligibility condition and evidence ID.

A test harness can substitute deterministic agent doubles at the outer edges while exercising the real coordinator and serialization layer. The sender double returns a known delegation plan. The receiver double records its input and produces output based on what it received. This isolates context plumbing from model variance.

\`\`\`py
import pytest


@pytest.mark.asyncio
async def test_warranty_qualifier_reaches_support_writer(orchestrator, recording_writer):
    case = {
        'customer_id': 'synthetic-42',
        'purchase_date': '2024-01-10',
        'warranty_end': '2025-01-10',
        'request': 'Send an expedited replacement',
    }
    policy = {
        'source_id': 'replacement-policy-v5',
        'rule_id': 'R-EXPEDITED-1',
        'text': 'Expedited replacement is available only while warranty is active.',
    }

    result = await orchestrator.handle(case=case, policy=policy, writer=recording_writer)

    handoff = recording_writer.received_handoffs[0]
    assert handoff.objective == 'Draft the eligibility response'
    assert {item.id for item in handoff.constraints} >= {'R-EXPEDITED-1'}
    assert {item.id for item in handoff.evidence} >= {'replacement-policy-v5'}
    assert result.decision == 'not_eligible'
    assert 'expedited replacement approved' not in result.message.lower()
    assert result.citations == ['replacement-policy-v5']
\`\`\`

This is executable only when paired with the application's \`orchestrator\` and recording test double, as a normal integration test would be. It uses pytest's real async marker and ordinary assertions, not a fictional agent-testing API.

Run a second suite with the actual receiver model. Keep the handoff fixed, sample multiple runs, and score constraint adherence plus citation correctness. The deterministic plumbing test tells you whether context arrived. The model evaluation tells you whether the agent used it reliably.

## Delete, distort, and reorder the handoff

Mutation testing is unusually effective here. Start with a passing handoff, then systematically damage it. The system should reject an invalid envelope, request clarification, lower confidence, or produce an output that the evaluator flags. If every mutation still “passes,” the checks are not sensitive to context loss.

| Mutation | Example | Expected defense |
|---|---|---|
| Delete a hard constraint | Remove “no customer identifiers” | Schema policy or output scan blocks unsafe result |
| Drop source linkage | Keep conclusion, remove evidence ID | Receiver requests evidence or final gate rejects uncited claim |
| Weaken a qualifier | “only active warranties” becomes “warranties” | Semantic evaluator marks scope expansion |
| Change a numeric boundary | 30 days becomes 90 days | Exact fact check detects mismatch |
| Reorder instructions | Put untrusted source text after policy | Instruction precedence remains unchanged |
| Truncate open questions | Remove tax uncertainty | Output must not claim a verified tax total |

The mutation generator should operate on structured fields where possible. Randomly deleting words from prose creates many meaningless cases and makes failures hard to diagnose. Domain-aware changes produce useful counterexamples.

An important negative case is an empty but valid envelope. If the receiver proceeds confidently despite missing mandatory policy evidence, the workflow needs a completeness gate. Required-field validation alone will not catch arrays that contain irrelevant evidence.

## Measure preservation at several checkpoints

A binary final score hides where degradation occurs. Measure the state after each transformation: conversation to coordinator state, coordinator state to delegation payload, payload to receiver working context, receiver result to final synthesis.

Define metrics as evaluation counts, not invented quality percentages. For a test set of known obligations, calculate:

- constraint recall: required obligations present after a checkpoint divided by obligations that should be present;
- evidence precision: cited evidence that actually supports the claim divided by all evidence cited;
- qualifier preservation: scoped rules whose scope remains semantically equivalent;
- unsupported-claim count: material claims with no traceable source;
- forbidden-content violations: deterministic matches for secrets, identifiers, or banned actions.

Report the numerator and denominator. “18 of 20 scope qualifiers preserved” is auditable. A context-retention score of 90 without a rubric is not.

These measures have different failure costs. One lost safety prohibition may outweigh five missing stylistic preferences. Apply severity based on domain risk rather than averaging every requirement into a reassuring score.

## Evaluate semantic loss without trusting one judge

Some obligations can be checked exactly. Others require semantic comparison. An LLM judge can assess whether “only active warranties” survived a paraphrase, but the judge is itself nondeterministic and can share the tested model's biases.

Build a rubric with explicit labels:

| Label | Qualification outcome | Example transformation |
|---|---|---|
| Preserved | Same population and condition | “available while coverage remains active” |
| Narrowed | Excludes eligible cases | “available in the first six months” |
| Expanded | Includes ineligible cases | “available for warranty customers” |
| Contradicted | Reverses the rule | “available only after warranty expires” |
| Omitted | No eligibility condition appears | “we can ship a replacement” |

Calibrate the rubric against human-labeled examples, including subtle scope changes. Run more than one judgment or adjudicate disagreements for high-risk releases. Do not ask a judge merely “is this good?” Provide the source obligation, handoff, downstream output, and category definitions.

Keep deterministic security checks outside the judge. A model should not decide whether a literal API key pattern or customer ID appeared. Likewise, numeric thresholds and citation IDs are better compared programmatically.

## Test budget pressure and truncation deliberately

Context loss often appears only when the handoff approaches a token or message-size limit. Construct boundary cases with realistic evidence items and put a critical constraint at the beginning, middle, and end. Verify that prioritization is intentional.

If the system summarizes before delegating, test the summary function independently. It should preserve hard constraints and unresolved uncertainties ahead of background narrative. An overflow policy should fail closed or fetch evidence on demand, not silently cut the final bytes.

Use sizes relative to the actual configured limit rather than model folklore:

1. comfortably below the handoff budget;
2. exactly at the application's calculated boundary;
3. one item beyond the boundary;
4. a single evidence item larger than the allowed payload;
5. many small items whose metadata overhead crosses the limit.

Inspect serialized bytes or tokenizer results using the production calculation. Counting characters in a test when production counts model tokens validates the wrong boundary.

Long-context tests should also include distractors. A receiver may get every required constraint yet focus on a recent irrelevant note. Place credible but lower-priority evidence near the delegation instruction and assert policy precedence.

## Preserve evidence meaning, not unlimited source text

Sending entire documents to every specialist is expensive and can widen privacy exposure. Context completeness does not mean context maximalism. The handoff should include the minimum sufficient evidence or a durable reference the receiver is authorized to retrieve.

Test reference resolution separately. A valid evidence ID must map to the expected version, tenant, and access policy. If a worker lacks permission, it should return a typed missing-evidence outcome rather than guessing from the title.

Evidence lineage should distinguish:

- direct source facts;
- sender inferences;
- receiver inferences;
- user-provided claims not independently verified;
- tool outputs with retrieval time and version.

When a sender compresses “source says X, therefore likely Y” into “Y,” uncertainty disappears. Require conclusion fields to retain confidence and supporting IDs where the domain needs them.

The [multi-agent handoff testing guide](/blog/multi-agent-handoff-testing-guide) provides wider coverage of routing, retries, and responsibility boundaries. For orchestration-level failure modes beyond context transfer, use the [multi-agent system testing guide](/blog/multi-agent-system-testing-guide-2026).

## Check confidentiality in the opposite direction

Handoff tests must also catch too much context. A billing specialist may need plan tier and invoice status, not private support notes. A coding worker may need a redacted error trace, not the production access token embedded in it.

Define allowlisted context by agent role and purpose. Then inject synthetic secrets and cross-tenant records upstream. Assert they are absent from both the handoff payload and downstream tool arguments. Redaction after the receiving agent has already seen the data is too late.

| Receiver role | Necessary context | Data that should stay behind |
|---|---|---|
| Refund policy analyst | Plan, purchase date, policy version | Customer's unrelated support history |
| Response writer | Decision, rationale, approved display name | Raw internal risk score |
| SQL specialist | Schema subset and sanitized query goal | Production credentials |
| External browsing worker | Public research question | Private document excerpts |

Completeness and minimization are paired requirements. A system that fixes context loss by broadcasting the entire conversation can create a more serious isolation defect.

## Reproduce and triage a failed handoff

Store enough application-level trace data to replay the boundary safely: envelope version, agent and model configuration, retrieval identifiers, tool results, routing decisions, and deterministic seeds where supported. Redact secrets before persistence and apply retention limits.

When a failure occurs, compare checkpoints rather than rereading only the final response:

1. Was the obligation present in coordinator state?
2. Did the serialized handoff contain it after size enforcement?
3. Did the receiver acknowledge or cite it?
4. Did a later synthesizer overwrite it?
5. Did the output guard detect the resulting violation?

This sequence assigns the defect to a transformation. Without it, teams often “improve the prompt” even when a transport field was dropped before the prompt existed.

Regression fixtures should preserve the smallest scenario that demonstrates the loss. Replace customer content with synthetic equivalents, retain the structural position and competing instructions, and record why the obligation is material. Exact transcript replay can drift as models change, so assert semantic contracts rather than identical prose.

## Release gates for handoff reliability

Run deterministic schema, routing, and redaction tests on every change. Run sampled model evaluations on changes to prompts, models, context budgeting, summarization, retrieval, or orchestration. Keep a smaller critical set for pull requests and a broader adversarial set for scheduled evaluation.

A release gate should show failures by obligation class. Ten cosmetic formatting misses should not hide one authorization constraint loss. Trend raw counts and denominators across the same versioned corpus, then review changed cases rather than relying only on an aggregate.

Production monitoring can detect missing citations, rejected envelopes, context truncation, and downstream clarification requests. It cannot safely label every real answer without privacy and review controls. Feed sanitized, adjudicated incidents back into the regression set.

Most importantly, test the fallback. When required context is absent, the best behavior is often to stop, ask the coordinator for evidence, or return \`incomplete_context\`. Fluency under uncertainty is not resilience.

## Frequently Asked Questions

### How can a test tell whether a downstream agent understood a constraint?

First verify the constraint exists in the captured handoff. Then evaluate observable use: required decisions, forbidden actions, scope qualifiers, citations, and structured acknowledgements. Use deterministic assertions where possible and a calibrated semantic rubric for paraphrased meaning.

### Should every prior message be copied into each delegation?

No. Transfer the minimum sufficient, authorized context plus retrievable evidence references. Broadcasting the full transcript increases cost, distractors, prompt-injection exposure, and cross-role data leakage.

### What is the best negative case for context loss?

Remove one material qualifier or evidence link from an otherwise valid handoff and require the system to reject, clarify, or be flagged by evaluation. The mutation should change the correct outcome, not merely alter wording.

### Can an LLM judge reliably score handoff preservation?

It can help with semantic qualifiers after calibration, but it should not be the only oracle. Pair it with exact checks, human-labeled examples, repeated or adjudicated judgments, and separate security rules.

### Where should handoff traces be stored?

Use an access-controlled observability store with redaction, tenant isolation, versioned evidence references, and defined retention. Store application provenance, not hidden model reasoning, and avoid duplicating raw sensitive source material when hashes or IDs suffice.
`,
};
