import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Tool call cancellation propagation testing',
  description:
    'Tool call cancellation propagation testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Tool call cancellation propagation testing',
  keywords: [
    'Tool call cancellation propagation testing',
    'how to tool call cancellation propagation testing',
    'tool call cancellation propagation testing example',
    'agent AbortController tool test',
    'cancel in flight function call',
    'late tool result suppression',
  ],
  relatedSlugs: [
    'how-to-test-llm-tool-calling-accuracy',
    'agent-tool-use-regression-testing-guide-2026',
    'ai-agent-eval-testing-guide',
    'testing-agent-tool-call-retry-behavior',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/function-calling',
    'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
    'https://opentelemetry.io/docs/concepts/signals/traces/',
  ],
  repoEvidence: [
    'seed-skills/ai-agent-eval/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
  ],
  content: `Tool call cancellation propagation testing starts a controlled agent run, pauses a tool before its side effect, cancels the run, and then releases every pending task. A pass proves each tool saw the signal, resources closed, late results were ignored, no retry began, no write occurred, and the final state stayed canceled.

## What must Tool call cancellation propagation testing prove?

Tool call cancellation propagation testing must prove that one user or system stop request reaches every active layer. Stopping only the final answer is not enough when a tool can still write, send, charge, or retry.

The first observable fact is signal receipt. Each in-flight tool should record that it saw the same run cancellation before it crossed its side-effect point.

The second fact is task state. The agent run must finish as canceled, not complete, failed, or timed out, and it must not emit a success answer after the stop.

The third fact is resource closure. Timers, streams, sockets, temp files, locks, and child work owned by the call need a settled cleanup record.

The fourth fact is absence. After cancellation, the side-effect ledger must stay empty, no retry may start, and a late result must not enter the next model turn.

Cancellation has race boundaries, so test before dispatch, during work, at the write edge, and just after a tool settles. Each boundary should have a named result rather than one flaky sleep.

Give every boundary a start latch and a release latch. The test can then stop the run only after the tool reaches the exact line under review.

Run a plain success case beside each stop case with the same tool and input. This pair proves that cancellation, not a broken fixture, blocked the planned write.

The [tool-calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) checks name and argument choice. This gate begins after a valid call exists and asks whether explicit cancellation controls its remaining life.

Use the [QA skills directory](/skills) for broader agent checks. Keep this test small enough that a latch controls the exact moment when abort and tool completion compete.

A green run therefore needs signal, state, cleanup, trace, and no-write proof. Any missing fact leaves room for an orphan task to act after the user believes the run stopped.

## Which repository behavior defines the test contract?

\`seed-skills/ai-agent-eval/SKILL.md\` requires deterministic eval paths, pinned inputs, task-completion evidence, and separate measures. Those rules support a fixed cancellation fixture rather than a model-generated timing guess.

The same file treats task completion as its own outcome. A canceled task should therefore keep a distinct state instead of being scored as an ordinary failed answer.

\`seed-skills/ai-system-quality-engineer/SKILL.md\` says side-effecting tools should use a dry run or sandbox. It also calls for tool order, forbidden-action checks, and an end within a step budget.

Together, these files define a safe local harness. The input is one planned tool call, and the output is a canceled run with no forbidden write and a bounded transition trail.

The OpenAI [function-calling guide](https://platform.openai.com/docs/guides/function-calling) shows that function calls and function outputs are linked by a call ID. Preserve that ID in the cancellation trace so a late result cannot be mistaken for another call.

The [OWASP excessive agency risk](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) names excess function access, permission, and autonomy as root causes. A sandbox ledger and a tested stop path reduce the harm when an agent should no longer act.

The guide does not make local tool code stop on its own. The application runner owns the \`AbortSignal\`, passes it to tools, checks it before side effects, and rejects outputs that arrive after the run closes.

Record the path in order: model emits a call, dispatcher starts it, and the tool reaches a latch. The controller then aborts, cleanup runs, late work settles, and the coordinator refuses any new transition.

Use one run ID on all events and one call ID on tool events. These links make a late result easy to place even when two tools end together.

Keep the cancel reason as a safe short code, not raw user text. The code can explain state without copying private data into the trace.

Use a fake clock for deadlines and retry waits, but use an explicit deferred promise for the race point. Advancing time alone cannot prove that the tool reached the planned line.

The [agent tool regression guide](/blog/agent-tool-use-regression-testing-guide-2026) covers full paths with several calls. This contract suite isolates the stop path before adding planner or model variance.

## How to tool call cancellation propagation testing?

To learn how to tool call cancellation propagation testing, build a cooperative fake tool with two latches. One latch tells the test that work started, while the second lets the test release a late result after abort.

Pass one signal from the run controller to the dispatcher and every tool. Avoid creating a child controller unless the code also links parent abort to that child in a testable way.

Give the fake tool a side-effect function that only appends to an in-memory ledger. The tool should check \`signal.aborted\` just before that append, even if its earlier wait already listened for abort.

The first example models the positive stop path. It proves signal receipt, typed run state, empty writes, and full cleanup after the late promise settles.

\`\`\`typescript
import { expect, test, vi } from 'vitest';

test('cancels an active tool before its write', async () => {
  const controller = new AbortController();
  const started = deferred<void>();
  const release = deferred<string>();
  const writes: string[] = [];
  const closed = vi.fn();

  const tool = async ({ signal }: { signal: AbortSignal }) => {
    signal.addEventListener('abort', closed, { once: true });
    started.resolve();
    const value = await release.promise;
    signal.throwIfAborted();
    writes.push(value);
    return value;
  };

  const run = runAgentWithTool(tool, { signal: controller.signal });
  await started.promise;
  controller.abort(new DOMException('run canceled', 'AbortError'));
  release.resolve('late write');

  await expect(run).resolves.toEqual({ state: 'canceled' });
  expect(closed).toHaveBeenCalledOnce();
  expect(writes).toEqual([]);
  expect(activeResources()).toEqual([]);
});
\`\`\`

The deferred result is important because it arrives after cancellation by design. If the coordinator accepts it, the test has direct proof of late-result leakage.

Add a call ID, run ID, tool name, start event, abort event, cleanup event, and dropped-result event to the trace. Compare their order and parent link rather than checking only event presence.

Check that the abort event comes before both cleanup and dropped output. Event presence alone can pass when a late result was used before the run marked itself canceled.

Give the trace sink its own close check. A run that stops tools but leaves its event stream open can still hold the worker or lose the last cleanup fact.

Run a control case without cancellation. It should write once, return once, close once, and finish as complete, which proves that the fake can reach its side effect.

Use the [retry behavior article](/blog/testing-agent-tool-call-retry-behavior) for transient failures. Cancellation is terminal for this run and should not enter a normal retry branch.

## Tool call cancellation propagation testing example: scenario and assertion matrix

This tool call cancellation propagation testing example controls dispatch, abort, release, and cleanup as separate events. The matrix gives each race one exact state and one evidence trail.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Cancel before dispatch | Signal already aborted | Tool start count stays zero; run is canceled | Dispatcher starts or retries the tool | Deterministic agent harness |
| Cancel during wait | Tool paused at start latch | Abort seen, cleanup runs, no write occurs | Orphan work continues or run completes | \`seed-skills/ai-agent-eval/SKILL.md\` |
| Cancel at write edge | Tool paused before ledger append | Final signal check blocks the append | Ledger gains a late side effect | \`seed-skills/ai-system-quality-engineer/SKILL.md\` |
| Late result | Deferred tool resolves after abort | Result is tagged dropped and never fed back | New model turn consumes old output | Function-call ID contract |
| Concurrent calls | Two tools share one run signal | Both settle; neither writes or retries | One call escapes or holds a resource | Ordered trace and call ledger |

The pre-dispatch row catches a common gap. A dispatcher may check the signal only inside the tool, which still allocates work and can start a side effect too soon.

The write-edge row needs a latch right before the ledger append. A random short delay cannot place cancellation at that exact point on every CI host.

For concurrent calls, use two unique call IDs and separate start latches. Abort only after both tools report active, then assert two cleanup records and zero writes.

The [AI agent eval guide](/blog/ai-agent-eval-testing-guide) can place these states in a wider scorecard. This table stays deterministic and treats any post-cancel action as a clear contract failure.

## What failures expose agent AbortController tool test?

An agent AbortController tool test exposes dropped propagation when the coordinator cancels but the tool's signal remains live. Compare object identity or a linked abort event at every handoff.

It exposes late writes when a tool checks the signal only before a long wait. Every irreversible edge needs a final guard because cancellation can happen during that wait.

It exposes false completion when a caught \`AbortError\` falls through to the normal result path. The final run state and answer count must stay distinct from ordinary success.

The second example forces a late result and checks the transition log. It also proves no retry or second model request began after the run was closed.

\`\`\`typescript
test('drops a result that settles after cancellation', async () => {
  const call = deferred<ToolResult>();
  const trace: TraceEvent[] = [];
  const model = vi.fn().mockResolvedValueOnce({
    callId: 'call-42',
    name: 'send_notice',
    arguments: { accountId: 'acct-test' },
  });

  const run = startAgent({
    model,
    tools: { send_notice: () => call.promise },
    trace,
  });

  await waitForEvent(trace, 'tool.started');
  run.cancel('user stopped run');
  call.resolve({ callId: 'call-42', output: 'sent' });
  await run.finished;

  expect(run.state).toBe('canceled');
  expect(trace.map((event) => event.type)).toEqual([
    'run.started',
    'tool.started',
    'run.canceled',
    'tool.result_dropped',
    'run.closed',
  ]);
  expect(model).toHaveBeenCalledOnce();
  expect(sideEffectLedger()).toEqual([]);
});
\`\`\`

Add a broken-tool fixture that ignores the signal and resolves late. The coordinator still needs to drop its output, mark the tool noncooperative, and close the run within the test deadline.

Do not let the broken fixture perform a real action. Its write target should be an in-memory sandbox where the ledger can prove the attempted late act.

Test a tool that rejects after abort as well as one that resolves. Both paths should end in one canceled state, with the original reason and call ID kept in trace data.

The [tool-calling guide](/blog/how-to-test-llm-tool-calling-accuracy) handles malformed calls and unknown tools. This negative set assumes dispatch began and then checks whether the stop contract held.

## How should cancel in flight function call run in CI?

To cancel in flight function call tests in CI, replace sleeps with deferred gates and fake time. Each case should wait for a named event before aborting, which removes host-speed guesses.

Run all tools against a sandbox ledger. Network clients, mail senders, payment adapters, and file writers should be fakes that record intent without reaching a live service.

Set a short per-case deadline and a larger suite deadline. A noncooperative tool should produce a bounded failure artifact rather than hang the worker.

Close every timer and stream in \`finally\`, then inspect active-resource counters. Cleanup assertions should run after the late result or error has settled.

Flush the fake clock until no planned task remains, but cap the number of turns. An endless queue should fail with its pending task names instead of spinning until the suite deadline.

Run one case with cleanup that throws after abort. The run must stay canceled, retain the cleanup fault, and still close every other owned resource.

Retain an ordered JSON trace with run ID, call ID, event type, state, monotonic time, and safe reason code. Avoid full tool arguments when they may hold private data.

The [OpenTelemetry trace guide](https://opentelemetry.io/docs/concepts/signals/traces/) describes traces in terms of linked spans, events, and status data. Use those plain links to show which tool observed abort and which cleanup event closed its work.

Repeat race cases enough to catch shared-state defects, but do not use repetition as the only timing control. A fixed latch should define the race in each run.

Block release on any late write, retry, model turn, false completed state, leaked resource, missing call correlation, or suite timeout. The [agent regression article](/blog/agent-tool-use-regression-testing-guide-2026) can add full-path checks after this local gate passes.

## Which assertions verify late tool result suppression?

Late tool result suppression needs an ordered state assertion. Once \`run.canceled\` appears, no \`model.requested\`, \`tool.started\`, \`side_effect.committed\`, or \`run.completed\` event may follow.

Allow only cleanup, dropped-result, and closed events after cancellation. Name that allowlist in the test so a new transition cannot slip through an existence-only check.

Compare each dropped result's call ID with an active call from the same run. A stale output with no known call link should become a protocol error, not generic canceled evidence.

Assert the model call count stays fixed after abort. A coordinator can drop the tool result yet still start another turn through a queued task.

Assert retry scheduler count and pending timer count are zero. Cancellation should clear delayed retries as well as work already executing.

Check side-effect ledgers both right after run closure and after all deferred tasks release. The second check catches work that escaped the coordinator's finished promise.

Check the user-facing state and message. It may say the run was canceled, but it must not claim that the planned tool action finished.

The [retry testing guide](/blog/testing-agent-tool-call-retry-behavior) covers which errors may retry. A canceled signal has separate ownership and should never be relabeled as a transient provider fault.

## Step-by-step test implementation

Build the test around one state chart and one side-effect ledger. Every fixture should declare the event where cancellation occurs and the events allowed afterward.

1. Read \`seed-skills/ai-agent-eval/SKILL.md\` and define deterministic run states, task evidence, fixed tool inputs, and a separate canceled outcome.
2. Read \`seed-skills/ai-system-quality-engineer/SKILL.md\`, then create sandbox-only side effects, a step budget, forbidden post-cancel events, and cleanup counters.
3. Connect one \`AbortController\` to the coordinator, dispatcher, deferred tools, retry scheduler, and resource wrappers, with a trace event at each handoff.
4. Run the complete control case, then cancel before dispatch, during work, at the write edge, and after tool settlement while comparing exact states and event order.
5. Release late results and errors, run concurrent tools, and assert zero writes, retries, model turns, leaked resources, or completed claims after cancellation.
6. Run the focused Vitest suite in CI, save a safe call-linked trace, enforce deadlines, clean every fixture, and assign each first bad transition to its owner.

Start with the full control case. It proves that the fake tool can write and finish, which makes the missing write in a canceled case meaningful.

Use one deferred gate per tool and give each gate a clear name. Shared gates can hide a call that never started or make concurrent cleanup look complete too early.

Test cleanup after the run promise resolves because background work may outlive that promise in a broken build. Release all held tasks, flush fake time, and check the ledgers again.

Repeat the same stop case with two tools that end in opposite orders. Both traces may differ in allowed cleanup order, but neither may contain a write or new model turn.

If strict cleanup order is not part of the app contract, compare a named partial order. Require abort before close for each call and require all calls closed before the run closes.

The [blog index](/blog) offers broader agent test plans. Keep this procedure free from model choice so a stop-path regression has a small and repeatable failing case.

## Failure triage and regression ownership

Start with the first event after the cancel request. If no tool saw abort, inspect controller wiring through the coordinator, dispatcher, and adapter.

If tools saw abort but a write occurred, inspect the final guard at the side-effect edge. The tool or client wrapper owns that missed check.

If no write occurred but a model turn started, inspect queued tasks and late-result handling in the coordinator. The tool may have behaved correctly while orchestration used stale output.

If the state became failed or complete, inspect error normalization and terminal-state priority. Cancellation should win over a late ordinary result for the same run.

If CI alone times out, inspect leaked timers, streams, child work, and unresolved latches. Do not extend the deadline until the active-resource artifact identifies what remained.

Compare the first open resource with the tool start trace. This link shows whether the tool, retry queue, or report sink owns the task that kept CI alive.

After the fix, rerun the same case with the short deadline. A longer timeout can mask the leak and turn one clear fault into a slow suite.

If only one concurrent call escapes, compare signal identity, call IDs, and per-call cleanup events. Shared mutable maps often drop one entry during bulk cancellation.

The path stays short: signal wiring, write guard, queue, state, resource, and trace link. Use the [AI agent eval article](/blog/ai-agent-eval-testing-guide) after the local owner fixes the first broken layer.

Recheck the [tool-calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) when the canceled run began with an unexpected call. Fix call choice first, then rerun the same stop fixture on the intended tool.

## Frequently Asked Questions

### How do you cancel an agent run and prove in-flight tools stop, resources close, late results are ignored, and no side effect occurs afterward?

Pause sandbox tools at named latches, cancel one shared run signal, and then release every pending result or error. Assert canceled state, abort receipt, ordered cleanup, zero writes, zero retries, and no new model turn. Check ledgers again after all late work settles, not only when the run promise ends.

### What fixture best tests how to tool call cancellation propagation testing?

Use a deferred fake tool with start and release gates, a final signal check, an in-memory write ledger, and explicit cleanup counters. Give each call a unique ID. This fixture places cancellation before dispatch, during work, at the write edge, and after settlement without using unstable sleep timing.

### Which failure signal proves tool call cancellation propagation testing example?

The strongest signal is the first forbidden transition after cancellation, tied to run and call IDs. Examples include a committed write, retry start, new model request, completed state, or leaked resource. Preserve the ordered trace and ledger so reviewers can locate the layer that ignored the stop request.

### How should CI report agent AbortController tool test?

CI should retain a safe ordered trace, final run state, call IDs, abort-receipt flags, cleanup counts, model and retry counts, ledger totals, and deadline result. Do not store private arguments. The artifact should show both the cancel event and all allowed cleanup events through final closure.

### When should cancel in flight function call block a release?

Block when any active tool misses abort, an irreversible action happens later, a stale result feeds another turn, canceled work retries, or the run claims completion. Also block on leaked resources, missing call correlation, or an unbounded tool. These outcomes break the user's reasonable belief that stop means stop.

### How can teams keep late tool result suppression repeatable?

Use deferred gates instead of sleeps, fake time for timers, sandbox ledgers for side effects, and fixed event schemas. Pin each abort to a named transition, then release every late task and compare the full ordered trace. Run a successful control beside canceled cases to prove the fixture can complete normally.

## Conclusion

Tool call cancellation propagation testing proves a stop request reaches tools, queues, retries, resources, and final state. Its release signal requires a canceled run, call-linked trace, full cleanup, dropped late output, no further model work, and no side effect after the stop.

Open the [QA skills directory](/skills) to choose an agent testing skill, then read the [tool-calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) before adding this cancellation gate to the run coordinator. Start with one sandbox tool and one exact race point before testing wider runs.`,
};
