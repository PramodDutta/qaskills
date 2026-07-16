import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval Conversational Metrics: Testing Multi-Turn Chat Quality',
  description: 'Use DeepEval conversational multi-turn metrics to catch context loss, incomplete goals, and role drift with reproducible chatbot tests in CI.',
  date: '2026-07-16',
  category: 'AI Testing',
  content: `
# DeepEval Conversational Metrics: Testing Multi-Turn Chat Quality

A support bot can answer every message plausibly and still fail the conversation. It may forget the order number supplied two turns earlier, answer only one half of a request, or abandon its support role after a user prompt. Single-response assertions rarely expose those defects because the failure lives in the relationship between turns.

DeepEval conversational multi-turn metrics evaluate a sequence as a \`ConversationalTestCase\`. That gives QA engineers a test object for the entire exchange and metrics aimed at relevance, retained knowledge, fulfilled intentions, or custom behavioral rules. The result is not a replacement for deterministic assertions. It is a second layer for qualities that cannot be reduced to one exact string.

## Map conversation failures before choosing metrics

Start from production risks, not from a catalog of metric names. Take a real workflow such as rescheduling a delivery: the user identifies an order, changes the day, adds a time constraint, and asks for confirmation. Write down what can go wrong across that sequence.

| Failure mode | Observable example | Useful evaluation layer |
|---|---|---|
| Context loss | Bot asks for an order ID already provided | Knowledge retention |
| Turn drift | Bot explains refunds during a delivery change | Turn relevancy |
| Partial completion | Day changes, requested time window is ignored | Conversation completeness |
| Role violation | Support bot gives unrelated medical advice | Role or topic adherence |
| Business-rule breach | Bot promises an unavailable delivery slot | Deterministic domain assertion plus custom metric |

This mapping prevents a common evaluation mistake: attaching every available judge to every conversation. Each LLM-based metric adds latency, cost, and another score to interpret. Select the smallest group that represents independent product risks. Keep exact facts, tool arguments, HTTP status handling, and database state in ordinary test assertions.

## Represent a realistic exchange as a ConversationalTestCase

Install DeepEval in the same isolated Python environment used by the evaluation suite. Keep application dependencies and evaluator dependencies controlled by your normal lock or constraints process.

\`\`\`bash
python -m pip install deepeval
python -m pytest --version
\`\`\`

A conversation is a list of \`Turn\` objects with roles and content. Use transcript text that contains the cues required to expose the behavior. A two-message greeting cannot test long-term retention.

\`\`\`python
from deepeval.test_case import ConversationalTestCase, Turn

delivery_change = ConversationalTestCase(
    turns=[
        Turn(role="user", content="Move order QA-417 to Friday."),
        Turn(
            role="assistant",
            content="I found QA-417. What delivery window works on Friday?",
        ),
        Turn(role="user", content="After 4 PM, and keep the side-door note."),
        Turn(
            role="assistant",
            content=(
                "Order QA-417 is scheduled for Friday after 4 PM. "
                "The side-door instruction is unchanged."
            ),
        ),
    ]
)
\`\`\`

The example contains three facts worth retaining: the order ID, requested day and time, and existing delivery instruction. It also contains two user intentions, changing the schedule and preserving the note. This makes the fixture diagnostic when a score falls.

Prefer captured, sanitized production patterns and expert-authored edge cases over long synthetic conversations with no stated purpose. Remove personal data, secrets, and internal identifiers before storing transcripts. If the application supports tool calls or retrieval context, preserve those fields only when the selected metric needs them.

## Pair metrics with the defect they can reveal

DeepEval documents several conversational metrics. \`TurnRelevancyMetric\` checks whether assistant responses stay relevant to preceding context. \`KnowledgeRetentionMetric\` targets facts learned during the exchange. \`ConversationCompletenessMetric\` assesses whether the assistant satisfied the user's intentions across the conversation. \`RoleAdherenceMetric\` addresses whether an agent follows its assigned role.

| Metric | Ask this test question | Avoid treating it as |
|---|---|---|
| \`TurnRelevancyMetric\` | Did each reply make sense at that point? | Proof that the final task succeeded |
| \`KnowledgeRetentionMetric\` | Did later replies preserve earlier facts? | A database-state assertion |
| \`ConversationCompletenessMetric\` | Were all expressed intentions addressed? | Exact verification of an external side effect |
| \`RoleAdherenceMetric\` | Did behavior remain within the specified role? | A universal safety evaluation |
| \`ConversationalGEval\` | Did the full exchange meet our written criterion? | A substitute for an unclear requirement |

A balanced regression test for the delivery example can use retention and completeness. Relevancy might be added when off-topic responses are a known failure. Do not infer that a high completeness score means the scheduling API received the correct timestamp. Assert the tool request or downstream state separately.

## Build a pytest gate around high-value conversations

DeepEval's \`assert_test\` integrates an evaluation assertion with a test case and a set of metrics. Thresholds are product decisions. Begin with reviewed examples, inspect score distributions, and choose a boundary that separates unacceptable behavior without pretending judge output is perfectly deterministic.

\`\`\`python
from deepeval import assert_test
from deepeval.metrics import (
    ConversationCompletenessMetric,
    KnowledgeRetentionMetric,
)

from cases import delivery_change


def test_delivery_change_remembers_and_completes_request():
    metrics = [
        KnowledgeRetentionMetric(threshold=0.7),
        ConversationCompletenessMetric(threshold=0.7),
    ]
    assert_test(delivery_change, metrics)
\`\`\`

In a live-system test, generate the \`assistant\` turns through the application under test and then build the case. In a fixture-based test, store a known transcript to validate evaluation policy or reproduce a model regression. Label these separately. A fixed transcript tests the judge and rubric integration, while a live transcript also tests the chatbot.

Run the smallest set during pull requests and a broader corpus on a schedule. A concise command is enough for local and CI parity:

\`\`\`bash
python -m pytest tests/evals/test_delivery_conversations.py -q
\`\`\`

Credentials for the evaluation model belong in CI secrets, never in the transcript or repository. A missing credential should fail setup clearly, not silently skip every conversational test.

## Express a product-specific rule with ConversationalGEval

Built-in metrics cover common qualities, but product language is often more precise. Suppose policy requires the bot to confirm a changed delivery window and preserve any existing access instruction. A custom conversational G-Eval criterion can review the whole exchange against that rule.

\`\`\`python
from deepeval import assert_test
from deepeval.metrics import ConversationalGEval
from deepeval.test_case import MultiTurnParams

from cases import delivery_change


confirmation_policy = ConversationalGEval(
    name="Delivery change confirmation",
    criteria=(
        "The assistant must confirm the new delivery day and time window, "
        "and must preserve or explicitly discuss existing access instructions."
    ),
    evaluation_params=[MultiTurnParams.TURNS],
    threshold=0.7,
)


def test_delivery_confirmation_policy():
    assert_test(delivery_change, [confirmation_policy])
\`\`\`

The criterion names observable evidence. It does not say "be good," "respond helpfully," or "provide a high-quality experience." Those phrases force the judge to invent the specification.

Review custom criteria like test code. A QA engineer, domain owner, and developer should agree on what a pass looks like. Include difficult counterexamples: one transcript that mentions Friday but drops the time, one that changes the time but loses the access note, and one that repeats everything without actually confirming the change. If they all score the same, the rubric is not discriminating enough.

## Calibrate scores against human-reviewed cases

Never select \`0.7\` because it looks strict. Build a calibration set with clear pass, clear fail, and borderline conversations. Have reviewers label them before looking at metric output. Then run the same metric configuration repeatedly and compare decisions.

| Calibration result | Interpretation | Next action |
|---|---|---|
| Clear passes score above clear failures | Metric has useful separation | Place threshold in the gap, then test more cases |
| Borderline cases move across runs | Judge variance affects the boundary | Keep them out of a hard gate or require review |
| All cases score highly | Criterion may be vague or examples too easy | Add counterexamples and sharpen observable rules |
| Human labels disagree | Requirement is not settled | Resolve policy before tuning the evaluator |

Track the model configuration, metric configuration, prompt or criterion text, dataset revision, score, reason, and run time. Without that context, a changed score cannot be attributed to the chatbot, evaluator, or dataset.

Reasons are especially useful during calibration. Read them as diagnostic evidence, not ground truth. If the reason cites an intention that reviewers did not recognize, clarify the transcript or criterion. If it overlooks a key constraint, add a targeted case rather than merely lowering the threshold.

## Separate regression gating from evaluation observability

A pull-request gate must be bounded. Start with short, critical flows and metrics that previously caught a real defect. Set timeouts at the job level, expose provider errors, and retain evaluation output for failed cases. Do not automatically retry until a weak answer happens to pass. If transient provider failures require a retry, report attempts separately from quality failures.

For trend analysis, run a larger labeled corpus on a schedule and compare distributions by scenario. That broader job can study support, onboarding, multi-turn RAG, and refusal behavior without making every code change wait for the full dataset.

The choice between an evaluation framework and an observability platform affects this architecture. A focused comparison of testing and production analysis appears in [DeepEval vs Langfuse for LLM evaluation](/blog/deepeval-vs-langfuse-llm-evaluation). Teams preparing to explain dataset design, judges, and retrieval metrics can also use these [RAG evaluation interview questions](/blog/rag-evaluation-interview-questions) to identify gaps in their test strategy.

When an AI coding agent adds a new metric, require the same review you would require for an assertion helper. The agent should cite the failure mode, add at least one failing fixture, avoid embedding secrets, and show how the test behaves when the evaluator is unavailable. Generated evaluation code is useful only when its policy is inspectable.

## Triage a failed conversational score

First replay the exact transcript and read the metric reason. Mark the turns containing the supposed evidence. Then classify the failure: application response, retrieval input, tool result, test fixture, rubric, or evaluator availability. This keeps a low score from becoming the vague ticket "the model got worse."

Next, rerun a small number of times without changing code. Stable failures deserve application or requirement investigation. Boundary movement suggests judge variance or an ambiguous case. Preserve all results rather than reporting only the best one.

Finally, reduce the conversation to the shortest exchange that still fails. That minimized fixture is easier to review and can become a permanent regression test. Keep the longer original in the scheduled dataset when it represents a realistic journey. The two artifacts serve different purposes: one isolates the defect, while the other measures end-to-end quality.

## Frequently Asked Questions

### When should a chatbot test use ConversationalTestCase instead of LLMTestCase?

Use \`ConversationalTestCase\` when the expected behavior depends on more than one user-assistant exchange. Context retention, accumulated intentions, role consistency, and recovery after clarification all require prior turns. Use a single-turn case when one input and output contain the complete behavior under test. Keeping atomic checks single-turn reduces judge work and makes failures easier to localize.

### Can conversational metrics verify that a tool call changed real data?

They can assess the dialogue or, for metrics designed for tool information, aspects of tool use. They should not replace direct state verification. If a bot says an order moved to Friday, assert the scheduling request and query the resulting state in a controlled test environment. Then use a conversational metric to judge whether the bot remembered constraints and clearly communicated the outcome.

### How many DeepEval metrics should run on each conversation?

Use only metrics tied to distinct risks in that scenario. Two well-calibrated metrics usually provide more signal than a large overlapping bundle. For example, a memory-heavy intake flow may need retention and completeness, while a bounded support persona may need role adherence and a deterministic policy check. Extra judges increase runtime and produce correlated failures that can obscure the root cause.

### What should I do with borderline score failures in CI?

Do not hide them with unlimited retries. Preserve the transcript, score, reason, evaluator configuration, and repeated-run results. If human reviewers also consider the case ambiguous, move it to a review or trend set until the requirement is clarified. Keep hard gating for cases with stable labels and a calibrated margin around the threshold. That makes CI failures actionable instead of arbitrary.
`,
};
