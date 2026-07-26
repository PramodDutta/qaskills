import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent deterministic trace replay testing',
  description:
    'Agent deterministic trace replay testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Agent deterministic trace replay testing',
  keywords: [
    'Agent deterministic trace replay testing',
    'how to agent deterministic trace replay testing',
    'agent deterministic trace replay testing example',
    'agent trace replay harness',
    'stub tool results from trace',
    'reproducible agent regression test',
  ],
  relatedSlugs: [
    'how-to-test-llm-tool-calling-accuracy',
    'agent-tool-use-regression-testing-guide-2026',
    'ai-agent-eval-testing-guide',
    'openai-trace-grading-tutorial-2026',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/evals',
    'https://platform.openai.com/docs/guides/function-calling',
    'https://opentelemetry.io/docs/concepts/signals/traces/',
  ],
  repoEvidence: [
    'seed-skills/openai-evals-trace-grading/SKILL.md',
    'seed-skills/ai-agent-eval/SKILL.md',
  ],
  content: `Agent deterministic trace replay testing loads a versioned trace, replaces each tool with its recorded result, fixes time, IDs, and random input, and runs the coordinator offline. A pass requires the same ordered transitions, call-result links, final state, and grade, with zero live tool, model, network, or side-effect access.

## What must Agent deterministic trace replay testing prove?

Agent deterministic trace replay testing must prove that a saved run can drive the same local state path again. It should not depend on the provider, live tools, wall time, or mutable data.

The fixture needs one input, expected output facts, tool calls, tool results, state changes, and final grade evidence. Each record also needs a case ID and schema version.

The replay must preserve order when order has meaning. A sorted set of tool names cannot detect a changed plan, swapped result, skipped retry, or early final answer.

Call and result links must stay exact, as shown by the OpenAI [function-calling guide](https://platform.openai.com/docs/guides/function-calling). A result belongs to one recorded call ID, even when two calls use the same tool name and arguments.

Fix the clock, generated IDs, random values, locale, and any feature choice used by the coordinator. A replay that changes these values can produce a different branch without a code defect.

Give each fixed source a short use log. The replay should show which clock value, ID, or random value each state step consumed.

Fail when a fixed sequence has unused values as well as too few values. An unused value can show that a planned branch or event no longer ran.

Block all live fallback. Unknown tools, absent results, and stale schema fields should fail locally instead of calling the network or using a default provider.

The final grade is one oracle, not the whole proof. Two paths can earn the same grade while calling tools in a different order or passing the wrong result to a later state.

The [tool-calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) checks fresh model choices. Replay instead freezes those choices and checks the code that turns a trace into state and evidence.

Use the [QA skills directory](/skills) for broader agent tests. Keep this gate offline so a changed transition has one small fixture and no dispute about provider drift.

## Which repository behavior defines the test contract?

\`seed-skills/openai-evals-trace-grading/SKILL.md\` defines versioned JSONL cases with an ID, input, ideal answer, and expected tools. It then records a structured trace for each sample.

The same file grades normalized output and compares actual tool calls with expected tools. That repository shape supplies both final-answer evidence and trajectory evidence for replay.

Its structured grader reports pass state, score, and reasons. A replay can compare those plain values exactly because every model and tool boundary is replaced by fixed fixture data.

\`seed-skills/ai-agent-eval/SKILL.md\` calls for deterministic pipelines, versioned golden data, pinned model settings, and separate task measures. Offline replay applies those rules to coordinator behavior.

The OpenAI [evals guide](https://platform.openai.com/docs/guides/evals) shows JSONL test data with ground-truth labels and exact graders. Keep the replay fixture just as explicit about input schema and expected facts.

The local trace needs more detail than the repository's list of tool names when repeated calls are possible. Add call ID, arguments, recorded result, start state, end state, and ordered event index.

Keep the raw capture apart from the small replay fixture. The fixture should include only fields that drive state or support a stated check.

The [OpenTelemetry trace guide](https://opentelemetry.io/docs/concepts/signals/traces/) explains how linked spans and events form a trace. Keep the same parent, call, and event links in the small fixture so replay can compare the state path without full production payloads.

Write down each field that was dropped during this safe reduction. That review note helps a later owner decide whether a new state rule needs the old field.

Do not claim that replay revalidates the live tool. It proves the coordinator reacts to a recorded result in the same way, while a separate integration test owns current tool behavior.

Record fixture provenance in the result. Include capture version, replay schema, app revision, and a hash so reviewers know which saved run produced the comparison.

The [agent regression guide](/blog/agent-tool-use-regression-testing-guide-2026) covers new end-to-end runs. Replay gives that suite a fast local test when one known trajectory must never change by accident.

## How to agent deterministic trace replay testing?

To learn how to agent deterministic trace replay testing, capture one short successful run with two distinct tool calls. Convert it into a reviewed fixture that contains no secrets and uses stable IDs.

Build a stub registry keyed by call ID, not only tool name. The registry returns the recorded value once and fails if the same call is requested again.

Use a deny-all fallback for model, network, file, and tool access. Every unplanned boundary should throw an error that names the case and requested call without leaking arguments.

The first example loads a fixture and wires fixed services into the coordinator. It compares ordered events, final state, grade data, and unused stub count.

\`\`\`typescript
import { expect, test, vi } from 'vitest';

test('replays a saved support trace offline', async () => {
  const fixture = loadTraceFixture('refund-window.v1.json');
  const liveToolFallback = vi.fn(() => {
    throw new Error('live tool access is forbidden during replay');
  });
  const stubs = createCallIdStubs(fixture.toolCalls, liveToolFallback);

  const result = await replayAgent(fixture.input, {
    plannedCalls: fixture.toolCalls.map(({ callId, name, arguments: args }) => ({
      callId,
      name,
      arguments: args,
    })),
    tools: stubs,
    now: () => new Date('2026-07-25T00:00:00Z'),
    nextId: sequenceIds(fixture.generatedIds),
    random: () => 0.25,
  });

  expect(result.events).toEqual(fixture.expectedEvents);
  expect(result.finalState).toEqual(fixture.finalState);
  expect(gradeTrace(result)).toEqual(fixture.expectedGrade);
  expect(stubs.unusedCallIds()).toEqual([]);
  expect(liveToolFallback).not.toHaveBeenCalled();
});
\`\`\`

The planned calls in this example replace a fresh model turn. If the real coordinator cannot accept a fixed plan, put a recorded-model adapter at the same interface used in production.

Check stub use after replay. An unused result means a call was skipped, while a second request for one call ID means the path repeated work.

Make each stub return a deep copy of its saved result. Shared object use can let one replay edit the fixture and alter the next run.

Freeze the loaded fixture in tests where the runtime permits it. An early write then fails near its source instead of appearing as a later replay mismatch.

Run the fixture twice in one process and once in a fresh process. Equal output catches leaked module state as well as stable behavior within one run.

Use the [AI agent eval guide](/blog/ai-agent-eval-testing-guide) to score fresh behavior. Offline replay should use deterministic graders and should not ask another model to explain its own saved trace.

## Agent deterministic trace replay testing example: scenario and assertion matrix

This agent deterministic trace replay testing example keeps one fixture fact responsible for each check. The matrix makes live access, call mismatch, order drift, and grade drift distinct failures.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline replay | Versioned trace with two call IDs | Same ordered events, final state, and grade | Any exact comparison or fixture hash differs | \`seed-skills/openai-evals-trace-grading/SKILL.md\` |
| Repeated tool | Same tool name with two distinct IDs | Each recorded result is consumed once | Name-only lookup swaps or reuses a result | Function-call correlation |
| Missing result | Planned call has no stub output | Local missing-stub error before fallback | Live tool, network, or default value is used | Deny-all boundary ledger |
| Order mutation | Two event indices are reversed | Transition comparison names first mismatch | Sorted comparison hides the change | Ordered trace fixture |
| Concurrent replay | Two cases run with fixed service sets | Results and IDs remain isolated by case | Shared clock, ID, or stub state crosses cases | Deterministic eval policy |

The repeated-tool row is stronger than a list of tool names. Two searches may have the same name while their call IDs, queries, results, and later state differ.

The missing-result row should fail before any default client exists. Build the test process without live credentials and still keep a boundary ledger that catches attempted access.

For order mutation, report the first expected and actual event pair. Dumping a large trace without the mismatch index slows review and can expose more data than needed.

Check event count before finding that pair. A short trace should report the first missing index, while a long trace should report the first new event.

Keep a few events before and after the mismatch in the safe diff. This small window gives useful state context without publishing the whole trace.

The [OpenAI trace grading tutorial](/blog/openai-trace-grading-tutorial-2026) explains how to grade captured runs. This replay table checks whether local code can reproduce one captured path without recapturing it.

## What failures expose agent trace replay harness?

An agent trace replay harness should expose name-only stubs. Give two calls the same tool name but distinct IDs and outputs, then prove each later state uses the linked result.

It should expose hidden live fallback. Remove one recorded result and require a named fixture error plus a zero network and side-effect ledger.

It should expose nondeterministic IDs. Give the fixed ID source exactly the planned values, then fail if code requests one more or consumes them in another order.

The second example mutates one fixture fact at a time. It proves the missing result cannot escape into a real tool and that event order remains part of the contract.

\`\`\`typescript
test.each([
  ['missing result', (trace: TraceFixture) => delete trace.toolCalls[1].result, 'missing stub'],
  ['wrong call id', (trace: TraceFixture) => (trace.toolCalls[1].callId = 'call-x'), 'call id'],
  ['reversed events', (trace: TraceFixture) => trace.expectedEvents.reverse(), 'event 0'],
])('rejects %s', async (_name, mutate, message) => {
  const fixture = structuredClone(validFixture);
  mutate(fixture);
  const boundaries = createDenyAllBoundaries();

  await expect(replayFixture(fixture, boundaries)).rejects.toThrow(message);

  expect(boundaries.networkCalls).toEqual([]);
  expect(boundaries.toolCalls).toEqual([]);
  expect(boundaries.modelCalls).toEqual([]);
  expect(boundaries.sideEffects).toEqual([]);
});
\`\`\`

Add a time mutation where the coordinator reads the real clock instead of the injected clock. The event value or branch should differ, and the test should name that uncontrolled read.

Add a random mutation with one branch on a fixed value. The replay must consume the supplied sequence once and fail when another draw appears.

Add a schema-version mutation that removes a required event field. Reject the fixture at load time before coordinator state changes or stubs are consumed.

The [tool-call accuracy article](/blog/how-to-test-llm-tool-calling-accuracy) owns whether a fresh model should make these calls. Replay owns exact handling of the frozen plan and results.

## How should stub tool results from trace run in CI?

To stub tool results from trace in CI, run in a process with no provider or production tool credentials. Deny outbound network and inject only the fixed services named by each fixture.

Validate fixture schema and hash before the replay starts. A changed fixture should appear as a reviewed source diff, not as an unexplained result drift.

Store the expected schema version in both the fixture and its replay test, then compare them before any stub registry or state machine is created. This early guard keeps a migration error from looking like a missing tool call much later in the run.

When a migration is approved, convert a copy and retain one old fixture that now fails with the planned version message. The paired tests prove that new data works while stale data stops at the loader edge.

Pin runtime, locale, time zone, and serialization rules. Even a fixed clock can yield different text when local date or number formatting changes.

Set those values in the test process and assert them at start. A runner image change should fail setup with clear facts before any replay result changes.

Avoid comparing object key order unless the app contract uses wire text. Parse structured values first, then compare the fields and arrays whose order has meaning.

Run cases in a fixed order first, then run an isolated concurrent group. The second group proves registries, ID streams, clocks, and event buffers are scoped per case.

Use strict per-case deadlines. Offline replay should be fast, so a timeout often means an unresolved stub, loop, leaked timer, or unexpected wait for live work.

Retain a compact diff artifact with case ID, fixture hash, and the first event mismatch. Add expected and actual final state, grade delta, and boundary-attempt counts to the same safe record.

Block release on schema drift, unused or repeated stubs, wrong call links, event-order changes, final-state changes, grade changes, live access, or leaked resources. The [agent regression guide](/blog/agent-tool-use-regression-testing-guide-2026) can then run a smaller set of fresh paid cases.

## Which assertions verify reproducible agent regression test?

A reproducible agent regression test compares ordered transition records, not prose logs. Normalize only fields declared volatile, and fail when a new volatile field appears without policy.

Assert the exact case ID, input hash, fixture version, and capture hash first. Comparing the wrong fixture can create a convincing but useless pass.

Assert call count and ordered call IDs before result values. Then compare tool names, parsed arguments, result shapes, and the state before and after each call.

Assert that every stub was consumed once and no unknown call was requested. This check catches skipped work, duplicate work, and unplanned planner output.

Compare final state as plain data. Include task state, selected output facts, safe error code, step count, and any committed side-effect count.

Run deterministic graders and compare grader name, version, pass, score, and reason code. Avoid exact prose reasons when human wording is not part of the contract.

Assert all live-boundary ledgers remain empty and all fixed sequences are fully consumed. Then check timers, handles, and temp files after replay closes.

The [OpenAI trace tutorial](/blog/openai-trace-grading-tutorial-2026) provides wider grading context. This assertion set makes one known trace a precise code regression test rather than a new eval run.

## Step-by-step test implementation

Treat the fixture as reviewed test source. Capture it once, remove private values, add version and provenance, then never update it merely to turn a failing replay green.

1. Read \`seed-skills/openai-evals-trace-grading/SKILL.md\` and record its JSONL case fields, structured trace fields, expected tools, exact graders, and result shape.
2. Read \`seed-skills/ai-agent-eval/SKILL.md\`, then define fixed time, ID, random, locale, state, score, and no-live-access rules for replay.
3. Create a short versioned trace with repeated tool names and distinct call IDs, then build one-use stubs plus deny-all model, network, file, and side-effect boundaries.
4. Replay the valid fixture and compare ordered calls, result links, transitions, final state, grade record, consumed sequences, empty boundary ledgers, and cleanup.
5. Remove a result, change a call ID, reverse events, alter schema, use real time, and run cases together, requiring one stable local failure per mutation.
6. Run the offline suite in CI before paid evals, save a compact first-difference artifact, clean resources, and assign fixture, coordinator, grader, or isolation faults.

Keep fixtures small enough for line review. A long production trace can be reduced to the shortest path that still contains the state or call pattern under test.

Redact by replacing private values with stable fake values, then recompute expected hashes and grades. Do not simply delete fields that the coordinator needs.

Require a reason when a fixture changes. Valid reasons include an approved contract change, schema migration, or corrected capture, but not unexplained test drift.

Use the [blog index](/blog) to find capture and grading patterns. Keep replay in the fast lane because it should need no model, tool service, or external store.

## Failure triage and regression ownership

Begin with fixture validation. A bad schema, hash, or missing field belongs to fixture maintenance and should fail before the coordinator starts.

If a stub is missing or reused, compare the planned call IDs with actual requests. The planner adapter or coordinator owns unexpected calls, while the fixture owns an absent recorded result.

If calls match but events differ, locate the first transition index. The state machine owner can inspect one branch instead of reading the final answer.

If transitions match but the grade differs, compare grader version, normalized input, expected value, and reason code. The grader owner should not change the trace to hide a scoring defect.

If only concurrent replay fails, inspect global ID sources, clocks, stub maps, and event arrays. Per-case services should never share mutable counters or results.

Run the two failed cases alone and in both launch orders. A fault that follows launch order often points to one global source rather than either fixture.

Resetting a global after each case is weaker than injecting owned state. Prefer one service set per replay so parallel runs cannot depend on cleanup timing.

Any live-boundary attempt is a harness or adapter defect. Keep the denied request type and case ID, then fix injection rather than adding credentials to CI.

The path is fixture, calls, events, state, grade, isolation, and live ledger. The [AI agent eval guide](/blog/ai-agent-eval-testing-guide) becomes useful when a fresh run, rather than replay code, needs review.

Use the [agent regression guide](/blog/agent-tool-use-regression-testing-guide-2026) after the local replay agrees again. Its fresh run can show whether the approved state path still works against current services.

## Frequently Asked Questions

### How do you replay saved agent traces with stubbed tool results and prove graders, transitions, and final-state checks are deterministic?

Load a versioned fixture, key one-use tool stubs by call ID, and inject fixed time, IDs, random values, locale, and recorded plans. Compare ordered events, linked results, final state, and deterministic grade. Require empty model, network, tool-fallback, and side-effect ledgers before the replay can pass.

### What fixture best tests how to agent deterministic trace replay testing?

Use a short reviewed trace with two calls to the same tool name but distinct call IDs, arguments, and results. Include ordered state events, fixed generated values, final facts, and grade data. This shape catches name-only stubs, result swaps, hidden sorting, extra ID reads, and live fallback.

### Which failure signal proves agent deterministic trace replay testing example?

Report the first exact mismatch with case ID and fixture hash: schema field, call ID, event index, final state field, grade field, or live-boundary attempt. Also report unused and repeated stubs. One first-difference record is more useful than a large trace dump with no clear divergence point.

### How should CI report agent trace replay harness?

CI should keep case ID, fixture and capture hashes, replay version, first event difference, expected and actual state, grade delta, stub-use counts, fixed-sequence counts, boundary attempts, and cleanup state. The report should omit private arguments and full outputs unless those values are safe reviewed fixture data.

### When should stub tool results from trace block a release?

Block when a result links to the wrong call, a stub is skipped or reused, event order changes, final state or grade differs, or any live boundary is attempted. Also block on schema drift, real clock or random reads, cross-case state, timeout, or leaked resources after replay closure.

### How can teams keep reproducible agent regression test repeatable?

Pin fixture schema, runtime, locale, grader, and serialization; inject fixed time, IDs, and random sequences; and key stubs by call ID. Run each fixture twice and in an isolated concurrent group. Review every fixture update and compare compact ordered data rather than volatile logs or newly generated prose.

## Conclusion

Agent deterministic trace replay testing turns one captured agent path into a fast offline code contract. A release pass needs exact call links, ordered transitions, stable final state and grade, fully consumed stubs, fixed service inputs, no live access, and clean resource closure.

Open the [QA skills directory](/skills) to choose an agent testing skill, then read the [tool-calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) before adding offline replay beside fresh eval runs. Begin with one short trace whose call links and state changes fit in a code review across all supported CI run modes.`,
};
