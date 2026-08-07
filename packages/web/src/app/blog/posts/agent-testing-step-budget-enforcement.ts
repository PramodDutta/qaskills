import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent Testing Step Budget Enforcement: Stop Loops Without Hiding Failures',
  description: 'Implement agent testing step budget enforcement with typed counters, trace assertions, loop detection, and CI tests that keep autonomous runs bounded.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# Agent Testing Step Budget Enforcement: Stop Loops Without Hiding Failures

Agent testing step budget enforcement places a hard, observable limit on actions an AI agent may take during one run. Count model turns, tool attempts, successful tool calls, retries, and wall-clock time separately; check limits before the next costly action; return a typed budget-exhausted result; and assert the full trace in tests. A single generic “max steps” integer is too ambiguous for reliable control.

The goal is not simply to make runaway agents cheaper. A step budget defines the maximum autonomy granted to a task. It prevents cyclic plans, repeated side effects, unbounded browsing, tool retry storms, and long CI hangs. It also exposes planning regressions: if a previously three-step workflow suddenly needs twelve actions, the agent may still produce a correct final answer while its reliability has degraded.

This guide builds a framework-neutral TypeScript harness that QA engineers can adapt around an agent loop. The examples avoid undocumented SDK flags. They implement counters, guards, trace events, fixtures, and release rules in ordinary code so the policy stays under your control.

## Decide what a step means in your system

Teams often argue about the limit before defining the unit. A model response that requests three tools could count as one turn, three tool calls, four actions, or more if retries occur. All are valid measurements, but they answer different risk questions.

| Counter | Increment point | Risk controlled | Common blind spot |
|---|---|---|---|
| Model turns | Before each model request | Reasoning cost and latency | One turn may request many tools |
| Tool attempts | Before each tool invocation | Side-effect exposure | Includes calls rejected before execution |
| Tool successes | After successful completion | Completed external work | Retry storms disappear from count |
| Retries | When an action is repeated after failure | Instability and provider pressure | Requires a repeat definition |
| Unique tools | First use of a tool name | Capability breadth | Repeated misuse of one tool is hidden |
| Elapsed time | From run start to current check | User wait and CI occupancy | Does not cap rapid expensive calls |
| Token or cost estimate | From provider usage when available | Spend | Usage metadata may be delayed or absent |

Use multiple dimensions. For example, a read-only research agent might allow many search calls but little elapsed time, while an agent that can modify tickets might permit only two write attempts. Keep successful calls distinct from attempts because an agent that retries five failing writes has created operational pressure even when none succeeds.

Define a “step” only for presentation. Internally retain precise counters. This makes a failure report say “tool attempt limit reached at 8” rather than “maximum steps exceeded,” which is far more actionable.

## Represent the budget as policy and runtime state

Separate immutable limits from mutable consumption. This prevents tests from accidentally sharing state and makes the accepted policy easy to review.

\`\`\`ts
export interface StepBudget {
  maxModelTurns: number;
  maxToolAttempts: number;
  maxToolSuccesses: number;
  maxRetriesPerAction: number;
  maxElapsedMs: number;
}

export interface BudgetUsage {
  modelTurns: number;
  toolAttempts: number;
  toolSuccesses: number;
  elapsedMs: number;
  retriesByAction: Record<string, number>;
}

export function initialUsage(): BudgetUsage {
  return {
    modelTurns: 0,
    toolAttempts: 0,
    toolSuccesses: 0,
    elapsedMs: 0,
    retriesByAction: {}
  };
}
\`\`\`

Validate policy at configuration load time. Negative limits, non-finite values, and a zero wall-clock allowance should fail immediately. Do not silently coerce malformed environment variables into permissive defaults.

\`\`\`ts
export function validateBudget(budget: StepBudget): void {
  const entries = Object.entries(budget);
  for (const [name, value] of entries) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(name + ' must be a non-negative finite number');
    }
  }
  if (budget.maxElapsedMs === 0) {
    throw new Error('maxElapsedMs must allow at least one operation');
  }
}
\`\`\`

Zero can still be meaningful for a capability-specific limit. A summarization task may allow zero tool attempts. The validation above permits that while requiring some elapsed-time envelope.

Budgets should be named profiles owned in source control. Avoid passing arbitrary numbers from a user prompt directly into the executor. A prompt can request urgency or depth, but authorization policy determines the actual ceiling.

| Profile | Model turns | Tool attempts | Intended task | Additional guard |
|---|---:|---:|---|---|
| summarize-local | 3 | 0 | Summarize supplied text | No external capability available |
| investigate-readonly | 8 | 12 | Inspect logs and documentation | Read-only tool allowlist |
| change-small | 6 | 8 | Edit a narrow code area | File scope and diff limit |
| external-write | 4 | 2 | Update a remote record | Idempotency and confirmation policy |

The numbers are illustrative. Derive real profiles from task complexity, side-effect risk, latency objectives, and observed successful traces.

## Check the budget before crossing the boundary

A guard that checks after a tool call has already happened cannot prevent the side effect. Reserve or consume allowance immediately before each model or tool request. Then record the outcome. For concurrency, reservation must be atomic within the run so two parallel calls cannot both consume the last slot.

This small controller returns a typed decision rather than throwing an unclassified exception.

\`\`\`ts
export type BudgetDimension =
  | 'model-turns'
  | 'tool-attempts'
  | 'tool-successes'
  | 'action-retries'
  | 'elapsed-time';

export type GuardResult =
  | { allowed: true }
  | { allowed: false; dimension: BudgetDimension; limit: number; observed: number };

export function guardModelTurn(
  budget: StepBudget,
  usage: BudgetUsage,
  nowMs: number,
  startedMs: number
): GuardResult {
  const elapsed = nowMs - startedMs;
  if (elapsed >= budget.maxElapsedMs) {
    return {
      allowed: false,
      dimension: 'elapsed-time',
      limit: budget.maxElapsedMs,
      observed: elapsed
    };
  }
  if (usage.modelTurns >= budget.maxModelTurns) {
    return {
      allowed: false,
      dimension: 'model-turns',
      limit: budget.maxModelTurns,
      observed: usage.modelTurns
    };
  }
  usage.modelTurns += 1;
  return { allowed: true };
}
\`\`\`

Use greater-than-or-equal before increment. If the maximum is three and three turns have already been consumed, the fourth request must never leave the process. Unit tests should assert boundary behavior at limit minus one, exactly limit, and limit plus one represented by corrupted state.

Wall-clock checking needs an injected clock so tests do not sleep. Also use an actual request timeout around network operations. A budget check before a request does not help if that single request hangs forever. The timeout implementation depends on the HTTP or SDK client, but the test contract is universal: the operation must settle before the remaining run deadline.

## Emit a trace event for every reservation and outcome

Without a trace, a budget failure is only a symptom. Record an append-only event for planned actions, budget reservations, starts, successes, failures, retries, cancellations, and final status. Do not put secret arguments or raw sensitive data into unrestricted logs.

\`\`\`ts
export type TraceEvent =
  | { type: 'model-start'; turn: number; atMs: number }
  | { type: 'model-complete'; turn: number; atMs: number }
  | { type: 'tool-start'; tool: string; actionKey: string; attempt: number; atMs: number }
  | { type: 'tool-success'; tool: string; actionKey: string; atMs: number }
  | { type: 'tool-failure'; tool: string; actionKey: string; code: string; atMs: number }
  | { type: 'budget-exhausted'; dimension: BudgetDimension; atMs: number }
  | { type: 'run-complete'; atMs: number };

export interface AgentRunResult {
  status: 'completed' | 'budget-exhausted' | 'failed';
  finalText?: string;
  usage: BudgetUsage;
  trace: TraceEvent[];
  exhaustedDimension?: BudgetDimension;
}
\`\`\`

An action key identifies logical sameness for retry counting. It should be derived from a normalized intent, such as tool name plus stable target and operation, not from a model-generated narration that changes every turn. Never include secrets in the key.

Trace invariants make excellent deterministic tests:

- Every tool-success must have an earlier matching tool-start.
- No event may appear after run-complete.
- A budget-exhausted result must contain exactly one budget-exhausted event.
- Tool successes cannot exceed attempts.
- Counters must equal events after accounting for reservations cancelled before dispatch.
- External write actions require the project’s authorization and idempotency conditions.

These checks find harness defects even when the model output varies.

## Enforce per-action retries instead of trusting model memory

Telling an agent “do not retry more than twice” is not enforcement. The executor must calculate repetitions. A failing call may be retried with a slightly different explanation while targeting the same resource. Normalize the operation into an action key and count before dispatch.

\`\`\`ts
export function reserveToolAttempt(input: {
  budget: StepBudget;
  usage: BudgetUsage;
  actionKey: string;
}): GuardResult {
  const { budget, usage, actionKey } = input;

  if (usage.toolAttempts >= budget.maxToolAttempts) {
    return {
      allowed: false,
      dimension: 'tool-attempts',
      limit: budget.maxToolAttempts,
      observed: usage.toolAttempts
    };
  }

  const previous = usage.retriesByAction[actionKey] ?? 0;
  if (previous >= budget.maxRetriesPerAction + 1) {
    return {
      allowed: false,
      dimension: 'action-retries',
      limit: budget.maxRetriesPerAction,
      observed: previous - 1
    };
  }

  usage.toolAttempts += 1;
  usage.retriesByAction[actionKey] = previous + 1;
  return { allowed: true };
}
\`\`\`

In this representation, the first attempt is not a retry. The stored count tracks total attempts for the action, so maxRetriesPerAction plus one total calls are allowed. Naming and tests must make that convention explicit.

Not every failure is retryable. Invalid input, denied authorization, unknown tool, and policy rejection should stop or return control to planning without repeating the same call. Network interruption and a documented transient provider error might be retried, subject to idempotency. Centralize retry classification rather than asking the language model to infer it from prose.

| Failure class | Retry same action? | Budget treatment | Test expectation |
|---|---|---|---|
| Invalid arguments | No | Counts as attempt | Agent repairs plan or stops |
| Authorization denied | No | Counts as attempt | No second write attempt |
| Timeout before known completion | Only with idempotency strategy | Counts as attempt and retry | No duplicate side effect |
| Temporary read failure | Possibly | Counts as attempt and retry | Backoff remains within deadline |
| Unknown tool | No | Counts as attempt | Capability list is refreshed or run fails |
| Empty but valid result | Usually no blind retry | Counts as success if contract says valid | Agent changes query or concludes |

The dangerous case is an external write whose response times out after the server completed it. Retrying may duplicate the action. Step budgets limit damage but do not replace idempotency keys, read-after-write verification, or confirmation rules.

## Add loop detectors that fail earlier than the hard ceiling

A generous hard limit is a final safety net. Loop detection can stop obvious cycles sooner. Look for repeated normalized tool actions, alternating action patterns, identical error codes, or repeated model plans with no new evidence.

\`\`\`ts
export function hasRepeatedTail(values: string[], repetitions: number): boolean {
  if (repetitions < 2) return false;
  for (let width = 1; width * repetitions <= values.length; width += 1) {
    const tail = values.slice(values.length - width).join('|');
    let matches = true;
    for (let offset = 2; offset <= repetitions; offset += 1) {
      const end = values.length - width * (offset - 1);
      const start = end - width;
      if (values.slice(start, end).join('|') !== tail) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}
\`\`\`

Test both a single repeated action and a two-action cycle such as search, open, search, open. Avoid treating legitimate pagination as a loop. Include stable progress fields in the normalized key, such as page cursor or result revision, so each page is distinct.

A loop detector should return structured evidence: the repeated pattern, repetition count, and trace indices. That allows the final result to say why execution stopped. It also lets QA verify that a correct but repetitive batch workflow is not misclassified.

What people get wrong is lowering max steps until loops end quickly. That also breaks legitimate complex tasks. Pair a reasonable hard ceiling with semantic progress checks and capability-specific limits. The right question is not “How short can every run be?” It is “What evidence proves this run is still making authorized progress?”

## Test the boundary with scripted fake models and tools

Agent behavior is stochastic, but budget enforcement does not need to be. Use a scripted model that returns a predetermined sequence of tool requests and a fake executor that records dispatches. These tests should run quickly and never call a real provider.

\`\`\`ts
interface ScriptedTurn {
  kind: 'tool' | 'final';
  tool?: string;
  actionKey?: string;
  text?: string;
}

export class ScriptedModel {
  private index = 0;

  constructor(private readonly turns: ScriptedTurn[]) {}

  next(): ScriptedTurn {
    const turn = this.turns[this.index];
    this.index += 1;
    if (!turn) throw new Error('script exhausted');
    return turn;
  }
}

export class FakeTools {
  readonly calls: string[] = [];

  execute(tool: string, actionKey: string): { ok: true } {
    this.calls.push(tool + ':' + actionKey);
    return { ok: true };
  }
}
\`\`\`

Build a boundary matrix rather than one happy-path test.

| Scenario | Model script | Expected status | Critical assertion |
|---|---|---|---|
| Completes below limit | Two tools, final | completed | Final answer and exact counters |
| Exact model limit | Final on last allowed turn | completed | No off-by-one rejection |
| One turn too many | Tools consume all turns | budget-exhausted | Extra model request never sent |
| Tool storm | One turn requests many actions | budget-exhausted | Calls after limit never dispatched |
| Retry cycle | Same failed action repeats | budget-exhausted | Stops on per-action retry guard |
| Deadline | Fake clock advances | budget-exhausted | No network sleep in test |
| Invalid configuration | Negative limit | failed at startup | No model or tool call |

The most important assertion is absence: prove the forbidden next call did not happen. Checking only the final status can miss a controller that performs the action and then reports exhaustion.

Property-based tests can generate sequences of model turns and tool outcomes, then assert invariants such as toolAttempts never exceeding maxToolAttempts. If you add such a library, use its documented APIs for your installed version. The concept does not require a particular framework.

## Exercise the real integration with a small contract suite

After deterministic harness tests pass, run a narrow integration suite against the real agent stack. Use low-risk read-only tools, fixed fixtures, and tasks that intentionally require known numbers of actions. The purpose is to confirm adapters increment counters at the correct boundary and preserve trace fields.

For agents using Model Context Protocol tools, the [MCP servers for test automation guide](/blog/mcp-servers-test-automation-2026) helps validate tool discovery, input schemas, and error responses. Step-budget tests should sit above that contract layer. A server schema error and a controller retry defect are different failures, even if both end in exhaustion.

Useful integration cases include:

1. A one-tool lookup that completes comfortably below budget.
2. A multi-tool task that finishes on the exact final allowance.
3. A tool returning a permanent validation error, which must not be blindly retried.
4. A read request with a controlled transient failure, which may retry within policy.
5. A prompt injection in tool output asking the agent to ignore limits, which must have no effect because enforcement lives outside the prompt.

The [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) covers broader quality dimensions such as planning, tool selection, and outcome verification. Step budgets add a hard control plane. A capable planner cannot override it, and an agent that stays within budget can still be wrong. Evaluate boundedness and correctness as separate axes.

## Design the budget-exhausted user and caller contract

Exhaustion is an expected terminal state, not an uncaught crash. Return a typed result containing the exhausted dimension, usage, safe partial progress, and a trace reference. Do not claim the task completed. Do not automatically ask for a larger budget when the run was performing external writes or repeating errors.

| Caller context | Exhaustion response | Safe partial output | Next action |
|---|---|---|---|
| Interactive assistant | Explain limit and completed evidence | Read-only findings | User may narrow task or authorize continuation |
| CI evaluation | Fail case with trace artifact | Diagnostic summary | Engineer investigates regression |
| Background read task | Mark incomplete and retry only by scheduler policy | Checkpointed cursor | Resume with deduplication |
| External write workflow | Stop and reconcile side effects | Confirmed operation IDs | Human or controller decides continuation |

Continuation is a new policy decision. If the system supports resume, carry forward prior usage or issue a new explicitly scoped budget. Do not reset counters invisibly in a recursive call. Otherwise an agent can evade a ten-step limit by starting another ten-step child run repeatedly.

Child agents and delegated work need accounting rules. A strict global budget charges all descendants to the parent. A hierarchical policy allocates sub-budgets whose totals cannot exceed the remaining parent allowance. Whichever you choose, test that delegation does not create capacity from nothing.

## Diagnose rising step counts before widening limits

Imagine a repository agent that normally uses four tool calls to locate and edit a configuration file. After a prompt change, the median remains four but the high tail reaches the ten-call ceiling. Traces show alternating searches for the same filename with slightly different wording. The final answers are mostly correct, so an outcome-only evaluation misses the regression.

Use this sequence:

1. Compare step distributions by task slice and agent revision, not only the mean.
2. Find the first trace event where successful and exhausted runs diverge.
3. Group normalized repeated actions and error codes.
4. Confirm whether new evidence entered the context after each repeated action.
5. Check tool descriptions and result truncation for ambiguity.
6. Replay the failing trace with scripted outputs in the deterministic harness.
7. Repair planning, tool contract, or progress detection before changing the ceiling.

Sometimes a higher budget is justified. A new task scope may genuinely require more files or pagination. In that case, create or revise a named profile, document the expected action plan, and add a successful fixture near the new boundary. Do not change a global constant that silently expands autonomy for unrelated tasks.

Track percentile step usage, exhaustion rate, completion rate, retry rate, and successful outcomes per step bucket. Cost alone can mislead because a cheap loop is still a reliability defect. Also review exhaustion reasons. A spike in elapsed-time exhaustion points toward slow dependencies, while tool-attempt exhaustion with repeated action keys points toward looping.

## Enforce budgets in CI without making stochastic output the gate

The pull-request gate should emphasize deterministic controller tests and a fixed integration subset. Larger sampled agent evaluations can run on a schedule or before release. Store trace artifacts whenever an assertion fails.

\`\`\`yaml
name: agent-budget-tests

on:
  pull_request:

jobs:
  bounded-execution:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:agent-budget
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: agent-budget-traces
          path: artifacts/agent-budget
\`\`\`

Keep release policy multidimensional. Zero calls beyond the configured limit is a hard invariant. Completion-rate changes require statistical interpretation. New external write capabilities require a security and authorization review, not merely a larger number.

A useful scorecard records configuration revision beside results. Otherwise an exhaustion-rate improvement caused by doubling the limit looks like a planning improvement. Trend charts should mark policy changes and compare matched task sets.

## Frequently Asked Questions

### Should model turns and tool calls share one step limit?

Usually not. They consume different resources and create different risks. One model turn may request several tools, and one tool failure may cause several reasoning turns. Separate limits make failures diagnostic and prevent a cheap counter from masking an expensive or side-effecting one. You can still display a combined progress indicator to users, but enforcement should preserve model turns, tool attempts, successes, retries, and elapsed time as distinct dimensions with their own trace events.

### What status should an agent return when its budget is exhausted?

Return a typed incomplete result such as budget-exhausted, not completed and not a generic internal error. Include the exhausted dimension, configured limit, observed usage, safe partial progress, and a trace reference. The caller can then decide whether to narrow the task, resume under an explicit new policy, or investigate a loop. For external writes, reconcile confirmed side effects before any continuation. Never imply success merely because the agent produced fluent final text after hitting the boundary.

### Can prompt instructions enforce a step budget by themselves?

No. Prompt instructions can encourage efficient planning, but they are not a control boundary. Models can misunderstand, forget, or be influenced by untrusted tool output. The executor must check counters before model and tool requests and refuse dispatch when a limit is reached. Keep the prompt informed about remaining allowance if that improves planning, but test that a prompt injection asking to ignore limits cannot change controller behavior. Enforcement belongs in code outside the model’s decision authority.

### How do step budgets work with delegated or child agents?

Choose an explicit accounting model. A global model charges every descendant action to the parent run. A hierarchical model assigns child allowances drawn from the parent’s remaining budget, so the sum cannot exceed the authorized total. Record parent and child run IDs in the trace and prevent recursive delegation from resetting counters. Tests should create nested tasks at the boundary and prove that an extra child cannot manufacture new tool capacity. External side-effect limits should generally remain global across the whole task tree.
`,
};
