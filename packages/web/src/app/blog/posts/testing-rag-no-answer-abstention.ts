import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing RAG No-Answer and Abstention Behavior',
  description:
    'Test RAG no-answer and abstention behavior with evidence-controlled datasets, calibrated thresholds, citation checks, and metrics that expose unsupported answers.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing RAG No-Answer and Abstention Behavior

The retrieved passages describe the refund window for monthly plans, but the question asks whether an enterprise contract can be terminated after an acquisition. The safest response is an explicit abstention. A fluent answer assembled from general contract language is a failure, even if it sounds commercially reasonable.

No-answer testing asks whether a retrieval-augmented generation system recognizes when its available evidence cannot support the requested claim. It covers more than empty search results. Retrieval may return related but insufficient text, contradictory versions, documents outside the user's authorization scope, or passages that answer only part of a compound question.

## Define abstention as an observable product behavior

Teams often encode no-answer behavior only in a prompt: answer from context, otherwise say you do not know. That is not a testable specification until the expected output and downstream behavior are defined.

An abstention can include several signals:

- A machine-readable decision such as answerable=false.
- A concise user-facing explanation that evidence was insufficient.
- No unsupported citations.
- A safe next step, for example requesting a document or narrowing the question.
- Retrieval diagnostics retained for evaluation but not leaked to the user.
- No answer text that quietly makes the missing claim after the refusal phrase.

The response contract should separate decision from prose. String matching for I don't know is weak because the model may say that phrase and then speculate, or abstain correctly with different wording. A structured output field makes automated checks more stable, while semantic review still evaluates whether answer content obeys the decision.

| Decision state | Evidence condition | Expected behavior |
|---|---|---|
| Answer | Passages directly support all material claims | Respond with bounded claims and valid citations |
| Abstain | No relevant evidence is retrieved | State that the provided sources do not contain the answer |
| Abstain | Retrieved text is topically related but lacks the requested fact | Avoid filling the gap from model memory |
| Clarify | Evidence could answer one interpretation | Ask a disambiguating question rather than guessing |
| Partial answer | Product permits it and some subquestions are supported | Mark unsupported portions explicitly |
| Escalate | Domain policy requires human review | Route without producing a substantive conclusion |

Decide whether partial answers are allowed. If they are, the system needs claim-level support checks. If they are not, a compound question with one missing component should yield an abstention or clarification even when other components are answerable.

## Build cases by controlling evidence, not just questions

A useful evaluation item contains the user query, the exact documents available to retrieval, the authorization scope, and the expected decision. Labeling a question unanswerable in the abstract is insufficient because the corpus changes over time.

Construct paired cases from the same question:

1. Evidence-present: include the authoritative paragraph.
2. Evidence-removed: remove that paragraph while retaining nearby topical material.
3. Evidence-conflicted: include two versions with visible dates or authority metadata.
4. Evidence-forbidden: keep the answer in the corpus but deny it to the test identity.
5. Evidence-partial: support only one clause of a compound request.

These counterfactual pairs reveal whether the generator responds to retrieved evidence or merely recalls a likely answer. If output remains unchanged after the decisive passage is removed, the pipeline is not reliably grounded.

| Dataset slice | Construction method | Failure it detects |
|---|---|---|
| Empty retrieval | Query with no matching domain material | Unconditional answering from prior knowledge |
| Near-neighbor distractor | Same entities, wrong attribute or policy | Topic matching mistaken for entailment |
| Temporal mismatch | Superseded and current policy passages | Ignoring effective dates and source authority |
| Entity collision | Similar product or customer names | Combining facts across subjects |
| Compound insufficiency | One subquestion supported, one absent | Concealing partial evidence |
| Access-filtered answer | Relevant chunk excluded by permissions | Authorization leakage or misleading certainty |
| Adversarial instruction in document | Retrieved text tells model to ignore policy | Prompt injection overriding abstention rules |

Use real document shapes such as headings, tables, footnotes, and version metadata. Synthetic minimal sentences are valuable for unit diagnosis, but production retrieval fails at chunk boundaries and document structure. Maintain both layers.

## Represent evaluation records explicitly

The following Python data model and evaluator operate on a structured RAG response. They do not call a particular model provider, so they can wrap any pipeline that returns the declared fields. The functions are runnable with the standard library and pytest.

\`\`\`python
from dataclasses import dataclass
from typing import Literal


Decision = Literal['answer', 'abstain', 'clarify']


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    question: str
    documents: tuple[str, ...]
    expected_decision: Decision
    required_claims: tuple[str, ...] = ()


@dataclass(frozen=True)
class RagResponse:
    decision: Decision
    text: str
    cited_document_ids: tuple[str, ...]
    confidence: float


def score_decision(cases: list[EvalCase], outputs: list[RagResponse]) -> dict[str, float]:
    if len(cases) != len(outputs):
        raise ValueError('Each evaluation case requires one output')

    expected_abstentions = sum(c.expected_decision == 'abstain' for c in cases)
    correct_abstentions = sum(
        c.expected_decision == 'abstain' and o.decision == 'abstain'
        for c, o in zip(cases, outputs, strict=True)
    )
    answerable_cases = sum(c.expected_decision == 'answer' for c in cases)
    false_refusals = sum(
        c.expected_decision == 'answer' and o.decision != 'answer'
        for c, o in zip(cases, outputs, strict=True)
    )

    return {
        'abstention_recall': correct_abstentions / expected_abstentions
        if expected_abstentions else 1.0,
        'false_refusal_rate': false_refusals / answerable_cases
        if answerable_cases else 0.0,
        'decision_accuracy': sum(
            c.expected_decision == o.decision
            for c, o in zip(cases, outputs, strict=True)
        ) / len(cases),
    }
\`\`\`

Abstention recall measures how often known no-answer cases are refused. False-refusal rate measures the cost paid on answerable cases. Neither evaluates whether accepted answers are supported. Keep groundedness or claim-support scoring beside the decision metrics.

Confidence is included to support threshold analysis, not because a model's self-reported number is automatically calibrated. Prefer a score derived from a validated classifier, retrieval features, or a calibration model trained on held-out decisions. Whatever its source, record the definition and version.

## Separate retrieval failure from answer-policy failure

When an expected answer is refused, retrieval may have missed the evidence or the generator may have rejected adequate context. When an unsupported answer is produced, retrieval may have supplied distractors or the generation policy may have ignored a low-evidence signal. Diagnose these stages independently.

A trace for each evaluation run should retain:

- Query after any rewriting.
- Retrieved chunk identifiers, ranks, and scores.
- Filtering decisions, including authorization.
- Document version and effective-date metadata.
- Context actually sent to the model.
- Structured answerability decision.
- Final claims and citation mapping.
- Model, embedding, reranker, prompt, and index versions.

Do not expose this trace indiscriminately in user responses. It can contain restricted document titles, hidden prompts, and internal scores. Evaluation storage needs access control and retention rules.

The diagnostic matrix below turns symptoms into component hypotheses:

| Observed result | Retrieval state | Primary investigation |
|---|---|---|
| Abstains on answerable case | Required chunk absent | Recall, query rewriting, filters, chunking |
| Abstains despite direct passage | Required chunk present and clear | Answerability prompt or threshold too strict |
| Answers no-evidence case | No useful chunks | Generator prior knowledge or forced-answer prompt |
| Answers from a distractor | Related chunk lacks claim | Entailment check and hard-negative training |
| Cites source but adds unsupported detail | Citation covers only part of prose | Claim segmentation and citation validation |
| Reveals forbidden fact | Authorized context lacks it | Model-memory policy and access-boundary design |

This stage separation prevents a common response to all failures: adjusting the prompt. A prompt cannot retrieve a chunk excluded by an index filter, and a better retriever cannot force the generator to refrain from unsupported synthesis.

## Test near-answer distractors aggressively

Empty-context refusal is necessary but easy. The difficult case contains language that looks relevant while omitting the answer. For example, a passage may state that standard refunds are available within 30 days, while the query asks about enterprise termination after acquisition. Entity overlap and policy vocabulary can create high retrieval scores without entailment.

Build hard negatives through controlled edits:

- Replace the requested product tier with another tier.
- Preserve a numeric value but change its unit.
- Keep the policy title while removing the exception clause.
- Swap the effective year.
- Mention the entity in a different jurisdiction.
- Include a question in the source without its answer.
- Put the true answer in an inaccessible document and a related answer in an accessible one.

Reviewers should label why the context is insufficient. Categories make regression patterns visible and allow targeted evaluation when retriever or chunking logic changes.

Do not use lexical overlap as the no-answer oracle. A relevant passage can use different terminology, and a distractor can repeat every query token. Human-labeled entailment or a carefully validated evaluator is needed for the highest-risk slices.

## Score accepted answers at the claim level

An answer decision is not enough. The response may contain one supported sentence followed by two plausible additions. Split accepted output into atomic factual claims and map each claim to cited evidence. A claim passes only when the source entails it within the relevant scope, date, and entity.

For deterministic domains, encode claim checks directly. The example below validates a structured policy answer against source facts and rejects invented fields. It illustrates the kind of narrow oracle that is preferable to a generic similarity score.

\`\`\`python
def validate_policy_answer(answer: dict, evidence: dict) -> list[str]:
    errors: list[str] = []

    allowed_fields = {'plan', 'refund_days', 'effective_on', 'source_id'}
    unexpected = set(answer) - allowed_fields
    if unexpected:
        errors.append(f'unexpected claims: {sorted(unexpected)}')

    for field in ('plan', 'refund_days', 'effective_on'):
        if answer.get(field) != evidence.get(field):
            errors.append(
                f'{field} differs: answer={answer.get(field)!r}, '
                f'evidence={evidence.get(field)!r}'
            )

    if answer.get('source_id') != evidence.get('document_id'):
        errors.append('citation does not identify the supporting document')

    return errors


def test_enterprise_policy_must_not_inherit_standard_terms():
    source = {
        'document_id': 'policy-enterprise-2026',
        'plan': 'enterprise',
        'refund_days': None,
        'effective_on': '2026-04-01',
    }
    generated = {
        'plan': 'enterprise',
        'refund_days': 30,
        'effective_on': '2026-04-01',
        'source_id': 'policy-enterprise-2026',
    }

    assert validate_policy_answer(generated, source) == [
        'refund_days differs: answer=30, evidence=None'
    ]
\`\`\`

Free-form answers require another segmentation method, possibly human review or an LLM judge with validated prompts. Judge models can be useful at scale but are not ground truth. Measure agreement against expert labels, freeze judge versions during comparisons, and manually inspect disagreements.

For groundedness, context relevance, and answer relevance as separate dimensions, see the [RAG Triad evaluation guide](/blog/trulens-rag-triad-groundedness-context-relevance-2026). Abstention adds a selective decision layer to those quality dimensions.

## Calibrate thresholds against asymmetric harm

Many systems combine retrieval score, reranker score, evidence coverage, and an answerability classifier into a threshold. Raising the threshold usually increases refusals, reducing some unsupported answers while also rejecting useful responses. The correct operating point depends on harm.

A legal research assistant may prefer abstention when authority is missing. An internal help center may accept a carefully qualified partial answer to reduce support load. Evaluate with a cost matrix agreed by product, domain, safety, and operations stakeholders.

| Actual condition | System answers | System abstains |
|---|---|---|
| Evidence sufficient | Useful answer, subject to groundedness | False refusal and user friction |
| Evidence insufficient | Unsupported answer, potentially high harm | Correct containment |
| Evidence contradictory | Misleading certainty if conflict is hidden | Safe only if conflict is explained or escalated |
| Question ambiguous | May answer wrong interpretation | Clarification can be better than refusal |

Plot coverage against risk. Coverage is the fraction of cases the system answers. Selective risk is the error rate among answered cases. As the threshold becomes stricter, coverage falls. A useful model should reduce risk meaningfully rather than merely refusing everything.

Calculate metrics by important slice: language, document type, query complexity, freshness, customer tier, authorization role, and retrieval depth. A global average can conceal a severe failure for scanned PDFs or a particular jurisdiction.

Never tune the threshold on the final regression set. Use training data for model fitting, a validation set for threshold selection, and a held-out test set for reporting. Refresh all three when the corpus and user behavior shift, while retaining stable anchor cases for longitudinal comparison.

## Evaluate response wording after the decision

A correct abstain flag can still produce a poor experience. The message may blame the user, claim the fact does not exist, expose internal retrieval scores, or recommend an unsafe workaround. Define wording requirements appropriate to the domain.

A good no-answer response generally distinguishes missing evidence from a universal negative. It says the available sources do not establish the answer, not that the answer is impossible. If a follow-up can make progress, it requests a contract name, date, jurisdiction, or source document. If escalation is required, it identifies the role or process without inventing a contact.

Test that abstention text contains no substantive unsupported answer. A banned-phrase list is not enough. A sentence such as I cannot confirm this, but enterprise customers usually have 60 days performs an abstention and a hallucination simultaneously. Claim-level review should treat it as an unsafe answer.

Citation behavior also changes on refusal. The system may cite the near-neighbor document as evidence for why it cannot answer, but it must not present that source as supporting the missing fact. Product design should decide whether no-answer responses show diagnostic citations at all.

## Run counterfactual metamorphic checks

RAG systems are probabilistic, so individual expected strings are fragile. Metamorphic tests change one controlled input and assert a directional behavior.

Useful transformations include:

1. Remove the decisive passage, answer should change to abstain or clarify.
2. Add an authoritative passage, abstention should become a supported answer.
3. Replace a source with a superseded version, response should honor current-version rules.
4. Reorder irrelevant chunks, decision should remain stable.
5. Add a high-overlap distractor, unsupported claims should not appear.
6. Change user permissions to hide the answer, restricted content must disappear and decision should update.

The harness below captures a simple evidence-removal invariant for any callable pipeline.

\`\`\`python
def assert_decisive_evidence_controls_answer(pipeline):
    question = 'What is the retention period for audit exports?'
    decisive = {
        'id': 'retention-2026',
        'text': 'Audit export archives are retained for 45 days.',
    }
    distractor = {
        'id': 'audit-overview',
        'text': 'Audit exports are generated from the administration console.',
    }

    with_evidence = pipeline(question, [decisive, distractor])
    without_evidence = pipeline(question, [distractor])

    assert with_evidence.decision == 'answer'
    assert '45 days' in with_evidence.text
    assert with_evidence.cited_document_ids == ('retention-2026',)
    assert without_evidence.decision == 'abstain'
    assert '45 days' not in without_evidence.text
\`\`\`

Run each stochastic case enough times to reveal instability if the product samples during generation. Report pass rate and decision variance rather than selecting the best output. For production paths that require predictable abstention, consider deterministic decoding and a separately calibrated decision model.

## Monitor abstention after deployment

Offline sets cannot represent every query. Production monitoring should track answer coverage, abstention rate, clarification rate, retrieval-empty rate, user reformulation, escalation, citation interaction, and audited unsupported-answer incidents. Interpret shifts alongside corpus updates and traffic mix.

A rising abstention rate may indicate safer behavior, an index failure, new user topics, an authorization regression, or a threshold change. Segment before concluding. Sample both answered and refused interactions for review, with privacy controls and redaction appropriate to the content.

Create a feedback path that distinguishes I expected an answer from this answer is wrong. The first can identify retrieval gaps and false refusals; the second can uncover grounding failures. User feedback remains noisy and should supplement, not replace, labeled evaluation.

When documents change, run targeted regression by affected source, policy, entity, and question family. The [RAG regression testing guide](/blog/rag-regression-testing-guide) explains versioned datasets and release comparisons. No-answer cases should be first-class members of that suite, not a few negative prompts added at the end.

## Set release gates that cannot be gamed by refusing everything

An abstention system can achieve perfect unsupported-answer avoidance by never answering. Release criteria must constrain both sides. Set a minimum answer coverage or maximum false-refusal rate on answerable cases, plus an abstention-recall or unsupported-answer limit on unanswerable cases. Add slice-specific gates for high-harm domains.

Review raw examples whenever a metric moves. A one-point aggregate change may come from harmless wording variation or a severe policy leak. Store enough version information to reproduce the exact retrieval and generation path. If third-party models change behind an alias, pin versions where possible and treat upgrades as evaluation events.

Finally, rehearse failure modes outside the model. An empty vector index, timeout from the reranker, truncated context, malformed structured output, and unavailable authorization service should lead to explicit safe behavior. Infrastructure uncertainty must not silently convert into a confident answer.

## Frequently Asked Questions

### Should an unanswerable RAG query always return exactly the same phrase?

No. Stable structured decisions are more useful than a single magic sentence. Evaluate whether the response clearly states evidence insufficiency, avoids unsupported claims, follows escalation policy, and requests clarification when that can resolve the gap.

### How do I know whether a refusal was caused by retrieval or generation?

Inspect whether the required authoritative chunk was present in the actual model context. If absent, investigate retrieval and filters. If present and sufficient, examine answerability logic, thresholds, prompt instructions, and structured-output parsing.

### Can retrieval similarity score alone decide answerability?

Usually not. Similarity measures topical closeness, not whether a passage entails the requested fact. Combine it with reranking, coverage or entailment signals, metadata rules, and calibration on labeled answerable and unanswerable cases.

### How should contradictory documents be labeled?

Label according to the product's authority rules. If metadata identifies a current controlling source, the case may be answerable from that source while noting conflict. If authority cannot be resolved, expect abstention, clarification, or human escalation rather than silent selection.

### What is the most important negative dataset slice?

Near-answer distractors are often more revealing than empty retrieval. They contain the right vocabulary and entities but omit or contradict the requested claim, exposing systems that confuse relevance with sufficient evidence.
`,
};
