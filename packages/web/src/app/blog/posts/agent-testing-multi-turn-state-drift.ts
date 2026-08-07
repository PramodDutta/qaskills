import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent Testing for Multi-Turn State Drift in Real Workflows',
  description: 'Apply agent testing multi turn state drift checks to catch forgotten constraints, corrupted memory, repeated actions, and unsafe goal changes before release.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# Agent Testing for Multi-Turn State Drift in Real Workflows

Agent testing for multi-turn state drift verifies that an agent preserves the right goals, constraints, facts, permissions, and completed work as a conversation evolves. A reliable test does more than compare the last response with a golden paragraph. It records the expected state after every turn, observes tool calls and state writes, introduces controlled distractions or corrections, and detects the first point where the agent's working state diverges from the user's state.

The central technique is a state ledger. Model each important fact with a source, scope, version, and status. After every user message, tool result, summary, or handoff, compute the expected ledger and compare it with the agent's observable behavior. Evaluate whether the agent retained active constraints, replaced superseded values, avoided repeating completed actions, and asked for authority when a new request exceeded the original scope.

This method produces actionable failures. Instead of reporting "turn 12 was wrong," QA can say "the shipping-country constraint was lost during compaction at turn 8, causing the agent to call an ineligible rate tool at turn 10." That precision matters when AI coding agents operate over repositories, browsers, test systems, and external services.

## Define state drift by consequence, not wording

Conversation text changes naturally. An agent can paraphrase a requirement without losing it, so lexical similarity is a poor drift oracle. State drift exists when the agent's effective beliefs or planned actions no longer match the conversation's currently valid commitments.

Track several state classes because they fail differently:

| State class | Example | Correct transition | Harmful drift |
|---|---|---|---|
| Goal | Diagnose a failing checkout test | Remains active until answered or replaced | Agent starts refactoring unrelated code |
| Constraint | Do not modify production data | Persists across every turn | Later tool call writes to production |
| Mutable fact | Target branch is \`release/august\` | New explicit branch replaces old one | Agent uses the superseded branch |
| Permission | Read repository, do not deploy | Expands only with clear authorization | Agent interprets urgency as deploy approval |
| Completion | Fixture file already created | Moves from pending to complete | Agent creates it again with different data |
| Uncertainty | Browser locale is unknown | Resolved by evidence or question | Agent silently assumes a locale |

Classify drift severity by consequence. A formatting preference lost for one reply is not equivalent to a discarded safety boundary. Suggested levels are informational, task-quality, costly, and unsafe. The labels can differ, but the rubric must make release decisions consistent.

Do not define every noun as persistent state. A user may mention an example without making it a requirement. The oracle needs scope rules: explicit instructions outrank inferred preferences, later corrections supersede earlier mutable facts, and permissions do not expand through implication.

## Build a canonical ledger for every scenario

A test scenario should carry machine-readable expected state alongside the natural conversation. Each ledger entry needs a stable key, current value, provenance turn, persistence rule, and sensitivity. That structure lets the runner calculate changes rather than asking a judge model to reconstruct the entire history unaided.

\`\`\`ts
type Persistence = 'turn' | 'task' | 'session' | 'until-replaced';
type Sensitivity = 'normal' | 'costly' | 'safety-critical';

export interface StateEntry {
  key: string;
  value: unknown;
  sourceTurn: number;
  persistence: Persistence;
  sensitivity: Sensitivity;
  status: 'active' | 'superseded' | 'completed' | 'revoked';
}

export interface TurnFixture {
  turn: number;
  userMessage?: string;
  toolResult?: unknown;
  expectedState: StateEntry[];
  allowedActions: string[];
  forbiddenActions: string[];
}
\`\`\`

Suppose a user asks an agent to repair a flaky Playwright test, permits edits only in \`tests/checkout.spec.ts\`, and says not to change application code. At turn four, the user corrects the target browser from Chromium to Firefox. At turn seven, a tool result shows the test now passes. The expected ledger should mark Firefox active, Chromium superseded, the file boundary still active, and the repair action complete.

Store both the full expected ledger and the delta introduced by each turn. The full form makes assertions simple; the delta exposes fixture mistakes. Code review can see precisely why a state change is expected.

\`\`\`json
{
  "turn": 4,
  "delta": [
    {
      "op": "supersede",
      "key": "browser",
      "oldValue": "chromium",
      "newValue": "firefox"
    }
  ],
  "mustRetain": [
    "editablePaths",
    "noApplicationCodeChanges",
    "diagnosticGoal"
  ]
}
\`\`\`

The ledger is an oracle, not necessarily the agent's internal memory format. Tests should not require a particular framework or hidden chain of thought. Compare observable state surfaces: structured plans, tool arguments, emitted summaries, repository changes, final claims, and any application-defined memory object.

## Design turns that isolate the source of drift

Real conversations mix corrections, interruptions, tool errors, and long outputs. A useful suite varies one pressure at a time before combining them. Start with a short control case, then extend it with a single stressor while holding the desired outcome constant.

| Stressor | Test insertion | Expected invariant |
|---|---|---|
| Distance | Add several relevant but non-mutating turns | Early constraints remain active |
| Distraction | Ask a side question, then resume | Main goal and completion state survive |
| Correction | Replace a previously stated value | Only the newest value drives action |
| Tool contradiction | Tool reports evidence against an assumption | Evidence updates belief, not permission |
| Compaction | Replace history with a summary at a known turn | Critical ledger entries survive summary |
| Failed action | Return timeout or partial tool result | Agent does not mark work complete |
| Handoff | Give another agent or process a summary | Ownership and pending tasks remain correct |

Use paired scenarios. In one, the user says "keep the original database"; in the other, the user explicitly authorizes migration. The correct action must change. Paired cases catch evaluators that reward a memorized refusal or a habitual tool sequence rather than state-sensitive behavior.

Include irrelevant facts that resemble constraints but are not instructions. For example, a tool log might mention that a previous run used staging. The agent should not overwrite the user's explicit request to use a local test container merely because a recent tool result contains the word staging.

## Capture an event trace instead of grading only the final answer

The last response can look correct after the agent made a dangerous call and recovered. Conversely, a terse final answer can be valid even if it does not repeat every constraint. Grade the trajectory.

A minimal trace records inbound events, state operations, assistant messages, tool requests, tool results, and checkpoints:

\`\`\`ts
export type TraceEvent =
  | { kind: 'user'; turn: number; text: string }
  | { kind: 'assistant'; turn: number; text: string }
  | { kind: 'tool-call'; turn: number; tool: string; args: unknown }
  | { kind: 'tool-result'; turn: number; tool: string; result: unknown }
  | { kind: 'state-write'; turn: number; key: string; value: unknown }
  | { kind: 'summary'; turn: number; text: string };

export interface Checkpoint {
  afterTurn: number;
  expectedActiveKeys: string[];
  expectedCompletedKeys: string[];
  prohibitedToolCalls: string[];
}
\`\`\`

Instrument the agent adapter rather than parsing console logs when possible. Tool names and arguments should be structured. Preserve tool results exactly, with secrets redacted, because an apparently irrational state update may be a reasonable reaction to an unexpected result.

Add a deterministic trace assertion for permissions and irreversible actions. A semantic judge can assess whether a final explanation respects a nuanced goal, but it should not be the only guard preventing an unauthorized deployment.

\`\`\`ts
export function assertNoForbiddenCalls(
  events: TraceEvent[],
  forbidden: Array<{ tool: string; environment?: string }>,
) {
  for (const event of events) {
    if (event.kind !== 'tool-call') continue;

    const match = forbidden.find((rule) => {
      if (rule.tool !== event.tool) return false;
      if (!rule.environment) return true;
      const args = event.args as Record<string, unknown>;
      return args.environment === rule.environment;
    });

    if (match) {
      throw new Error(
        \`Forbidden tool call at turn \${event.turn}: \${event.tool}\`,
      );
    }
  }
}
\`\`\`

## Assert state transitions with explicit rules

Build transition rules for the categories your agent supports. Mutable facts can be replaced by a newer explicit user statement. Safety constraints persist until explicitly revoked. Completed actions remain complete unless evidence shows rollback or failure. A tool result can update factual belief but should not grant new authority.

The reducer below illustrates these distinctions without claiming to implement every conversational nuance:

\`\`\`ts
interface StateDelta {
  operation: 'set' | 'complete' | 'revoke';
  key: string;
  value?: unknown;
  source: 'user' | 'tool' | 'agent';
  turn: number;
}

export function applyDelta(
  ledger: Map<string, StateEntry>,
  delta: StateDelta,
) {
  const current = ledger.get(delta.key);

  if (delta.operation === 'revoke' && delta.source !== 'user') {
    throw new Error('Only an authorized user event may revoke a constraint');
  }

  if (current && delta.operation === 'set') {
    ledger.set(\`\${delta.key}:turn:\${current.sourceTurn}\`, {
      ...current,
      status: 'superseded',
    });
  }

  ledger.set(delta.key, {
    key: delta.key,
    value: delta.value ?? current?.value,
    sourceTurn: delta.turn,
    persistence: current?.persistence ?? 'task',
    sensitivity: current?.sensitivity ?? 'normal',
    status: delta.operation === 'complete' ? 'completed' :
      delta.operation === 'revoke' ? 'revoked' : 'active',
  });
}
\`\`\`

Use the reducer to generate expected state from reviewed fixture deltas. Do not use it to infer what a natural-language turn means without test author review. The extraction layer can be model-assisted, but the expected transition for a release test should be stable and inspectable.

For broad agent lifecycle coverage around tools, planning, and recovery, align these cases with the [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026). When state is carried through tool servers, pair conversational checks with the boundary scenarios in [MCP servers for test automation](/blog/mcp-servers-test-automation-2026), especially malformed results, timeouts, and permission failures.

## Score retention, replacement, and completion separately

A single pass percentage hides the failure mechanism. Calculate component metrics at each checkpoint and preserve severity-weighted failures.

| Metric | Passing condition | Common false positive |
|---|---|---|
| Constraint retention | Every active constraint affects relevant behavior | Agent repeats constraint but violates it in a tool call |
| Supersession accuracy | New value used, old value ignored | Response mentions both without choosing |
| Completion integrity | Completed action is not repeated | Agent trusts its own claim despite failed tool result |
| Scope fidelity | Actions remain inside authorized resources | Benign extra edit is counted as helpful |
| Recovery coherence | Error changes plan without changing goal | Retry loop appears persistent but makes no progress |
| Handoff fidelity | Summary preserves critical active and pending items | Fluent summary omits one safety condition |

One practical score weights entries by sensitivity, but a weighted average must never cancel a safety-critical violation. Use a hard veto for forbidden actions, then report weighted quality among otherwise eligible runs.

\`\`\`ts
interface CheckResult {
  key: string;
  passed: boolean;
  weight: number;
  safetyCritical: boolean;
}

export function evaluateCheckpoint(results: CheckResult[]) {
  const veto = results.some(
    (result) => result.safetyCritical && !result.passed,
  );
  const totalWeight = results.reduce((sum, result) => sum + result.weight, 0);
  const earnedWeight = results.reduce(
    (sum, result) => sum + (result.passed ? result.weight : 0),
    0,
  );

  return {
    eligibleForRelease: !veto,
    qualityScore: totalWeight === 0 ? 1 : earnedWeight / totalWeight,
  };
}
\`\`\`

Report first divergence turn as a primary diagnostic. Later errors may all be consequences of that first loss. Also report recovery: if the user restates a constraint and the agent returns to correct behavior, the run still contains a drift failure, but recovery quality matters for product behavior.

## Exercise summaries, memory stores, and context boundaries

Long-running agents commonly compress history or write selected facts to memory. Test those transitions directly. Run a scenario without compaction as the control, then trigger compaction at predetermined turns and compare observable actions.

The summary should preserve active goals, non-negotiable constraints, granted permissions, pending actions, completed actions, unresolved uncertainties, and the newest version of mutable facts. It should omit obsolete values unless needed to explain why they must not be used. It should not promote an assistant assumption into a user instruction.

Create a summary audit that looks for semantic state rather than exact sentences:

\`\`\`ts
interface SummaryAudit {
  requiredConcepts: Array<{ key: string; acceptablePhrases: string[] }>;
  forbiddenConcepts: Array<{ key: string; phrases: string[] }>;
}

export function exactPhraseAudit(summary: string, audit: SummaryAudit) {
  const normalized = summary.toLowerCase();
  const missing = audit.requiredConcepts.filter((concept) =>
    !concept.acceptablePhrases.some((phrase) =>
      normalized.includes(phrase.toLowerCase()),
    ),
  );
  const retainedObsolete = audit.forbiddenConcepts.filter((concept) =>
    concept.phrases.some((phrase) =>
      normalized.includes(phrase.toLowerCase()),
    ),
  );
  return { missing, retainedObsolete };
}
\`\`\`

Phrase checks are a deterministic first layer, not a complete semantic evaluator. Pair them with behavioral continuation: resume from the summary alone, present the next user turn, and observe whether the agent takes the same allowed action as the full-history control.

Memory tests should cover conflicting entries and tenant separation. Write a preference in session A, replace it in session B if the product promises cross-session memory, and verify the newest authorized value wins. Also assert that facts from another user or workspace never appear. State drift and state leakage are related but distinct defects, and leakage demands a security-level response.

## Diagnose a realistic repeated-action failure

Imagine an agent creates a test account at turn five. The tool returns HTTP success with account ID \`qa-381\`. After a long log at turn eight, conversation compaction occurs. At turn ten the agent says it still needs an account and creates \`qa-944\`, causing duplicate billing data.

The final response may look excellent, so inspect the trace:

1. Confirm the first tool result contained an unambiguous success and stable identifier.
2. Check whether the pre-compaction ledger marked \`testAccount\` complete.
3. Inspect the generated summary for the completed action and account ID.
4. Check whether the resumed planner read the summary or loaded a stale checkpoint.
5. Verify whether a tool retry policy treated a delayed acknowledgment as failure.
6. Assert that the second create call lacked an idempotency safeguard if the API supports one.

If the summary omitted the account, the defect lies in state selection or compaction. If the summary contains it but the planner ignores it, the defect lies in state consumption. If the result was ambiguous, improve the tool contract and teach the planner to verify rather than repeat. If the second call was a legitimate retry after a transport uncertainty, use an operation identifier so repeated requests converge on one resource.

What people often get wrong is seeding a long prompt and checking only recall questions such as "what browser did I name?" Recall is useful, but an agent can recite Firefox and still run Chromium. The meaningful oracle is whether retained state governs plans, tool arguments, edits, and completion decisions.

## Make nondeterministic runs reproducible enough to debug

An agent may drift only on some runs. Preserve model identifier, sampling settings exposed by the platform, prompt and policy revisions, tool schemas, retrieved memory, compaction events, and sanitized tool results. Use stable fixtures and fake external systems for pre-release tests so environment variation does not dominate model variation.

Run a scenario multiple times and report both pass rate and failure signatures. Do not merge distinct failures into one average. A 90 percent pass rate could mean one recurring lost constraint or ten unrelated rare problems. Cluster by first divergence key, turn, and action consequence.

Where supported, replay recorded tool results to isolate reasoning from external variance. Then run a smaller live-tool suite to validate integration. Replay should preserve ordering and errors, not merely successful payloads.

Keep judge prompts versioned and blind them to the candidate model name. Require judges to return the violated ledger key, evidence event, and confidence. Send borderline semantic cases for human review, while deterministic forbidden-call and file-diff checks remain authoritative.

## Gate releases on scenario families, not one marathon conversation

Organize CI into fast deterministic transition tests, medium behavioral scenarios, and scheduled endurance conversations. The fast layer catches schema, reducer, and permission regressions. The behavioral layer covers corrections, interruptions, failures, and compaction. The endurance layer explores longer distances and memory lifecycle issues.

An illustrative suite manifest keeps scenario intent visible:

\`\`\`yaml
suites:
  pull_request:
    repetitions: 1
    scenarios:
      - constraint-retention-after-tool-error
      - corrected-browser-selection
      - completed-action-not-repeated
  nightly:
    repetitions: 10
    scenarios:
      - compaction-at-multiple-boundaries
      - cross-session-preference-replacement
      - interrupted-workflow-resumption
      - long-log-distraction

releaseRules:
  safetyCriticalViolations: 0
  requiredScenarioPassRate: 1
  nightlyQualityFloor: 0.95
\`\`\`

These numbers illustrate structure, not a universal policy. Choose repetitions and floors based on consequence, observed variance, and execution cost. Any unsafe action should normally block regardless of the average.

When a scenario fails, save the minimal trace slice from the last passing checkpoint through the first divergence, plus the relevant ledger entries. That artifact is far easier for an engineer or coding agent to inspect than a hundred-page transcript.

## Frequently Asked Questions

### How many turns are needed to test state drift?

Use the fewest turns that exercise the transition under test, then add longer variants for distance and compaction. A correction defect may appear in three turns, while a completion-loss defect may require a tool result, several intervening events, and a summary boundary. Turn count itself is not coverage. Name the state pressure, identify the checkpoint where it should matter, and include a short control. Scheduled endurance runs can explore longer histories, but pull-request tests should remain small enough that the first divergence is obvious and reruns are affordable.

### Can an LLM judge be the state oracle?

An LLM judge can help assess semantic goal fidelity, but it should not be the sole oracle. Keep permissions, file boundaries, completed operations, exact tool arguments, and forbidden actions in deterministic assertions. Give the judge a reviewed ledger and trace rather than asking it to infer all requirements from a huge transcript. Require structured evidence for every verdict and calibrate it against human-labeled cases. This division uses semantic judgment where language varies while keeping high-consequence boundaries stable, explainable, and resistant to evaluator drift.

### What is the difference between state drift and hallucination?

Hallucination is unsupported or fabricated content. State drift is a mismatch between the agent's effective working state and the conversation's currently valid state. They can overlap: an agent may invent that a task was completed, or forget a completed action and repeat it. They can also occur separately. An answer may contain a fabricated package name while preserving every user constraint, or use a real but superseded branch name. Tag failures by the earliest causal category so teams do not try to fix memory selection with a factuality prompt, or factual grounding with a larger memory window.

### How should tests handle a user who changes the goal mid-conversation?

Model an explicit replacement as a state transition, not automatically as drift. Mark the old goal superseded, preserve constraints that still apply, cancel or reconcile pending actions, and ask for clarification when old and new goals conflict. The scenario should specify whether completed artifacts remain useful and whether new authority is required. Test both a clear replacement and an ambiguous side request. A capable agent should follow the clear new goal, while the ambiguous case should preserve the current goal and seek direction before taking an expensive or irreversible action.
`,
};
