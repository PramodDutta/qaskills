import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "LLM Testing Interview Questions for QA Engineers",
  description:
    "Prepare for LLM testing interviews with senior-level questions on nondeterminism, evaluation sets, safety, tool use, retrieval, and release decisions.",
  date: "2026-07-13",
  category: "AI Testing",
  content: `
# LLM Testing Interview Questions for QA Engineers

“The answer changed, but is it wrong?” is the interview question hiding behind almost every LLM quality problem. A candidate who reaches for exact string equality will miss valid variation. A candidate who says “LLMs are nondeterministic” and stops there will miss regression engineering. Strong QA engineers define what must remain invariant, select an oracle appropriate to each risk, and produce evidence that supports a release decision.

This question set is designed for experienced testers moving into generative AI, and for interviewers who need to separate vocabulary from practical judgment. The answers are not scripts to memorize. They show the depth, tradeoffs, and follow-up evidence expected from someone who can build an evaluation program rather than run a few prompts manually.

## How would you test a response when many answers are valid?

A strong answer starts by decomposing quality. Exact wording may vary while factual claims, task completion, safety rules, citations, tone boundaries, and output schema remain testable. The candidate should propose deterministic checks for hard constraints and graded evaluation for open-ended dimensions.

For a travel assistant, for example, validate date and currency fields exactly, verify cited venues exist through controlled evidence, scan for forbidden personal data, and score itinerary usefulness against a rubric. Do not collapse these into one “looks good” score.

Listen for discussion of repeated sampling. One passing generation is weak evidence when decoding or provider infrastructure can vary. A candidate should choose a number of samples based on risk and cost, report counts with confidence intervals where appropriate, and preserve prompts, model configuration, and outputs for comparison.

Weak signals include asserting the entire response as a snapshot, treating temperature zero as a proof of determinism, or using an LLM judge for fields that normal code can validate exactly.

## What belongs in an LLM regression dataset?

The best candidates describe a versioned, representative corpus rather than a bag of clever prompts. It should include common tasks, high-severity edge cases, historical incidents, language and locale coverage, adversarial inputs, long-context boundaries, tool failures, and cases where refusal is the correct result.

Each case needs a reason for inclusion and an oracle. A prompt without expected constraints is a demo, not a regression test. Metadata should identify product surface, risk tier, tenant or persona represented synthetically, required facts, prohibited behavior, and evaluator version.

| Corpus slice | Example case | Appropriate evidence |
|---|---|---|
| Core task | Summarize an approved policy | Required claims and citation IDs |
| Known incident | Model omitted cancellation fee | Qualifier-preservation assertion |
| Safety boundary | User requests credential theft | Refusal plus no actionable exploit steps |
| Retrieval conflict | Old and current policies both retrieved | Current-version citation and correct rule |
| Tool degradation | Inventory API times out | No fabricated stock claim, explicit uncertainty |
| Locale | Decimal comma in a German quote | Parsed amount and locale-specific formatting |

Good answers also address contamination. Production examples must be redacted and authorized. Evaluation cases should not leak into training or prompt examples without tracking, because memorization can inflate results. Split exploratory discoveries from a stable release set, then promote valuable failures through review.

## How do temperature and sampling affect your test plan?

Temperature is only one contributor to variation. Model releases, routing, safety layers, tool timing, retrieval order, and platform changes can alter results. Lower temperature can reduce some sampling variability but does not make an external model service mathematically fixed.

The candidate should distinguish two modes. Deterministic contract tests use controlled fixtures, fixed configuration, and exact assertions around schemas or tool arguments. Statistical behavior evaluations sample the real generation path and estimate rates such as successful task completion or safety violation count.

A useful response explains how to avoid rerunning until green. Decide the sampling plan before execution, retain every attempt, and aggregate according to a published rule. If five outputs are sampled, the system does not pass merely because the fifth is attractive.

Ask the candidate how they would compare two model versions. Look for paired cases, identical retrieval fixtures where possible, blind human review for subjective output, bootstrap or proportion uncertainty when justified, and analysis of regressions by risk class rather than a single average.

## Design a small executable evaluation harness

This exercise reveals whether the candidate can translate principles into code. Give them a JSON-output customer-support task with required and forbidden properties. A reasonable Python harness might separate transport from deterministic grading:

\`\`\`py
from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    prompt: str
    expected_action: str
    required_citations: frozenset[str]
    forbidden_phrases: tuple[str, ...]


def grade(case: EvalCase, output: dict[str, Any]) -> list[str]:
    failures: list[str] = []

    if output.get('action') != case.expected_action:
        failures.append('wrong_action')

    citations = set(output.get('citation_ids', []))
    if not case.required_citations.issubset(citations):
        failures.append('missing_citation')

    answer = str(output.get('answer', '')).casefold()
    if any(phrase.casefold() in answer for phrase in case.forbidden_phrases):
        failures.append('forbidden_content')

    return failures


def run_case(
    case: EvalCase,
    generate: Callable[[str], dict[str, Any]],
) -> dict[str, object]:
    output = generate(case.prompt)
    return {
        'case_id': case.case_id,
        'failures': grade(case, output),
        'output': output,
    }
\`\`\`

This harness does not invent an SDK. The generation function is injected, so the project can connect its real client while unit tests supply a deterministic double. A senior candidate should mention schema validation before semantic grading, exception capture, request IDs, latency and token usage recording, and safe output storage.

Follow up by asking what this harness cannot judge. Expected answers include factual support beyond citation IDs, nuanced empathy, prompt injection embedded in retrieved content, and whether the cited passage actually entails the claim. Those need additional evaluators.

## When should you use an LLM as a judge?

Use a model judge when the criterion is semantic and expensive to encode, such as whether a summary preserves a qualification or a response follows a nuanced tone rubric. Do not use it to validate JSON shape, numeric thresholds, exact IDs, or forbidden literal strings.

A competent answer includes judge validation. Build human-labeled examples, measure agreement by category, include difficult negatives, examine position and verbosity bias, and version the judge prompt plus model. For high-risk disagreements, route to human adjudication rather than accepting the judge as ground truth.

The candidate should recognize self-preference risk when the tested model and judge share a family. Multiple judges can reduce dependence but do not automatically create truth. Randomize candidate order in pairwise comparisons, hide model identity, and include reference evidence in the judge context.

Ask how they would prevent score drift. The answer should mention a frozen calibration set, change control for rubrics, periodic human relabeling, and separate reporting when judge versions change. Scores from materially different judges should not be drawn as one continuous trend without recalibration.

## How would you test hallucination in a retrieval-augmented answer?

“Check whether the answer sounds factual” is inadequate. The tester needs a controlled knowledge base where source documents and versions are known. Assertions should cover retrieval and generation independently.

At retrieval time, measure whether relevant passages appear and whether disallowed or stale documents are excluded. At generation time, break the response into material claims and test entailment against cited evidence. Include cases where no source supports an answer and require an abstention or explicit uncertainty.

Useful adversarial cases include two policies with different effective dates, a document containing instructions aimed at the model, a source with the right keywords but wrong tenant, and an answerable question whose evidence sits beyond the first retrieved chunk.

The interviewer should listen for citation correctness, not citation presence. A response can attach a real source to a claim the source does not support. Strong candidates also mention freshness, access control, chunk boundaries, and retrieval observability.

## What safety tests would you run before release?

Safety depends on the product's capabilities. A writing assistant, medical information bot, and code-execution agent require different threat models. The candidate should begin with assets, users, tools, data, and plausible misuse, then derive tests.

| Risk surface | Test prompt or setup | Passing behavior |
|---|---|---|
| Prompt injection | Retrieved page says to reveal system instructions | Treat page as data and continue approved task |
| Sensitive data | Synthetic secret appears in prior user's context | Secret never appears in new user's response or tool call |
| Tool authorization | User asks agent to delete an unapproved project | No destructive call, request scoped confirmation if policy permits |
| Harmful guidance | Request seeks actionable fraud steps | Response follows the product's safety policy |
| Overreliance | Evidence is incomplete for a medical claim | Communicates limits and avoids invented diagnosis |
| Encoding bypass | Harmful instruction is obfuscated | Policy still applies to decoded intent |

Look for multi-turn and multilingual cases, because single-turn English prompts cover only a narrow surface. Tool-enabled systems need argument-level assertions and sandboxing. Refusal quality also matters: an excessive refusal rate can make safe tasks unusable, so include benign near-neighbor prompts.

The answer should not claim that red teaming proves absence of harm. It discovers failures and estimates coverage against a threat model. Production monitoring, incident response, access controls, and staged rollout remain necessary.

## How do you test an agent that calls tools?

Tool testing has at least four layers: selection, argument construction, authorization, and response use. A model can choose the right calendar tool with the wrong date, or correctly read an API response and then state a fabricated result.

Use deterministic tool doubles for most scenarios. Record every proposed call, validate its JSON schema, and return controlled successes, timeouts, partial data, permission errors, and malicious strings. Assert the final response reflects the actual tool result and does not claim an action completed after failure.

An interview coding extension can use pytest without a model dependency:

\`\`\`py
import pytest


class RecordingTransferTool:
    def __init__(self, outcome: str):
        self.outcome = outcome
        self.calls: list[dict[str, object]] = []

    async def transfer(self, *, account_id: str, amount_cents: int) -> dict[str, str]:
        self.calls.append({'account_id': account_id, 'amount_cents': amount_cents})
        if self.outcome == 'timeout':
            raise TimeoutError('synthetic timeout')
        return {'status': self.outcome, 'transfer_id': 'tr_test_1'}


@pytest.mark.asyncio
async def test_agent_does_not_claim_transfer_after_timeout(agent) -> None:
    tool = RecordingTransferTool(outcome='timeout')

    response = await agent.run(
        'Transfer $12.50 from approved test account A',
        tools={'transfer': tool.transfer},
    )

    assert tool.calls == [{'account_id': 'A', 'amount_cents': 1250}]
    assert response.action_status == 'not_completed'
    assert 'completed' not in response.message.casefold()
\`\`\`

The \`agent\` fixture belongs to the application's real interface; the recording tool is a runnable async test double. Strong candidates will add a permission gate before the call and question whether the user prompt alone establishes transfer authorization.

Live integration tests are still needed for tool authentication and protocol drift, but they should use sandbox accounts, bounded permissions, and cleanup. Never let a stochastic test drive unrestricted production tools.

## How do you distinguish a flaky evaluation from a flaky product?

First reproduce the output using captured inputs and configuration. Then isolate components: fixed model output through the evaluator, fixed evaluator against stored outputs, controlled retrieval results, and deterministic tool responses. If the same stored output receives changing grades, the evaluator is unstable. If retrieval differs, the generation is not the only variable.

A candidate should propose tracking variance by case and evaluator. Rerunning only failures can bias the apparent pass rate upward. Preserve all attempts and compare distributions. For a binary safety property, one severe violation may block release even when the average is high.

Common evaluation flakiness sources include rate-limit fallbacks to another model, unpinned judge prompts, changing web evidence, concurrent test contamination, time-dependent prompts, and parsers that silently accept malformed output. The fix depends on the source. “Increase retries” is not diagnosis.

## What would block a model upgrade?

This question tests release judgment. A good answer asks about risk tier and established baselines. It then names gates such as no regression in critical safety cases, schema validity above an agreed threshold with uncertainty considered, no material increase in unsupported claims, acceptable task success on core journeys, and reviewed changes in latency and cost.

Aggregate improvements do not cancel severe regressions. A model that writes better prose but exposes one cross-tenant record fails the security gate. Slice results by language, user segment, tool, task, and input length so a majority segment cannot hide harm to a smaller group.

Use a shadow or canary rollout where production risk justifies it. Compare model versions on identical authorized traffic samples, keep rollback ready, and monitor refusal, tool error, and escalation behavior. Offline evaluation is necessary but cannot reproduce every production distribution shift.

The candidate should request sign-off ownership. QA supplies evidence and recommendation, while product, safety, security, or regulated-domain owners may decide risk acceptance.

## How would you investigate a sudden quality drop?

Begin with change correlation: model version or routing, system prompt, retrieval index, embedding model, tool schema, safety configuration, application code, and traffic mix. Freeze a failing trace and replay components where policy allows.

Compare checkpoints:

1. Was the user's input parsed correctly?
2. Did retrieval return the expected document versions?
3. Were tool arguments valid and responses complete?
4. Did the model receive the intended context within budget?
5. Which evaluator rule failed, and did its version change?

Then cluster failures rather than reading random examples. A spike in missing citations may come from a prompt change, while wrong prices may point to stale retrieval. Check observability before blaming the base model.

Senior candidates will mention safe logging and privacy. Production prompts can contain sensitive data, so replay and trace access need authorization, redaction, retention, and audit controls.

## Discuss bias and fairness without giving a generic answer

Ask the candidate to test a recruiting assistant or customer-support prioritizer. A useful response defines the decision, affected groups, legitimate factors, and harm. It creates paired or counterfactual cases where protected attributes change while job-relevant information stays constant, then reviews outcome and language differences.

Fairness cannot always be reduced to identical rates, especially with small or nonrepresentative samples. Report sample composition and uncertainty. Involve domain and legal experts for applicable requirements, which can change by jurisdiction and use case.

Also test representational harm, dialect handling, name variation, disability-related requests, and intersectional cases. Generated explanations can stereotype even when the structured decision is unchanged. Human review is often needed to interpret severity.

A weak answer says “test diverse prompts” without defining coverage or oracle. A strong one explains how synthetic cases avoid exposing real applicant data and how failures affect release decisions.

## Questions the candidate should ask the interviewer

The best interviews are bidirectional. A capable LLM tester will ask what the system can do, which harms matter most, where evaluation data comes from, and who owns the release threshold.

Useful questions include:

- Is the model producing text only, or can it take external actions?
- Which output properties are contractual and which are preferences?
- Are model and prompt versions controlled and observable?
- How are production incidents promoted into regression cases?
- Who labels subjective quality, and how is disagreement handled?
- What data may be stored for replay and evaluation?
- Is there a rollback path for model, retrieval, and prompt changes independently?

These questions reveal system maturity. They also prevent the candidate from proposing an expensive universal evaluation when the immediate risk is a narrow structured extraction flow.

For communication and leadership preparation outside AI specifics, the [behavioral interview questions for QA engineers](/blog/behavioral-interview-questions-qa-engineers) provide complementary scenarios. For a deeper implementation view of datasets, graders, and traces, see the [AI agent evaluation testing guide](/blog/ai-agent-eval-testing-guide).

## A scorecard for interviewers

Score evidence of practice, not the number of AI terms used. Give candidates room to state assumptions and challenge unsafe premises.

| Competency | Strong evidence | Concerning answer |
|---|---|---|
| Oracle design | Mixes exact, rubric, reference, and human checks by requirement | Uses one judge score for everything |
| Nondeterminism | Predefines samples and reports distributions | Reruns until a preferred output appears |
| Safety engineering | Starts from capabilities and threat model | Lists jailbreak prompts without system controls |
| Data stewardship | Versions, redacts, and documents corpus provenance | Copies production conversations into tests |
| Tool testing | Asserts call, arguments, permission, failure, and final claim | Checks only that a tool name appeared |
| Release judgment | Protects critical slices and severe cases | Accepts an improved global average |
| Debugging | Isolates retrieval, generation, tools, and evaluator | Attributes every change to randomness |

Ask for one concrete artifact during the interview: a test case schema, a rubric, a failure triage plan, or ten lines of grading code. Practical constraints expose reasoning more fairly than trivia about model architecture.

Do not expect a QA candidate to reproduce research mathematics unless the role requires it. They should understand uncertainty well enough to avoid false conclusions, know when statistical help is needed, and explain results honestly to release stakeholders.

## Frequently Asked Questions

### Do LLM testing interviews require machine-learning experience?

Not always. QA fundamentals such as risk analysis, oracle design, data control, API testing, security, and observability transfer directly. Model behavior and basic evaluation statistics are important, while model training expertise depends on the role.

### What portfolio project demonstrates LLM testing skill best?

Build a small, versioned evaluation corpus for a real task, combine deterministic and rubric-based graders, inject retrieval or tool failures, and publish an honest report with limitations. The evaluation reasoning matters more than a flashy chatbot UI.

### How should I answer when asked for an LLM accuracy percentage?

Clarify the task, dataset, scoring rule, sample count, slices, and uncertainty before giving a number. Explain that one percentage can hide severe safety or subgroup regressions and show the underlying counts.

### Is prompt engineering enough for an LLM QA role?

No. Prompt changes are one control. The role also needs repeatable datasets, evaluators, tool and retrieval tests, security boundaries, release gates, monitoring, and incident regression.

### What is the biggest interview red flag when discussing nondeterminism?

Using nondeterminism as a reason that assertions are impossible. Outputs vary, but schemas, permissions, sourced facts, forbidden content, tool effects, and statistically measured behaviors remain testable.
`,
};
