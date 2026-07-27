import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Parallel tool call ordering tests',
  description:
    'Parallel tool call ordering tests: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Parallel tool call ordering tests',
  keywords: [
    'Parallel tool call ordering tests',
    'how to parallel tool call ordering tests',
    'parallel tool call ordering tests example',
    'parallel function call dependency test',
    'agent tool join ordering',
    'concurrent tool result correlation',
  ],
  relatedSlugs: [
    'how-to-test-llm-tool-calling-accuracy',
    'agent-tool-use-regression-testing-guide-2026',
    'ai-agent-eval-testing-guide',
    'openai-trace-grading-tutorial-2026',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/function-calling',
    'https://platform.openai.com/docs/guides/evals',
    'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
  ],
  repoEvidence: [
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'seed-skills/openai-evals-trace-grading/SKILL.md',
  ],
  content: `Parallel tool call ordering tests control completion instead of trusting wall-clock timing. Independent calls must dispatch before either resolves, dependent calls must wait for declared prerequisites, every result must join through its call ID, and side effects must follow policy order. A structured event ledger supplies the release oracle for every branch.

## What must Parallel tool call ordering tests prove?

Parallel tool call ordering tests must prove four related contracts without treating them as one vague sequence. Peer work fans out, edges constrain dispatch, results correlate to requested calls, and state-changing actions follow their declared order.

Overlap does not require peer operations to finish in request order. A weather lookup may complete after an account lookup, yet both results remain correct when each joins through its one-off call ID.

Edge order has a different rule. A charge operation cannot start before access check succeeds, even when the agent emits both proposed calls in one planning response.

Side-effect order also needs explicit rule. Two read-only calls may overlap, while two writes to the same record may require serialization or optimistic conflict handling.

The [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling) describes tool calls and their identifiers in the request-response flow. The harness should retain those identifiers through dispatch, finish, result submission, and trace grading.

Do not infer success from the final assistant answer alone. Swapped results can produce plausible text, and an early side effect can be hidden after later cleanup.

Define an event vocabulary before implementation. Useful event types include planned, dispatched, completed, linked, joined, side-effect-started, side-effect-committed, rejected, and cancelled.

Each event needs run ID, case ID, call ID, tool name, edge IDs, sequence number, and safe timestamp. Sequence numbers express observed order, while controlled promises make the test fixed.

The [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) covers selection and args. Parallel tool call ordering tests own fan-out, fan-in, edge edges, result ID match, and ordered effects.

Browse the [QA skills directory](/skills) for wider agent testing patterns, but keep this gate exact. A pass requires the complete event ledger and expected final state, not merely two tool outputs.

## Which repository behavior defines the test contract?

The repository supplies both trace expectations and a trace record. Together they establish that tool order and final state are testable facts rather than informal observations.

\`seed-skills/ai-system-quality-engineer/SKILL.md\` lines 134 through 147 validates tool names and args, recommends sandboxing side effects, and calls for trace grading. Its trace rule includes right tool order, no blocked action, bounded steps, and asserted final state.

That proof separates structural checks from model judgment. Tool existence, argument schema, edge order, and final state can use fixed checks before any graded interpretation.

\`seed-skills/openai-evals-trace-grading/SKILL.md\` lines 58 through 92 defines a per-sample trace. The sample ID, input, output, tool-call list, ideal answer, and expected tools stay together as one record.

Its list preserves observed call order, but a at once harness needs more detail than tool names. Add call IDs, edge IDs, dispatch and finish events, result references, and side-effect status without discarding the repository fields.

The [OpenAI evals guide](https://platform.openai.com/docs/guides/evals) supports evaluating tasks against defined data and criteria. This article uses fixed event checks as the first grader for order behavior.

Read the run path from plan to state. The orchestrator receives proposed calls, checks tools and args, builds a call graph, starts ready nodes, records finishes, joins results by ID, and commits allowed effects.

Observable output includes the graph, event ledger, result map, trace, final state, and end status. Observable errors include a cycle, unknown edge, same ID call ID, premature dispatch, missing result, wrong ID match, blocked effect, and unfinished join.

The [agent tool regression guide](/blog/agent-tool-use-regression-testing-guide-2026) adds broader conduct checks. This contract remains focused on order and call IDs while work overlaps.

## How to parallel tool call ordering tests?

How to parallel tool call ordering tests begins with deferred promises controlled by the test. Real timers and random delays make order checks flaky because machine load changes which operation completes first.

Create two peer read calls and one next join call. The harness dispatches both reads, the test resolves them in reverse order, and the join remains blocked until both result IDs exist.

Represent edges as call IDs rather than tool names. Two calls may use the same tool with different args, so names cannot identify the exact prior call.

Record an event immediately before dispatch and immediately after finish. Then add a distinct linked event when the result enters the call-ID map, since finish alone does not prove correct storage.

The runner should repeatedly find ready nodes whose edges completed successfully. It must reject cycles and references to absent call IDs before any side effect starts.

Test a read-only fan-out separately from state-changing work. This makes legitimate overlap visible without normalizing each tool sequence into serial run.

The first Vitest example follows the correct-order and final-state rule from \`seed-skills/ai-system-quality-engineer/SKILL.md\`. Controlled deferred objects prove both peer dispatch and next waiting.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

type ToolResult<T> = { callId: string; value: T };
type Event = { type: 'dispatched'; callId: string };
const events: Event[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function getEvents(type: Event['type']) {
  return events.filter((event) => event.type === type);
}

async function executeGraph(tools: {
  profile: () => Promise<ToolResult<string>>;
  orders: () => Promise<ToolResult<string[]>>;
  join: (name: string, items: string[]) => { name: string; items: string[] };
}) {
  events.length = 0;
  events.push({ type: 'dispatched', callId: 'profile' });
  const profile = tools.profile();
  events.push({ type: 'dispatched', callId: 'orders' });
  const orders = tools.orders();
  const [profileResult, orderResult] = await Promise.all([profile, orders]);
  return tools.join(profileResult.value, orderResult.value);
}

it('fans out reads and waits before joining their results', async () => {
  const profile = deferred<{ callId: string; value: string }>();
  const orders = deferred<{ callId: string; value: string[] }>();
  const join = vi.fn((name: string, items: string[]) => ({ name, items }));

  const run = executeGraph({
    profile: () => profile.promise,
    orders: () => orders.promise,
    join,
  });

  expect(getEvents('dispatched').map((event) => event.callId).sort()).toEqual([
    'orders',
    'profile',
  ]);
  expect(join).not.toHaveBeenCalled();

  orders.resolve({ callId: 'orders', value: ['order-7'] });
  profile.resolve({ callId: 'profile', value: 'Asha' });

  await expect(run).resolves.toEqual({ name: 'Asha', items: ['order-7'] });
  expect(join).toHaveBeenCalledTimes(1);
});
\`\`\`

The assertion sorts only the two peer dispatch IDs. Later ledger checks should preserve the join's causal order rather than sorting the complete trace.

Use the [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) for broader trace scoring. Keep these edge checks fixed so a grader cannot excuse an early write because the final prose sounds correct.

## Parallel tool call ordering tests example: scenario and assertion matrix

A parallel tool call ordering tests example must vary edge structure, finish order, ID match, and failure state. The matrix below names one stable oracle for each branch.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Independent fan-out | Two read calls with unresolved promises | Both dispatch before either completes | Second read waits without a dependency | \`seed-skills/ai-system-quality-engineer/SKILL.md\` |
| Dependent fan-in | Join depends on both read call IDs | Join dispatches after both correlations | Join starts after only one result | \`seed-skills/openai-evals-trace-grading/SKILL.md\` |
| Reverse completion | Reads resolve opposite their plan order | Each value remains under its call ID | Results attach by array position | [OpenAI function calling](https://platform.openai.com/docs/guides/function-calling) |
| Dependency failure | One prerequisite rejects | Join is cancelled and no effect commits | Dependent call runs with partial data | [OWASP excessive agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) |
| Repeated execution | Same graph runs with several completion orders | Final map and causal ledger invariants match | Final state varies by timing | \`seed-skills/openai-evals-trace-grading/SKILL.md\` |

The fan-out row catches a runner that is correct but needlessly serial. Its oracle checks both dispatch events before the first controlled resolution.

The fan-in row checks each prior call rather than any prior call. A join should remain absent until each expected call ID has a linked result.

Reverse finish is the most direct result-ID match test. Return distinct values and assert the result map exactly, because identical fixtures can hide a swap.

The failure row checks cancellation and unchanged state. A next write must not run with partial input merely because another branch completed successfully.

Repeated run varies only the order in which deferred promises resolve. Parallel tool call ordering tests should preserve causal constraints and final state across each allowed plan.

## What failures expose parallel function call dependency test?

A parallel function call dependency test fails when a node starts before its prior calls, a result joins under the wrong call ID, a required result disappears, or effects create state that shifts with timing. Capture the first bad event and the graph edge it violates.

Start with an early next call. Modify the runner to treat one completed prior call as sufficient, then require the ledger validator to reject the join's dispatch sequence.

Next, return two results in reverse order and deliberately store them by finish index. Exact call-ID mapping should reveal the swap even when both tools returned valid schemas.

Inject a duplicate call ID before dispatch. The graph check should stop the run because later ID matching cannot distinguish two operations that share one ID.

Inject an unknown edge and a cycle. Both graph defects should fail before tools run, leaving an empty side-effect ledger and a clear structural error.

Force one peer call to reject after another succeeds. The runner may retain safe read proof, but it must cancel next calls and report each end node state.

The negative example extends the ordered trace in \`seed-skills/openai-evals-trace-grading/SKILL.md\`. It validates causal order from sequence numbers rather than brittle elapsed milliseconds.

\`\`\`typescript
import { expect, it } from 'vitest';

type ToolEvent = {
  sequence: number;
  type: 'dispatched' | 'completed' | 'linked' | 'committed';
  callId: string;
  dependsOn: string[];
};

function validateDispatchOrder(events: ToolEvent[]) {
  const linked = new Set<string>();
  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (event.type === 'dispatched') {
      for (const edge of event.dependsOn) {
        if (!linked.has(edge)) {
          throw new Error(\`\${event.callId} started before \${edge}\`);
        }
      }
    }
    if (event.type === 'linked') linked.add(event.callId);
  }
}

it('rejects a join dispatched after only one prior call', () => {
  const events: ToolEvent[] = [
    { sequence: 1, type: 'dispatched', callId: 'profile', dependsOn: [] },
    { sequence: 2, type: 'dispatched', callId: 'orders', dependsOn: [] },
    { sequence: 3, type: 'linked', callId: 'profile', dependsOn: [] },
    {
      sequence: 4,
      type: 'dispatched',
      callId: 'join',
      dependsOn: ['profile', 'orders'],
    },
  ];

  expect(() => validateDispatchOrder(events)).toThrow(
    'join started before orders',
  );
});
\`\`\`

Also reject an empty ledger when the fixture planned calls. No events can mean no tools ran, instrumentation failed, or the test skipped its subject; none proves correct order.

The [trace grading tutorial](/blog/openai-trace-grading-tutorial-2026) can add semantic review after fixed checks. Structural edge violations should remain direct release failures.

## How should agent tool join ordering run in CI?

Agent tool join ordering should run in CI with controlled promises, fixed graphs, fake side effects, and machine-readable ledgers. Avoid sleeps because a passing delay says little about actual edge logic.

Pin tool schemas, graph fixtures, planner output, access check rule, and expected final state. Hash these inputs in the artifact so changes receive review rather than appearing as runner regressions.

Give each test a virtual or fixed runner where practical. The test should decide which deferred operation resolves next and wait on events instead of elapsed time.

Use a fake tool registry that preserves production names, argument schemas, result schemas, and effect classes. Read-only tools can fan out, while effectful tools return planned commit records without touching production.

Run a focused command such as \`npx vitest run tests/tool-ordering.test.ts\`. Include a case timeout and report the last event, pending call IDs, and unresolved edges if it expires.

Retain the graph, ledger, result map, end node states, and final sandbox state. Keep prompts or user data redacted, since order proof needs identities and transitions rather than sensitive content.

Block release on bad graphs, early dispatch, duplicate IDs, wrong ID matches, missing joins, blocked effects, final state that changes by run order, or incomplete end counts. A harmless difference in finish timing should not fail.

The [agent tool regression guide](/blog/agent-tool-use-regression-testing-guide-2026) can determine suite placement. This focused test should run whenever runner, adapter, call-ID mapping, or tool access check code changes.

Repeat key graphs under several controlled finish schedules. This is finite plan exploration, not a claim that a few runs cover each possible production interleaving.

Keep one failure artifact even when cleanup succeeds. A cleared sandbox should not erase the event sequence needed to diagnose why a blocked commit was attempted.

## Which assertions verify concurrent tool result correlation?

Concurrent tool result correlation checks must connect each plan, dispatch, finish, and submitted result through one call ID. Tool name and list position are not one-off enough for that chain.

Assert call-ID uniqueness before the run and edge existence before dispatch. Then assert that each completed call creates exactly one mapped result with the same call ID.

Use distinct fixture values for each call, even when result schemas match. A profile value and order value should be impossible to swap without an exact object comparison failing.

Assert result cardinality against planned end calls. Missing, same ID, cancelled, and failed nodes must appear explicitly rather than disappearing from the result map.

Check causal order through ledger sequence numbers. Each edge's linked event must precede the next dispatch, while peer dispatches may appear in either order.

Assert join inputs by call ID and expected field. A join that receives both values but assigns them to the wrong field still has an ID match defect.

For effects, assert access check before start and prior call success before commit. Then compare the sandbox's final state with the exact expected object.

Assert no unrelated effects after failures. A rejected prior call should leave next writes unstarted, pending approvals unchanged, and external call counts at zero.

The [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) helps test tool selection and args. Parallel tool call ordering tests add graph and ID match proof after those inputs validate.

## Step-by-step test implementation

Build the harness around a call graph and append-only event ledger. The following order separates bad plans from run-time overlap and side effects.

1. Read \`seed-skills/ai-system-quality-engineer/SKILL.md\` lines 134 through 147 and \`seed-skills/openai-evals-trace-grading/SKILL.md\` lines 58 through 92, then define graph, result, event, and final-state records with stable run, case, call, edge, and effect fields.
2. Create independent fan-out, dependent fan-in, reverse-completion, rejected-prerequisite, duplicate-ID, unknown-edge, and cycle fixtures with unique values, fixed planner output, named effect classes, and exact terminal states for every node.
3. Validate tool names, arguments, call IDs, and dependency edges before dispatch, then use deferred promises to control each allowed completion order without real sleeps, random delays, network calls, or shared clocks.
4. Append dispatch, completion, correlation, join, rejection, cancellation, and commit events while preserving run, case, and call identity, plus the prior calls, result hash, effect class, and monotonic sequence for each event.
5. Assert causal order, exact result mapping, complete terminal counts, cancelled dependents, unchanged failure state, and equal final state across repeated schedules, including reverse finish order and a failed branch after one safe read succeeds.
6. Run the focused Vitest suite in CI, retain redacted graphs and ledgers, reset sandbox state, and route graph, scheduler, adapter, authorization, or tool failures separately with the first bad event and expected edge attached.

Start with two peer reads and one pure join. This graph is small enough that each legal and illegal event sequence can be reviewed by hand.

Keep one control graph with no blocked edge and one graph whose first read fails. The control proves that all safe work can end, while the failed graph proves that no later join or write can start from a partial result.

Add one write only after the read graph passes. The fake write should expose started and committed events so access check and cancellation remain separate checks.

Test graph check as a pure function. Bad IDs and cycles should fail without creating timers, promises, tool calls, or side effects.

Use event-driven waits in tests. Await a dispatched event or expose the ledger synchronously instead of sleeping and hoping the runner reached a point.

Run each legal finish permutation for small graphs. Larger graphs can use selected schedules that target shared edges, slow branches, and failure boundaries.

Use the [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) when adding semantic graders. Preserve fixed ledger failures as the first gate because model scoring should not reinterpret broken order.

## Failure triage and regression ownership

Triage begins with graph checks. Unknown tools, bad args, duplicate IDs, missing edges, and cycles belong to planner checks or bridge ownership before overlap starts.

If a valid next node dispatches early, inspect runner readiness logic. The event ledger should name the missing linked prior call at that exact sequence.

If finish order is valid but values join incorrectly, inspect result ID matching and the host response map. Compare call IDs during response cleanup, map insertion, and result submission.

If a join receives complete correct values but final output is wrong, assign join implementation or app logic. Do not blame overlap when the causal ledger and map both pass.

If a blocked effect starts, inspect access check and effect classification. The [OWASP excessive agency guidance](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) emphasizes limiting functions, permissions, and autonomy around tool use.

If final state varies across legal schedules, inspect shared mutable state and commit rule. Repeated event traces can identify which pair of effects lacks required serialization.

The [blog index](/blog) offers related agent and trace material. Attach the graph, first bad event, expected prior call set, actual result map, and final-state diff to the owner.

The decision path remains proof based: bad plans go to checks, early nodes go to scheduling, and swapped values go to ID matching. Wrong pure joins go to app logic, blocked actions go to access checks, and state that shifts with timing goes to overlap control.

## Frequently Asked Questions

### How do you test parallel tool calls when some operations are independent but others require deterministic dependencies, joins, and side-effect order?

Model calls as a call graph, use deferred promises to control finish, and record an append-only event ledger. Assert that unlinked calls start before resolution, all prior calls link before the next dispatch, and results join by call ID. Compare final state across several legal run orders.

### What fixture best tests how to parallel tool call ordering tests?

Use two peer read calls with one-off results and one join that depends on both call IDs. Resolve the reads in reverse order, then require the join to receive correctly labeled values. Add a failed prior call branch to prove cancellation and unchanged state.

### Which failure signal proves parallel tool call ordering tests example?

A decisive signal is the first ledger event that violates a graph edge, such as a join dispatch before all prior calls link. Swapped call-ID maps, missing end nodes, or final state that shifts with timing are equally valid. Wall-clock duration alone does not prove causal order.

### How should CI report parallel function call dependency test?

CI should retain the input graph, event ledger, result map, end state for each node, and sandbox final-state diff. The summary should name the first bad event and missing edge. Empty ledgers, unresolved nodes, duplicate IDs, and blocked effects must fail the job.

### When should agent tool join ordering block a release?

Block release when edges are bad, calls start early, results attach to wrong IDs, joins omit data, rejected prior calls still trigger later work, or effects commit outside rules. Also block incomplete traces and final state that shifts with timing. Safe finish order may vary.

### How can teams keep concurrent tool result correlation repeatable?

Replace network tools with schema-faithful fakes, control finish through deferred promises, and use one-off call IDs with distinct result values. Assert causal sequence numbers rather than elapsed milliseconds. Repeat small graphs under each legal finish order and reset sandbox state after each case.

## Conclusion

Parallel tool call ordering tests are reliable when graph checks precede the run, unlinked work overlaps, later work waits, results join by call ID, and effects preserve rule order. Bad edges, early dispatch, swapped results, missing joins, or state that shifts with timing must block release.

Open the [AI testing skills directory](/skills) to choose an agent workflow, then read the [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) before implementing this regression gate. Save the call graph and first event log as the base.`,
};
