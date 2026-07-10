import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Synthetic Eval Data Generation Guide',
  description: 'Synthetic eval data generation guide for building realistic LLM, RAG, and agent test sets with schemas, coverage controls, review, and maintenance.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# Synthetic Eval Data Generation Guide

The eval fails because the agent cannot handle a refund exception nobody put in the dataset. The product team insists the case happens weekly. The logs are sensitive, production sampling is slow, and the release needs evidence tomorrow. Synthetic eval data is how you cover that gap without pretending fabricated examples are production truth.

Synthetic eval data is generated test material used to exercise LLM, RAG, or agent behavior. It might be a set of user questions, support tickets, tool-call tasks, documents with expected citations, adversarial prompts, or workflow transcripts. The value comes from targeted coverage and repeatability. The risk comes from generating polished but unrealistic data that teaches the eval to pass a fantasy version of the product.

For RAG-specific generation patterns, compare this with [synthetic data for LLM and RAG testing in 2026](/blog/synthetic-data-llm-rag-testing-2026). For curation and lifecycle management, connect it to [test datasets for AI agents guide 2026](/blog/test-datasets-for-ai-agents-guide-2026).

## Start with an eval contract, not a prompt

Before generating anything, define the behavior the dataset will judge. A synthetic customer message is only useful if you know which capability it exercises and how success will be scored. Otherwise the generator produces a pile of plausible text with no testing leverage.

| Eval target | Synthetic item should contain | Expected label or oracle |
|---|---|---|
| RAG answer grounding | Question plus source document ids | Required citation ids or unacceptable sources |
| Tool-using agent | User task plus available tool state | Expected tool sequence or final state |
| Classifier | Input text and edge condition | Category label and rationale |
| Safety refusal | Risky user request with context | Allowed or disallowed response class |
| Summarizer | Source document and user need | Required facts and forbidden hallucinations |

The eval contract also defines what synthetic data must not do. It must not include real personal data. It must not invent product policies. It must not generate labels that no reviewer can verify. It must not overrepresent easy cases just because they are easy to synthesize.

## A schema keeps generation honest

Schema-first generation is less glamorous than free-form prompting, but it is much easier to review. The following Python example uses Pydantic to define a RAG eval case and Faker to create harmless customer names. It does not call an LLM. It generates structured cases from controlled inputs, which is often enough for deterministic coverage expansion.

\`\`\`python
from faker import Faker
from pydantic import BaseModel, Field

fake = Faker()
Faker.seed(20260710)

class RagEvalCase(BaseModel):
    id: str
    question: str
    required_doc_ids: list[str] = Field(min_length=1)
    difficulty: str
    risk: str

POLICY_DOCS = {
    "refund-30-day": "Refunds are available within 30 days of purchase.",
    "refund-exception-medical": "Medical hardship refunds require support approval.",
    "plan-downgrade": "Downgrades take effect at the next billing cycle.",
}

def build_refund_exception_case(index: int) -> RagEvalCase:
    customer = fake.first_name()
    return RagEvalCase(
        id=f"refund-exception-{index}",
        question=(
            f"{customer} bought an annual plan 45 days ago and says a medical issue "
            "prevented use. Can support approve any refund exception?"
        ),
        required_doc_ids=["refund-exception-medical", "refund-30-day"],
        difficulty="edge",
        risk="policy_hallucination",
    )

cases = [build_refund_exception_case(i) for i in range(1, 6)]
print([case.model_dump() for case in cases])
\`\`\`

This kind of generator is not trying to be creative. It is making sure a known business edge appears with varied surface wording and traceable required documents. That traceability is what lets a reviewer approve the dataset.

## Use dimensions instead of random topic soup

Good synthetic sets are designed around dimensions: intent, risk, language, user persona, document type, workflow state, permission level, and expected tool. You do not need every combination. You need deliberate coverage of the combinations most likely to fail.

| Dimension | Example values | Why it matters |
|---|---|---|
| User intent | Ask, dispute, update, cancel, escalate | Agents often route by intent. |
| Knowledge source | Policy, invoice, runbook, account state | RAG systems fail differently by source type. |
| Risk class | Financial, privacy, safety, compliance | Review requirements differ by risk. |
| Workflow state | New, pending, approved, expired | Tool calls depend on state transitions. |
| Ambiguity | Direct, underspecified, conflicting | LLMs over-answer ambiguous requests. |

A coverage matrix makes generation reviewable. If every synthetic case is a friendly user asking a direct question, the eval will not catch permission confusion, stale retrieval, or tool misuse.

## LLM-assisted generation with validation gates

When you do use an LLM to draft cases, put validators around it. The model can propose scenarios, but code should enforce schema, allowed document ids, label vocabulary, and duplicate rules. Human review should focus on realism and oracle quality, not fixing malformed JSON all afternoon.

The next example shows a generator harness shape. It assumes you have an LLM function called \`draft_cases\` that returns JSON text. The important part is that generated cases are parsed, validated, deduplicated, and checked against known document ids before they enter the eval repository.

\`\`\`python
import json
from pydantic import BaseModel, ValidationError

ALLOWED_DOC_IDS = {"refund-30-day", "refund-exception-medical", "plan-downgrade"}
ALLOWED_RISKS = {"policy_hallucination", "wrong_tool", "privacy_leak"}

class AgentEvalCase(BaseModel):
    id: str
    user_message: str
    required_doc_ids: list[str]
    expected_action: str
    risk: str


def validate_generated_cases(raw_json: str) -> list[AgentEvalCase]:
    payload = json.loads(raw_json)
    cases: list[AgentEvalCase] = []
    seen_ids: set[str] = set()

    for item in payload:
        try:
            case = AgentEvalCase.model_validate(item)
        except ValidationError as error:
            raise AssertionError(f"Invalid generated case: {error}") from error

        if case.id in seen_ids:
            raise AssertionError(f"Duplicate synthetic case id: {case.id}")
        if not set(case.required_doc_ids).issubset(ALLOWED_DOC_IDS):
            raise AssertionError(f"Unknown doc id in {case.id}: {case.required_doc_ids}")
        if case.risk not in ALLOWED_RISKS:
            raise AssertionError(f"Unknown risk label in {case.id}: {case.risk}")

        seen_ids.add(case.id)
        cases.append(case)

    return cases
\`\`\`

Do not let the generator invent document ids and then treat those ids as ground truth. The oracle must be anchored in real product knowledge or a deliberately authored fixture.

## Review synthetic data like code

Synthetic eval cases need review because they become part of the release signal. A bad label can make the system look worse than it is. A fantasy scenario can waste engineering time. A leaked real name can create privacy risk.

| Review question | What to inspect | Reject when |
|---|---|---|
| Is the case realistic? | User wording, product state, domain facts | It describes behavior the product never supports. |
| Is the oracle checkable? | Expected docs, tool calls, labels | A reviewer cannot prove the expected answer. |
| Is the risk clear? | Failure mode and severity | The case only adds volume. |
| Is sensitive data synthetic? | Names, account ids, addresses, tickets | Any production personal data appears. |
| Is it non-duplicative? | Similarity to existing cases | It paraphrases an existing case without new coverage. |

Treat dataset pull requests like test code. Ask what bug the new cases would catch. Require stable ids. Require a short note when a case is derived from an incident, without copying private incident content.

## Mixing synthetic and production-derived examples

Synthetic data fills coverage gaps. Production-derived data keeps you honest. Use both, with different labels. Production samples reveal phrasing and messy context. Synthetic cases target edge combinations that logs may not capture often enough.

A balanced eval set might include anonymized high-frequency user questions, incident-derived regressions, synthetic edge cases, and adversarial safety probes. Do not collapse them into one undifferentiated score. Segment results so a release owner can see whether a model improved common support questions but regressed rare high-risk workflows.

If synthetic cases dominate the suite, the system may overfit to your imagined world. Rotate in reviewed production samples and retire synthetic cases that no longer represent product behavior.

## Versioning and traceability

Every generated case should have an id, source type, generation method, review status, and last reviewed date. If an LLM helped generate it, record the model and prompt version internally. You do not need that metadata in every runtime eval payload, but you need it for audit and maintenance.

When the product changes, update the dataset deliberately. A stale synthetic case about an old refund rule should fail the system until either the product still needs backward compatibility or the case is retired. Quietly editing expected labels to make a release pass destroys trust in the eval.

## Negative cases need the same care as positive cases

Synthetic datasets often overproduce successful tasks. The user asks a clear question, the answer is in one document, and the expected behavior is to respond. Real AI systems also need to refuse, clarify, escalate, or avoid tool calls. Negative cases exercise those choices.

A negative case is not a trick prompt for its own sake. It should represent a risk the product actually faces: a user asks for another customer's data, a support agent lacks permission to issue a refund, a RAG question cannot be answered from available documents, or an agent is asked to perform an irreversible action without confirmation.

| Negative case type | Expected behavior | Oracle shape |
|---|---|---|
| Missing source document | Say the answer is unavailable from provided knowledge | No fabricated citation, refusal or clarification label |
| Permission boundary | Decline action or request authorization | No restricted tool call |
| Ambiguous request | Ask a clarifying question | Clarification intent label |
| Unsafe instruction | Refuse or redirect according to policy | Safety category and allowed response class |
| Conflicting documents | Surface conflict instead of choosing silently | Required mention of conflict ids |

Negative cases are especially useful for agents because a wrong tool call can mutate state. If your eval only rewards completed actions, it may teach the system to act when it should pause.

## Synthetic data should model messy phrasing

Generated cases can become too polished. Users misspell product names, paste fragments, mix two requests, mention old terminology, or provide irrelevant context before the actual task. Add controlled messiness without turning every case into noise.

For example, a billing assistant dataset should include direct questions, emotional complaints, partial invoices, plan nicknames, old plan names, and messages where the answer is not in the corpus. A coding agent dataset should include incomplete stack traces, wrong file names, and requests that require inspecting state before editing.

| Messiness pattern | Why include it | Guardrail |
|---|---|---|
| Typo in entity name | Tests retrieval robustness | Keep expected entity unambiguous. |
| Two intents in one message | Tests routing and prioritization | Label primary and secondary intent. |
| Obsolete terminology | Tests alias handling | Map to real product vocabulary. |
| Irrelevant preface | Tests focus | Do not bury the task beyond realistic length. |
| Contradictory user claim | Tests source grounding | Expected answer follows trusted source, not user assertion. |

Synthetic generation is strongest when it makes those patterns explicit. Add a \`messiness\` or \`phenomenon\` field to metadata so reviewers can see why each case exists.

## A small dataset card prevents future misuse

Every synthetic eval set should have a short dataset card. It does not need academic ceremony. It should state the purpose, source materials, generation method, review status, known gaps, and intended scoring. This prevents a support RAG dataset from being reused as a safety benchmark or a tool-call dataset from being treated as production distribution.

| Dataset card field | Example content |
|---|---|
| Purpose | Evaluate refund and billing answer grounding for support assistant. |
| Source materials | Public policy docs and hand-authored edge cases, no production PII. |
| Generation method | Rule-based templates plus reviewed LLM drafts. |
| Oracle type | Required doc ids, forbidden doc ids, expected action labels. |
| Known gaps | Does not cover non-English billing messages yet. |
| Review owner | Support QA lead and billing product owner. |

This metadata is not bureaucracy. It keeps the eval honest when teams change, models improve, or someone tries to use the dataset for a decision it was never designed to support.

## Retire cases as deliberately as you add them

Synthetic eval sets accumulate. A case that was valuable during launch can become obsolete after a policy rewrite, tool removal, or product rename. If obsolete cases remain, teams either waste time fixing irrelevant failures or train the system toward behavior the product no longer wants.

Create a retirement path. Mark the reason, keep the old id in history, and state whether the case was replaced. Do not simply delete failing cases during a release. That makes quality trend lines meaningless.

| Retirement reason | Good action |
|---|---|
| Product policy changed | Replace with a case for the new policy and note the old id. |
| Duplicate coverage | Keep the clearer case, retire the weaker one. |
| Oracle no longer verifiable | Rewrite with checkable documents or remove from scored set. |
| Feature removed | Archive with feature metadata. |
| Real production sample supersedes it | Prefer the reviewed production-derived case. |

A maintained synthetic set should feel curated, not endlessly growing. Quality comes from coverage and trust, not raw case count.

Synthetic data should also be tagged by confidence. A hand-reviewed incident-derived case can carry more release weight than a newly generated draft. Scoring dashboards should make that distinction visible so a regression in trusted cases is not averaged away by a large batch of low-confidence material.

Retirement discipline is especially important for agent evals because tools change quickly. A case expecting an old tool name may fail for the wrong reason after the product moves to a new action model. Keep archived cases available for audit, but remove them from release scoring once they no longer describe supported behavior.

That separation keeps historical learning available without letting outdated behavior distort the next production gate.

Reviewers should see that lifecycle in the dataset history before approving new generation batches.

## Frequently Asked Questions

### Is synthetic eval data the same as mocked production logs?

No. Synthetic data is deliberately generated or authored. Mocked logs imitate observed events. Both can be useful, but synthetic cases need explicit review because they may not reflect real user distributions.

### Can an LLM generate the expected answers too?

It can draft candidates, but a trusted oracle should be validated by rules, source documents, tool state, or human review. Letting the same style of model invent both input and answer can hide mistakes.

### How many synthetic cases should I add for a new feature?

Add enough to cover the main behavior, high-risk edges, and known ambiguity. The number matters less than coverage labels and review quality. Ten precise cases can beat two hundred generic paraphrases.

### Should synthetic cases be regenerated every release?

No. Stable evals are valuable because they reveal regressions. Generate new cases when product behavior, risk, or coverage gaps change. Keep old cases unless they are obsolete or duplicative.

### How do I prevent duplicate synthetic examples?

Use stable ids, metadata dimensions, and similarity checks during review. Also read the cases. Automated deduplication helps, but human reviewers catch repeated scenarios with different wording.
`,
};
