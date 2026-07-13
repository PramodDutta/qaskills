import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing AI-Agent Infinite-Loop Detection',
  description:
    'Test AI-agent infinite-loop detection with step budgets, repeated-action fingerprints, progress signals, adversarial tools, and deterministic regression cases.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing AI-Agent Infinite-Loop Detection

At step 37, the agent calls \`search_orders({"email":"sam@example.test"})\` for the ninth time. Every response is identical, the transcript keeps growing, and the user has received no answer. The model may still believe another attempt will help. The runtime needs an independent circuit breaker that can recognize non-progress before token, time, or tool costs become unbounded.

Loop detection is not one counter. A hard step budget stops every trajectory eventually. Repeated-action detection catches exact cycles sooner. Progress signals prevent a useful iterative task from looking pathological. Testing must cover how those safeguards interact, including the recovery message and the audit evidence emitted when execution stops.

## Define a loop as repeated state without useful progress

Agents legitimately repeat actions. A paginated search uses one tool with changing cursors. A flaky service may justify one retry. A coding agent can run the same test after changing the file. The dangerous pattern is equivalent action against equivalent state, producing equivalent observation, without advancement toward a terminal condition.

Model each step as a record: tool name, normalized arguments, selected environment state, observation digest, progress marker, latency, and cost. Detection policies can then distinguish repetition from iteration.

| Trajectory | Same tool | Same arguments | New observation | Expected decision |
|---|---:|---:|---:|---|
| Retry after one 503 | Yes | Yes | Yes, status changes | Continue within retry policy |
| Pagination | Yes | No, cursor advances | Usually | Continue |
| Poll until job completes | Yes | Often yes | State advances | Continue within time budget |
| Identical lookup and result | Yes | Yes | No | Stop after repeat threshold |
| A -> B -> A -> B cycle | Alternates | Repeats by period | No | Stop via cycle detector |
| Test, edit, test | Test repeats | Same command | File state changed | Continue |

The runtime, not the prompt, must enforce the terminal bound. Prompting “do not loop” is useful guidance but not a resource-control mechanism.

## Put a hard budget around every run

Budgets should exist for steps, wall-clock time, tool calls, tokens, and monetary cost where measurable. One exhausted budget ends or pauses the run even if the model asks to continue. Keep the public reason specific so operators know whether the stop came from repetition or the absolute ceiling.

\`\`\`python
# agent_runtime.py
from dataclasses import dataclass
from time import monotonic
from typing import Any, Callable


class AgentBudgetExceeded(RuntimeError):
    pass


@dataclass(frozen=True)
class Budget:
    max_steps: int = 24
    max_tool_calls: int = 16
    max_seconds: float = 90.0


def run_agent(
    decide: Callable[[list[dict[str, Any]]], dict[str, Any]],
    call_tool: Callable[[str, dict[str, Any]], Any],
    budget: Budget = Budget(),
) -> dict[str, Any]:
    started = monotonic()
    history: list[dict[str, Any]] = []
    tool_calls = 0

    for step in range(1, budget.max_steps + 1):
        if monotonic() - started >= budget.max_seconds:
            raise AgentBudgetExceeded('wall_clock_budget')

        action = decide(history)
        if action['type'] == 'finish':
            return {'status': 'completed', 'answer': action['answer'], 'steps': step}
        if action['type'] != 'tool':
            raise ValueError(f"Unsupported action type: {action['type']}")

        tool_calls += 1
        if tool_calls > budget.max_tool_calls:
            raise AgentBudgetExceeded('tool_call_budget')
        observation = call_tool(action['name'], action.get('arguments', {}))
        history.append({'action': action, 'observation': observation})

    raise AgentBudgetExceeded('step_budget')
\`\`\`

The loop uses \`range(1, max_steps + 1)\`, so the maximum is unambiguous. Decide whether a final answer consumes a step and document it. Off-by-one disagreement between product metrics and tests makes incident review painful.

Test the enforcement with a model double that never finishes, not a live model that might cooperate:

\`\`\`python
# test_agent_runtime.py
import pytest

from agent_runtime import AgentBudgetExceeded, Budget, run_agent


def test_repeating_agent_stops_at_tool_budget() -> None:
    calls = 0

    def decide(_history):
        return {'type': 'tool', 'name': 'lookup_order', 'arguments': {'id': 'O-17'}}

    def tool(_name, _arguments):
        nonlocal calls
        calls += 1
        return {'status': 'pending'}

    with pytest.raises(AgentBudgetExceeded, match='tool_call_budget'):
        run_agent(decide, tool, Budget(max_steps=20, max_tool_calls=3, max_seconds=10))

    assert calls == 3
\`\`\`

The assertion proves the fourth tool invocation never happens. Testing only the exception would miss a guard placed after side effects.

## Fingerprint actions after semantic normalization

Exact JSON string equality is fragile. Object key order, whitespace, volatile request IDs, and default arguments can change without changing intent. Normalize arguments according to each tool's schema, then hash the canonical representation together with the tool name and relevant scope.

Do not remove every changing field. A pagination cursor is progress-bearing; stripping it would classify page traversal as a loop. A generated trace ID is usually noise. Tool owners should declare which fields affect semantic identity.

\`\`\`python
import hashlib
import json
from typing import Any


VOLATILE_FIELDS = {'request_id', 'trace_id', 'client_timestamp'}


def canonicalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: canonicalize(item)
            for key, item in sorted(value.items())
            if key not in VOLATILE_FIELDS
        }
    if isinstance(value, list):
        return [canonicalize(item) for item in value]
    if isinstance(value, str):
        return value.strip()
    return value


def action_fingerprint(tool_name: str, arguments: dict[str, Any]) -> str:
    payload = json.dumps(
        {'tool': tool_name, 'arguments': canonicalize(arguments)},
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()
\`\`\`

Store the normalized preview alongside the digest in restricted diagnostics. A hash alone proves equality but is difficult to debug. Redact secrets and personal fields before logging either representation.

## Detect consecutive repeats and short cycles separately

A consecutive threshold catches A, A, A. It does not catch A, B, A, B. Maintain a bounded window and test candidate periods, for example one through four actions. Require the sequence to repeat enough times and confirm observations do not show progress.

| Detector | Memory | Catches quickly | Common false positive |
|---|---:|---|---|
| Consecutive fingerprint count | Constant | Same call repeated | Intentional retry |
| Sliding-window cycle | Bounded | A-B or A-B-C cycles | Repeated workflow with changing state omitted |
| No-progress counter | Bounded | Different actions yielding no advancement | Long research task with weak progress signal |
| Hard total budget | Constant | Any runaway | Legitimate complex task at the ceiling |

A detector result should include the matched period and evidence: “period 2 repeated three times with unchanged observation digests.” This is more actionable than “agent looped.”

For detailed tool-call assertions and transcript baselines, see the [agent tool-use regression testing guide](/blog/agent-tool-use-regression-testing-guide-2026). Detection thresholds also need repeated evaluation because model trajectories vary, as discussed in the [non-deterministic AI-agent testing guide](/blog/ai-agent-testing-non-deterministic-guide).

## Make progress explicit where the domain allows it

Progress is easiest to measure in bounded tasks. A support agent can reduce unresolved required fields. A migration agent can increase passing checks. A research agent can add unique credible sources. A workflow agent can advance a server-side state machine.

Never accept the model's statement “I made progress” as the sole marker. Derive progress from environment observations: changed file digest, new cursor, different resource version, reduced failing-test set, newly satisfied constraint, or a successful transition.

Progress signals have different strength:

| Signal | Strength | Example |
|---|---|---|
| Terminal environment state | Strong | Payment status becomes refunded |
| Monotonic domain counter | Strong | 4 of 6 required records validated |
| New unique evidence | Moderate | Previously unseen document ID |
| Changed tool output | Weak to moderate | Search results reordered |
| Model self-report | Weak | “I am closer now” |

Reset a no-progress counter only on meaningful evidence. A timestamp changing in every response must not buy unlimited steps.

## Build adversarial tools for deterministic loop tests

Production tools are noisy and slow. Test doubles can produce exact trajectory shapes:

1. Constant tool: always returns the same successful payload.
2. Oscillating tool: alternates between states X and Y.
3. False-progress tool: changes a timestamp but nothing semantic.
4. Eventual tool: returns pending twice, then complete.
5. Cursor tool: uses distinct cursors until exhausted.
6. Hanging tool: never resolves until runtime cancellation.
7. Error tool: returns retryable and non-retryable failures.

These are not generic mocks. Each one targets a detector boundary. The eventual tool proves thresholds permit legitimate retries; the constant tool proves early stop; the cursor tool proves normalization preserves progress-bearing arguments.

Use a scripted decision model that returns a known action sequence. Live-model evaluation is useful later to estimate real false-positive and escape rates, but it should not replace deterministic unit tests of runtime policy.

## Test termination as a user experience

Stopping execution safely is only half the behavior. The user needs a bounded response that states what could not be completed, what was attempted, and what input or intervention could unblock it. It must not expose chain-of-thought, raw credentials, or an enormous transcript.

Assert the termination envelope:

\`\`\`json
{
  "status": "stopped",
  "reason": "repeated_action_cycle",
  "safe_message": "I could not confirm the order state after repeated checks.",
  "retryable": false,
  "evidence_id": "run_01J..."
}
\`\`\`

The UI should not offer an automatic “continue” button that simply resets counters. A continuation needs changed input, an expanded budget approved by policy, or a different recovery strategy. Otherwise the circuit breaker becomes decorative.

## Test wall-clock cancellation around hanging tools

A step counter cannot advance while a tool promise hangs. Put a deadline around each tool call and the overall run. In asynchronous Python, \`asyncio.wait_for\` can bound an awaited call; in JavaScript, an AbortSignal can be passed to cooperative tools and combined with a timeout. The runtime still needs a strategy for non-cooperative work, such as process isolation.

Verify three outcomes: the caller returns by the deadline, the tool receives cancellation where supported, and late completion cannot append to a closed transcript. Use a fake clock only if the timer library and event loop are modeled faithfully. A short real-time integration test can cover cancellation propagation without turning the whole suite slow.

## Calibrate thresholds with trajectories, not intuition

Collect redacted production-like traces or generate labeled simulations. Mark true loops, useful retries, polling, pagination, and long-but-progressing work. Replay them through candidate detectors without calling the model. Compare false stops, missed loops, stop latency, wasted tool calls, and user outcome.

No universal threshold fits all tools. A job-status poll might permit six equivalent calls over a minute. Repeating a money-transfer tool should be blocked by idempotency and policy before a second side effect. Set per-tool retry and repetition limits under a global run budget.

| Metric | Why it matters |
|---|---|
| Steps after last progress | Direct measure of wasted trajectory |
| Tool calls prevented | Cost and side-effect exposure reduced |
| False termination rate on labeled useful runs | User harm from aggressive detection |
| Detection reason distribution | Reveals which guard actually protects runs |
| Recovery success after user input | Validates stop message usefulness |

Treat approximate evaluation results as environment-specific, not universal performance claims.

## Side-effecting tools need stronger safeguards than loop detection

Repeated reads waste resources. Repeated writes can charge cards, send messages, delete records, or create tickets. Require idempotency keys, confirmation boundaries, authorization, and tool-specific policies. Fingerprinting is diagnostic protection, not transaction safety.

A repeated write with the same idempotency key may safely return the original result, which counts as stable completion rather than an invitation to retry forever. A changed key on every attempt must not evade duplicate-intent checks. Include stable business intent in a policy layer outside model-generated arguments.

## Test concurrency and resumed runs

Two workers operating on the same agent run can each see a local count below threshold and jointly exceed the budget. Store counters and terminal state atomically in the run coordinator. A compare-and-set or transactional update should ensure only one action is authorized for the next sequence number.

On resume after a crash, reload consumed budgets and recent fingerprints. Resetting all counters allows a loop to restart indefinitely across processes. Conversely, a user-edited goal may justify a new repetition window while retaining global cost history. Tests should distinguish machine retry, user continuation, and a genuinely new run.

## Include planner loops that never call a tool

Some runs consume tokens without tool calls. The model may repeatedly revise a plan, emit empty assistant messages, alternate between “thinking” states, or request the same clarification after receiving an answer. A tool-call counter cannot see these loops, so step and wall-clock budgets remain essential.

Fingerprint externally visible assistant actions as well as tools. Normalize empty content, structured plan updates, and clarification requests carefully. Two questions with cosmetic wording differences can represent the same blocked state. Semantic similarity can help triage, but deterministic fields such as requested input keys are safer for enforcement.

Test a scripted model that returns five empty messages, one that alternates two plan objects, and one that keeps requesting an already-provided field. The runtime should report a reason distinct from repeated tool action so owners can fix prompting, state injection, or parsing.

## Verify detector state is bounded and private

A guard can become its own resource leak if it retains complete observations forever. Store a fixed-size fingerprint window and aggregate counters. Send detailed traces to a governed diagnostic store only when necessary. A unit test can run thousands of scripted steps against an intentionally high budget and assert the in-memory window never exceeds configuration.

Observation normalization must happen after secret removal. Hashing a secret is not redaction, especially for low-entropy values. Inject canary credentials into tool output and verify they appear neither in loop evidence nor exception messages.

## Replay policy changes against recorded trajectories

Thresholds and normalizers evolve with tools. Before deployment, replay a versioned corpus of labeled trajectories through old and new policies. A rule that strips \`page\` from search arguments might classify legitimate pagination as repetition. A tool version that renames \`cursor\` might bypass an exemption.

Record the detector version with each stop. Compare terminal reason, stopping step, and remaining budget. Review earlier stopping as carefully as later stopping because it can mean improved protection or a false positive.

Keep replay data independent of provider SDK objects. A minimal redacted action-observation schema remains executable when response types change.

## Monitor loops without rewarding activity

Dashboards should show loop stops, budget stops, steps after last verified progress, and repeated high-risk writes. Raw completion length is not success. An agent that burns twenty steps can look more active than one finishing correctly in four.

Segment alerts by tool and task class. A rise in two-action cycles after a search API release points to a tool contract regression, while empty-action loops after a model upgrade suggest parsing or prompting. Sample stopped trajectories under privacy controls and convert confirmed incidents into deterministic regression cases.

Retain the exact policy version for auditability.

## Frequently Asked Questions

### What is a reasonable maximum number of agent steps?

There is no tool-independent number. Derive it from task classes, tool costs, expected useful trajectories, and acceptable latency. Always set a finite global ceiling, then use stricter per-tool and no-progress limits where risk is higher.

### Will temperature zero eliminate infinite loops?

No. More deterministic sampling can make a loop reproducible, but a model can still repeatedly choose the same unproductive action. Runtime enforcement is required regardless of sampling settings.

### How do I avoid stopping legitimate polling?

Give polling an explicit policy with interval, deadline, allowed states, and a progress-bearing version when available. Exempting a poll tool entirely is unsafe. Test constant pending, eventual success, terminal failure, and timeout.

### Should observation content be part of the fingerprint?

Track action and observation fingerprints separately. Equivalent action plus changed meaningful observation can be progress. Equivalent action plus equivalent redacted observation is stronger loop evidence. Do not hash volatile fields as though they were progress.

### Can the model decide whether it is stuck?

It can supply a useful signal or choose to ask for help, but it must not be the only authority. An independent runtime owns budgets, repetition detection, cancellation, and terminal state because those controls protect resources even when reasoning fails.
`,
};
