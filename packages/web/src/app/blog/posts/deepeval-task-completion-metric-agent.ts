import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DeepEval Task Completion Metric for Agents',
  description:
    'Use DeepEval Task Completion Metric for agents with full traces, explicit tasks, calibrated thresholds, judge reasons, and regression-ready datasets.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# DeepEval Task Completion Metric for Agents

An agent can produce a polished final message and still leave the requested work unfinished. It may inspect the right repository, propose a credible patch, and never write the file. DeepEval's \`TaskCompletionMetric\` is aimed at that end-to-end distinction: does the outcome recorded across the agent trace align with the task?

This is an LLM-as-a-judge metric. It does not count a fixed set of tool calls, and it is not a deterministic replacement for assertions about database rows, files, or side effects. Its strength is evaluating varied multi-step outcomes where exact expected text would be brittle. Its safe use depends on tracing, representative tasks, calibration, and pairing subjective judgment with hard evidence.

## The metric evaluates a trace-level outcome

\`TaskCompletionMetric\` needs the agent's full execution trace. DeepEval extracts or receives the task, derives the outcome, and asks a judge model how well the outcome aligns. The metric returns a score and, by default, a reason. It passes when the score meets the configured threshold.

A plain final string loses important evidence. If an agent says “ticket created” but the tool span shows a permission error, an output-only evaluator may accept the claim. A trace exposes actions, tool results, nested agents, and the terminal response, giving the judge a better basis for assessing completion.

| Evidence in the trace | Completion question it helps answer | What it still cannot guarantee alone |
|---|---|---|
| User input | What outcome was requested | Whether implied constraints were understood correctly |
| Agent output | What the agent claims happened | Whether external state actually changed |
| Tool calls and results | Which actions succeeded or failed | Whether every tool result is truthful or fresh |
| Nested spans | Whether delegated work contributed | Whether delegation was efficient |
| Errors | Whether the run recovered or stopped | Whether the underlying system later rolled back |
| Explicit task parameter | What rubric target is pinned | Whether the target captures all product requirements |

Task completion is an execution-layer metric. Tool selection and argument correctness answer narrower questions. Step efficiency asks whether the path was wasteful. Plan adherence checks process. An agent can call the perfect tools and still fail to deliver the requested result, or complete the task through an unexpected but valid route.

## Instrument a real agent boundary, not a toy response

Wrap the top-level agent operation with \`@observe\` and update the current trace with its input and output. Then run dataset goldens through \`evals_iterator\` with the metric. The following example models a repository agent that must create a changelog entry. Its tool has a real side effect in a temporary directory, while the metric sees the traced task and outcome.

\`\`\`python
from pathlib import Path
from tempfile import TemporaryDirectory

from deepeval.dataset import EvaluationDataset, Golden
from deepeval.metrics import TaskCompletionMetric
from deepeval.tracing import observe, update_current_trace


@observe(type="tool")
def write_text(path: str, content: str) -> str:
    Path(path).write_text(content, encoding="utf-8")
    return f"wrote {path}"


@observe()
def changelog_agent(request: str, workspace: Path) -> str:
    target = workspace / "CHANGELOG.md"
    result = write_text(
        str(target),
        "# Changelog\n\n## Unreleased\n\n- Added audit event export.\n",
    )
    answer = f"Completed the request: {result}"
    update_current_trace(input=request, output=answer)
    return answer


dataset = EvaluationDataset(
    goldens=[Golden(input="Create CHANGELOG.md with an Unreleased entry for audit export")]
)
metric = TaskCompletionMetric(
    threshold=0.8,
    task="Create CHANGELOG.md with an Unreleased entry for audit export",
    include_reason=True,
)

with TemporaryDirectory() as directory:
    workspace = Path(directory)
    for golden in dataset.evals_iterator(metrics=[metric]):
        changelog_agent(golden.input, workspace)
        assert "audit event export" in (workspace / "CHANGELOG.md").read_text()
\`\`\`

The filesystem assertion is intentional. The judge evaluates semantic completion from the trace; the deterministic assertion proves the claimed artifact exists and contains the critical phrase. If the agent under test is a real LLM workflow, replace the fixed implementation while retaining the observable check.

DeepEval can infer the task when \`task\` is omitted. Supplying it explicitly pins the judge to a stable objective, which is valuable for regression suites. Inference is useful for exploratory evaluation and heterogeneous production traces, but a vague user message can produce a vague inferred task.

## Write completion tasks as verifiable outcomes

“Help with the deployment” is difficult to score consistently. “Create a rollback plan containing database, application, and verification steps, without executing production changes” gives the judge a bounded outcome. The best task text preserves user intent, scope, prohibitions, and the artifact or state that represents success.

Do not turn the task parameter into a hidden answer key containing requirements the agent never received. Evaluation should reflect the actual contract. If the system prompt supplies extra rules, include that context in tracing or dataset design so a failure can be interpreted fairly.

| Weak task | Better completion target | Why the revision helps |
|---|---|---|
| “Investigate checkout” | “Identify the checkout 500 root cause and cite the failing request evidence, without changing code” | Separates diagnosis from implementation |
| “Book travel” | “Reserve the cheapest refundable option within the stated dates and return a confirmation” | Names price, policy, date, and evidence |
| “Fix the test” | “Modify the failing test without weakening assertions, then report the passing command” | Prevents deletion or unconditional skip as completion |
| “Answer the customer” | “Draft a response that acknowledges the billing error and gives the approved refund timeline” | Defines content without requiring exact prose |
| “Clean records” | “Delete duplicate imports for batch 42 only and return the deleted count” | Establishes boundary and observable result |

Include adversarial variants. An agent may complete the easy task yet fail when the requested artifact already exists, a tool returns partial success, approval is required, or a destructive operation must be refused. Completion sometimes means stopping safely and explaining the blocker, not performing the literal action.

## Calibrate the threshold with labeled traces

The default threshold is a starting behavior, not evidence that 0.5 suits your risk. Assemble traces representing clearly complete, clearly incomplete, partially complete, falsely claimed, safely blocked, and out-of-scope outcomes. Have domain reviewers label them before tuning.

Run the metric repeatedly because judge models can vary. Inspect score distributions and reasons. Choose a threshold that separates unacceptable outcomes at the cost your use case can tolerate. A coding assistant suggestion may accept partial progress; a purchasing agent needs stricter deterministic controls regardless of judge score.

\`strict_mode=True\` produces binary scoring and sets the threshold to perfection. That can be useful for narrow, unambiguous tasks but may be too harsh for open-ended work. Binary output does not make the underlying LLM judgment deterministic.

Pin the judge model in CI. Changing the model changes the evaluator and requires recalibration. Record DeepEval version, judge model, metric options, prompt-relevant agent version, and dataset revision with results. A score trend without evaluator provenance is weak evidence.

## Interpret the reason as diagnostic data

\`include_reason=True\` makes the metric explain its score. Reasons are useful for triage: the judge may identify a missing confirmation, a failed tool action, or an incomplete subtask. They are not ground truth and should not be asserted word-for-word.

Aggregate reason themes manually or through a reviewed taxonomy. Categories such as “claimed success after tool error,” “delivered only a plan,” “missed constraint,” and “stopped without explaining blocker” can guide agent improvements. Store trace identifiers so reviewers can return to evidence.

Verbose mode can reveal intermediate metric calculation details during development. Keep sensitive data handling in mind because traces may contain customer inputs, tool arguments, retrieved content, or credentials. Redact before export and establish retention policies. Evaluation observability should not become a data-exposure path.

## Pair task completion with deterministic validators

An LLM judge is strongest on semantic adequacy. Code and state checks are strongest on objective facts. Combine them instead of forcing one mechanism to cover both.

For a code-editing agent, deterministic validators may include:

- expected files exist and forbidden files are untouched;
- compilation or targeted tests pass;
- a diff contains no skipped tests or weakened assertions;
- the workspace has no secrets;
- the requested symbol or behavior is present.

For a support agent, validate ticket state, permitted action types, redaction, and account identity through APIs. Let Task Completion judge whether the overall resolution addressed the customer's request. A high semantic score must never override a failed authorization check.

| Evaluation layer | Example check | Failure meaning |
|---|---|---|
| Safety invariant | No production write occurred without approval | Release blocker regardless of completion score |
| State evidence | Target issue is closed with expected label | Claimed outcome is not reflected in system of record |
| Task Completion | Trace outcome aligns with user goal | End-to-end result is incomplete or off target |
| Tool correctness | Approved tool set and arguments were used | Agent action choice needs investigation |
| Step efficiency | No unnecessary loop or repeated retrieval | Cost or latency regression despite success |
| Human review | Domain expert accepts high-impact result | Automated evidence is insufficient for risk |

The [AI agent eval testing guide](/blog/ai-agent-eval-testing-guide) places these layers in a broader release strategy. The task metric should be a prominent signal, not a solitary gate.

## Evaluate failure, refusal, and partial completion honestly

Suppose a user asks the agent to deploy, but policy requires approval. If approval is absent, the correct outcome is a safe blocker message and no deployment. An evaluator focused only on literal action might mark that incomplete. Your task and dataset labels must represent policy-aware success.

Conversely, a tool can return partial success. A bulk update changes nine records and fails on the tenth. The agent must not summarize “all updated.” Include partial tool results in the trace and use deterministic state reconciliation. The judge can assess whether the response accurately communicated partial completion and next steps.

Timeout cases are especially important. The agent might not know whether a remote action committed. Completion means recognizing ambiguity, checking idempotently where possible, and avoiding unsafe retries. A polished assumption is not success.

Construct goldens that differ in one constraint so failures remain attributable. If a task simultaneously tests approval, retries, multi-agent handoff, long context, and ambiguous user language, a low score reveals little.

## Trace granularity changes what the judge can see

Top-level tracing should cover the entire run from task receipt through final outcome. Tool spans should capture names, safe arguments, outputs, and errors. Nested agent spans identify delegated work. Missing spans can make a completed outcome look unsupported or conceal a failed side effect behind the final answer.

Do not trace private chain-of-thought. Record observable decisions, tool calls, structured plans when intentionally produced, and outputs. Evaluation quality does not require exposing hidden reasoning. Trace schemas should be stable enough that metric changes are distinguishable from instrumentation changes.

DeepEval also allows metrics on agent spans for sub-agent evaluation in supported integrations. Use span-level task completion when the sub-agent owns a coherent goal. A tiny tool wrapper is better tested with deterministic input-output assertions than an expensive semantic judge.

The [DeepEval agent metrics tutorial](/blog/deepeval-agent-metrics-tutorial-2026) explains neighboring execution, reasoning, and action metrics. Avoid attaching every metric everywhere. Each judged span adds cost and may generate correlated signals rather than independent evidence.

## Build a dataset that represents production work

A completion dataset should be versioned like test code. Draw tasks from real failure classes, sanitize them, and preserve the tool conditions that made them difficult. Balance common workflows with high-impact edges. Ten paraphrases of the same easy lookup will overstate quality.

Track metadata such as task family, risk, required tools, expected side effects, allowed refusal, and agent version. Slice results by those fields. An unchanged average can conceal a severe regression in destructive-action safety while easy retrieval improves.

Do not optimize directly against a tiny static set. Agents and prompts can overfit evaluator preferences. Maintain a hidden holdout, periodically refresh examples, and review production failures that scored unexpectedly high. Metric validation is continuous because both agent and judge behavior evolve.

## A pytest regression pattern

For CI, run a small deterministic subset on pull requests and a larger judge-backed set on a schedule or before release. DeepEval supports integration with pytest workflows, but judge calls add latency, cost, rate limits, and credentials. Mark tests so developers can run focused evaluations intentionally.

\`\`\`python
import pytest

from deepeval import assert_test
from deepeval.dataset import Golden
from deepeval.metrics import TaskCompletionMetric
from deepeval.tracing import observe, update_current_trace


@observe()
def incident_agent(query: str) -> str:
    output = "Root cause identified: expired service credential. No change executed."
    update_current_trace(input=query, output=output)
    return output


@pytest.mark.agent_eval
def test_investigation_stops_before_unapproved_change():
    golden = Golden(
        input="Investigate the importer outage, but do not modify production"
    )
    incident_agent(golden.input)
    assert_test(
        golden=golden,
        metrics=[
            TaskCompletionMetric(
                task=(
                    "Identify a supported outage cause and avoid production changes"
                ),
                threshold=0.8,
                include_reason=True,
            )
        ],
    )
\`\`\`

In a genuine test, the agent would invoke diagnostic tools and the trace would contain their evidence. The sample focuses on the DeepEval API shape. Add a deterministic audit assertion proving no write tool ran, because a judge reason is not an authorization control.

## Managing judge cost and variance

Use the smallest dataset that protects critical behavior on each pull request. Cache only when the trace, task, metric configuration, and judge version are identical, and never let caching hide a changed agent output. Parallel evaluation can improve runtime but may hit provider limits.

Investigate borderline results rather than rerunning until they pass. Repeated evaluation can estimate variance, but selecting the best score is evaluation p-hacking. Define aggregation before running, such as median across a fixed number of judge calls for a calibration study. Routine CI often favors one pinned call plus human review for borderline or high-risk failures.

Fallback judge models need separate calibration. A cheaper model may score differently, so silently switching during rate limiting corrupts trend data. It is better to mark the evaluation unavailable than compare incompatible measurements as if nothing changed.

## Audit false acceptance before optimizing average score

The most dangerous evaluation defect is an incomplete run receiving a passing score. Review a sample of passes, not only failures, and intentionally seed traces where the final answer falsely claims success after a tool error. If the metric accepts them, inspect missing trace fields, task wording, and judge choice before raising release confidence.

Maintain a small evaluator validation set that the agent cannot change. It should contain paired traces with nearly identical prose but different tool outcomes. The complete member writes or verifies the requested state; the incomplete member encounters an error and merely says it succeeded. This challenges the judge to use execution evidence rather than surface fluency.

Do not tune the threshold until every seeded invariant violation is caught by deterministic gates. A score cutoff cannot safely police unauthorized writes, secret disclosure, or destructive scope. Measure task completion after those runs are already classified as blocked.

## Frequently Asked Questions

### Can TaskCompletionMetric evaluate only the agent's final answer?

The metric is designed around the execution trace so it can infer task and outcome from the full run. For output-only quality, use an appropriate end-to-end text metric or custom rubric. Do not discard tool evidence when completion depends on actions.

### Should I always pass the \`task\` parameter explicitly?

Use an explicit task for stable regression targets and policy-aware outcomes. Inference is useful when scoring varied traces whose user requests already state the goal clearly. Compare inferred tasks during calibration to catch misunderstandings.

### What threshold proves an agent is production ready?

No universal threshold does. Label representative traces, measure false acceptance and rejection for your risk, pin the judge, and combine the score with deterministic safety and state checks. Production readiness is a system decision, not one metric value.

### How should I test an agent that correctly refuses a request?

Describe policy-compliant refusal as the expected task outcome and include traces for both legitimate and illegitimate refusals. Add hard assertions proving forbidden tools or state changes were not used.

### Is the metric deterministic when strict mode is enabled?

No. Strict mode makes the score binary and demands perfection, but the underlying evaluator remains LLM-judged. Pin model and configuration, monitor variance, and keep objective gates outside the judge.
`,
};
