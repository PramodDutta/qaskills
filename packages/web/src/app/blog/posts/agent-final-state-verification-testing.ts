import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent final state verification testing',
  description:
    'Agent final state verification testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Agent final state verification testing',
  keywords: [
    'Agent final state verification testing',
    'how to agent final state verification testing',
    'agent final state verification testing example',
    'agent task outcome assertion',
    'verify tool side effect state',
    'LLM final answer state mismatch',
  ],
  relatedSlugs: [
    'how-to-test-llm-tool-calling-accuracy',
    'agent-tool-use-regression-testing-guide-2026',
    'ai-agent-eval-testing-guide',
    'deepeval-task-completion-metric-agent',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/evals',
    'https://platform.openai.com/docs/guides/function-calling',
    'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
  ],
  repoEvidence: [
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'seed-skills/openai-evals-trace-grading/SKILL.md',
  ],
  content: `Agent final state verification testing reads the system of record after every tool run and checks that state with the ordered trace before accepting success. It rejects fluent claims that work is done when records are absent, partial, stale, or changed elsewhere. The final answer passes only when observed end states match the planned task.

## What must Agent final state verification testing prove?

Agent final state verification testing must prove that a direct state read matches the requested end state and the recorded tool flow. It must reject success when the answer sounds correct but the owned record, file, message, or job does not show the expected result.

The system of record is the component that owns the durable result. It may be a database, issue tracker, object store, repo, queue ledger, calendar, or another API with an source read method.

Choose that reader before building the agent test. A tool response is proof about an attempted action, but it is not the final state when another write, rollback, timeout, or concurrent request can alter the result.

Write the precondition and end state as plain data. For a ticket update, record the ticket ID, old status, expected new status, required comment, and fields that must remain unchanged.

The ordered trace supplies a second view of the same task. It should show the selected tool, schema-valid args, returned ID, retry count, and any read used to confirm the write.

Success needs agreement across the request, trace, and final read. A correct record with an other destructive call still fails, as does a clean trace whose write never became durable.

The official [OpenAI evals guide](https://platform.openai.com/docs/guides/evals) treats test data and graders as explicit parts of a test. For this fixed gate, the grader checks concrete state and trace facts rather than judging the style of the final answer.

The [OWASP excessive agency entry](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) supports limiting tools, permissions, and autonomous actions. A narrow test follows that rule by granting only the fake steps needed for one expected transition.

Keep broad task scoring separate from this contract. The [agent test guide](/blog/ai-agent-eval-testing-guide) can measure wider task quality, while this test answers one smaller question: did the intended outside state actually exist after the tools stopped?

Use the [QA skills path](/skills) when the test also needs security, model, or protocol coverage. The release signal here remains an exact end state read joined to one trace ID.

## Which repository behavior defines the test contract?

The repo proof begins at \`seed-skills/ai-system-quality-engineer/SKILL.md\`. Lines 134-147 require a real tool name, schema-valid args, a sandbox for side effects, correct tool order, no forbidden action, bounded termination, and an asserted final state.

Those requirements define a flow of observable facts. The harness can inspect the registered tool, submitted args, sandbox flag, ordered calls, step count, forbidden-call ledger, and post-run state.

The second source, \`seed-skills/openai-evals-trace-grading/SKILL.md\`, shows a structured grader at lines 115-149. It parses output against an ideal value and checks the trace's tool calls with the expected tools before it returns a named score and reason.

That example provides a useful report shape: grader ID, pass flag, numeric score, and debug reason. Add the outside state diff beside those fields instead of replacing the repo's trace checks.

Execution order matters because later facts depend on earlier identities. Seed the record, capture its version, run the agent, save each tool result, read the same record directly, and only then evaluate the narrative claim.

Never reconstruct final state from the model's own summary. A phrase such as "ticket updated" has no stable key, version, or value that a test can check with the requested transition.

The [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling) describes tool definitions, args, calls, and application-side execution. Its edge reinforces why the application must observe and return tool results rather than treating the model's call as the side effect itself.

The [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) covers selection and argument quality in more depth. Final-state work starts after those checks and proves that valid calls produced the owned result.

Use the [agent tool regression guide](/blog/agent-tool-use-regression-testing-guide-2026) for a wider trajectory suite. This article keeps the oracle fixed so a missing write cannot be rescued by a generous model judge.

## How to agent final state verification testing?

To learn how to agent final state verification testing, create a fake repo with explicit seed, update, and read steps. Give every run a case ID, retain immutable snapshots, and check the final read with the expected object before accepting the agent's claim.

Start with one successful transition and no retries. The test should expose only the required write and read tools, while a separate ledger records every invocation and its returned version.

The positive example below follows the repo requirement for correct trajectory and asserted final state. It uses a fake issue store, then checks the exact state, call order, success claim, and absence of other writes.

\`\`\`typescript
import { expect, test } from 'vitest';

test('confirms the issue state after the agent tools finish', async () => {
  const store = createIssueStore({
    'QA-44': { status: 'open', owner: 'sam', version: 1 },
    'QA-45': { status: 'open', owner: 'lee', version: 1 },
  });

  const run = await runAgentTask({
    request: 'Close QA-44 and keep its owner',
    tools: store.tools,
    caseId: 'final-state-01',
  });
  const finalIssue = await store.read('QA-44');

  expect(run.toolCalls.map((call) => call.name)).toEqual([
    'get_issue',
    'update_issue',
    'get_issue',
  ]);
  expect(finalIssue).toEqual({ status: 'closed', owner: 'sam', version: 2 });
  expect(run.finalAnswer).toMatch(/QA-44.*closed/i);
  expect(await store.read('QA-45')).toEqual({
    status: 'open',
    owner: 'lee',
    version: 1,
  });
});
\`\`\`

Keep the expected object outside the fake implementation. A test that calculates its expected value with the same update code can repeat one defect on both sides and report a false pass.

Capture before and after versions for every owned record. Version checks expose a no-op write, an extra retry, or a concurrent change even when the final visible status happens to look correct.

Treat the final answer as one assertion input, not as the oracle. Parse only contract claims such as target ID and requested status, then check those claims with the direct state read.

Add a clock only when time is part of the contract. Inject a fixed clock and assert its exact stored value, rather than allowing the test to depend on wall time.

Use unique stores per case so parallel tests cannot share records. The [task completion metric article](/blog/deepeval-task-completion-metric-agent) can score open-ended outcomes later, after this test proves the fixed side effect.

## Agent final state verification testing example: scenario and assertion matrix

This agent final state verification testing example separates common failures by controlled cause. Each row names a final read, trace fact, or cleanup record that remains stable across model wording changes.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline transition | One open issue with version 1 | Closed issue at version 2 and expected ordered calls | State, version, or call order differs | \`seed-skills/ai-system-quality-engineer/SKILL.md\` |
| Exact boundary | Requested status already exists | No write, one confirming read, truthful no-change answer | Duplicate version or false mutation claim | OpenAI function calling guide |
| Partial write | Store drops the owner field | Final object fails exact equality despite a closed status | Missing owner or incomplete state diff | \`seed-skills/openai-evals-trace-grading/SKILL.md\` |
| Repeated execution | Same case ID runs twice | One durable transition and idempotent second result | Version 3, duplicate comment, or extra write | Fake repository ledger |
| Dependency failure | Update reports timeout after commit | Read resolves committed state before any retry decision | Blind retry or unsupported failure claim | OWASP excessive agency entry |

The exact-edge row distinguishes an idempotent no-op from a hidden repeat. If the target already has the expected state, the agent should read it, avoid another write, and report that no change was needed.

The timeout-after-commit row is especially important. A failed transport response does not prove the write failed, so the agent must read the target before issuing a retry that could duplicate the effect.

For partial writes, check the whole owned projection rather than one status field. Include required values and stable fields that must remain unchanged, but omit volatile fields outside the task contract.

Repeated runs should use the same retry key key and separate trace attempt IDs. This pairing lets the report show one logical task, several attempts, and exactly one durable state change.

Run every row against a newly seeded store. If a row depends on another row's state, test order can hide missing setup and make local results differ from CI.

The [AI agent testing guide](/blog/ai-agent-eval-testing-guide) provides broader scenario ideas. Keep this matrix focused on observable state so each failure has one clear owner.

## What failures expose agent task outcome assertion?

An agent task outcome assertion fails when the narrative claim disagrees with the direct read, ordered trace, or guarded-state diff. The most useful signal names the case, target, expected end state, actual end state, and first trace event that prevents agreement.

Inject one failure at a time through the fake edge. Return a success without writing, commit only half the fields, mutate another record, acknowledge the wrong ID, or commit and then return a timeout.

The negative example adapts the structured checks from \`seed-skills/openai-evals-trace-grading/SKILL.md\`. It preserves a named grader result while adding exact outside-state reasons and complete case accounting.

\`\`\`typescript
function gradeFinalState(run: AgentRun, expected: ExpectedState): Grade {
  const reasons: string[] = [];
  const actual = run.systemReads.at(-1);

  if (JSON.stringify(actual?.value) !== JSON.stringify(expected.value)) {
    reasons.push('final state mismatch');
  }
  if (actual?.recordId !== expected.recordId) {
    reasons.push('wrong record identity');
  }
  if (run.unrelatedWrites.length > 0) {
    reasons.push('unrelated side effect');
  }
  if (run.claimsCompletion && reasons.length > 0) {
    reasons.push('completion claim conflicts with observed state');
  }

  return {
    grader: 'trace+final_state',
    passed: reasons.length === 0,
    score: reasons.length === 0 ? 1 : 0,
    reason: reasons.join('; '),
  };
}
\`\`\`

Test a skipped run by passing an empty trace and the unchanged seed state. It must fail complete case accounting rather than receiving a perfect score because no forbidden tool appeared.

Test a partial run where the write exists but the confirming read is absent. The state may be correct, yet the proof contract fails because the harness cannot connect the result to the agent's final claim.

Test a stale read by returning an earlier version after a valid write. The report should identify the observed version and keep the write result, allowing owners to distinguish read consistency from tool selection.

Test an other mutation with a correct target state. This case proves that checking only the requested object would miss damage elsewhere in the allowed test scope.

Use the [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) to diagnose bad names or args. Route valid-call but wrong-state defects to the tool adapter or owning service instead.

## How should verify tool side effect state run in CI?

To verify tool side effect state in CI, run each case in an isolated in-memory store or disposable service namespace. Pin test data, tool schemas, clocks, case IDs, retry policy, and the exact projection used for final reads.

The focused job should fail on state mismatch, missing check, forbidden calls, unexpected versions, duplicate effects, or incomplete case counts. Model wording may vary, but required ID and outcome claims still need a fixed parser.

Give the agent one deadline and every fake dependency a shorter deadline. When the outer deadline fires, collect the current ledger and state snapshot before cleanup so a hang still produces useful proof.

Write artifacts under a unique case path. Retain the request, seed snapshot, tool ledger, tool results, final read, guarded-state diff, parsed claims, grader result, and cleanup summary.

Sanitize values before upload even when the test should be synthetic. A test defect can accidentally copy a real token or user value into an otherwise safe report.

Run retry and concurrency cases separately from the basic pass. Their assertions check logical task IDs, attempt IDs, versions, and retry key keys, while the baseline can preserve strict call order.

After every case, prove that temporary state was removed and no background task remains. Cleanup is part of the result because a late write can contaminate another case after the first report says success.

The [agent regression guide](/blog/agent-tool-use-regression-testing-guide-2026) can host the wider suite, while this focused job should remain fast enough for pull requests. Use the [skills path](/skills) to add service-specific contract checks around the same fake edge.

## Which assertions verify LLM final answer state mismatch?

LLM final answer state mismatch checks need exact ID, value, count, order, source, version, and guarded-field assertions. Existence alone misses a write to the wrong record, a duplicate comment, a stale value, or a correct state produced after an other action.

First check the final read with a hand-authored expected projection. Report field-level differences so the owner can see whether the write was absent, incomplete, or broader than requested.

Next check trace order with the allowed trajectory. A read, write, and check flow is different from a write-only path, even if an eventually consistent test later observes the same value.

Assert cardinality before inspecting individual calls. One valid update cannot excuse a second update, and one matching case cannot hide another planned case that never ran.

Check provenance by joining the target ID, logical task ID, tool result ID, and final-read version. The report should reject records that cannot be tied back to the current case.

Check state outside the task across the whole test scope. A narrow diff can prove that other issue, user, and setup records retained their original values.

Parse the answer into small claims such as target, action, and final status. Do not grade tone or detail here; check each required claim with the source read and flag unsupported claims of success.

The [task completion metric guide](/blog/deepeval-task-completion-metric-agent) is appropriate when a rubric must judge a complex outcome. Fixed state remains the stronger oracle whenever the system exposes an exact read.

## Step-by-step test implementation

Implement the gate from a written contract rather than from the current model output. The following flow keeps repo proof, test behavior, failure injection, and CI ownership visible to reviewers.

1. Read \`seed-skills/ai-system-quality-engineer/SKILL.md\` lines 134-147 and \`seed-skills/openai-evals-trace-grading/SKILL.md\` lines 115-149, then record the allowed tools, trace shape, and required final state.
2. Create isolated fixtures for how to agent final state verification testing and its example cases, using synthetic records, fixed clocks, unique task IDs, and no production connection.
3. Build a fake repository or API with seed, read, write, ledger, failure injection, protected-state diff, and cleanup operations that expose plain data.
4. Run the expected path, then assert the direct postcondition, ordered tool calls, bounded steps, exact claim fields, complete case count, and unchanged unrelated state.
5. Inject missing, partial, stale, repeated, wrong-target, and timeout-after-commit outcomes, then require a stable reason and retained state evidence for each case.
6. Run the focused suite in CI, upload sanitized case artifacts, verify cleanup, and assign state, trace, adapter, parser, or harness failures to their owners.

Keep the initial test small enough for a reviewer to calculate its expected state by inspection. Add more fields only when they protect a real contract or distinguish an observed production failure.

Run the positive case before negative mutations and once again after them. Equal state and trace results show that failure injection and cleanup did not leak across cases.

The [blog index](/blog) lists adjacent QA patterns that can surround this check. Keep the final-state test independent so teams can reproduce it without a live model or production account.

## Failure triage and regression ownership

Begin triage with the seed, final read, and state diff. If the seed is wrong, the test owner acts; if the write result is correct but the final read differs, the service or consistency edge owns the first investigation.

When no write appears, inspect the ordered trace. A missing call belongs to agent planning, while a rejected schema or authorization result belongs to the tool definition, adapter, or test policy.

When a write appears twice, check the logical task and attempt IDs. Equal task IDs with different retry key keys point to retry construction, while one key with two durable effects points to service enforcement.

When the target is correct but state outside the task changed, route the defect to the tool implementation. The model fulfilled one visible goal but exceeded the permitted side-effect edge.

When state is correct and the final answer is wrong, inspect the last read returned to the model. A correct read with a false claim belongs to response construction; a stale read belongs earlier in the data path.

If every fact is correct but the grader fails, check its expected projection and claim parser with the written contract. A test should not force fields or phrasing that the task never required.

For CI-only failures, retain runtime version, seed checksum, fake-service setup, deadlines, and case order. Do not relax state equality until the report proves which environmental fact changed.

The [tool accuracy article](/blog/how-to-test-llm-tool-calling-accuracy) helps separate planning defects from state defects. A compact ownership rule is enough: request errors go to test owners, call errors to agent owners, side-effect errors to adapters, and proof errors to harness owners.

## Frequently Asked Questions

### How do you verify the external state created by agent tools instead of trusting a fluent final answer that claims the task succeeded?

Read the target directly from its owning system after all tool work settles, then check that record with a hand-authored end state. Join the read to the ordered trace and task ID. Reject success when state, call order, guarded fields, or required answer claims disagree.

### What fixture best tests how to agent final state verification testing?

Use a fake repo or disposable API namespace with explicit seed, read, update, ledger, and cleanup methods. Include versions and guarded records. The test should simulate success, partial writes, stale reads, wrong targets, retries, and timeout-after-commit without reaching production or sharing state between cases.

### Which failure signal proves agent final state verification testing example?

The strongest signal names the case and target, then shows expected state, observed state, version, and the first conflicting trace event. It should also state whether the final answer claimed success. This proof distinguishes planning, adapter, persistence, read-consistency, and response-construction defects without judging prose quality.

### How should CI report agent task outcome assertion?

CI should retain a sanitized request, seed snapshot, ordered tool ledger, tool results, final source read, guarded-state diff, parsed answer claims, grader reason, and cleanup status. Stable task and attempt IDs must connect those records. Reports should omit secrets while keeping enough versions and identities for reproduction.

### When should verify tool side effect state block a release?

Block when the expected end state is absent, partial, stale, duplicated, attached to the wrong target, or paired with a change outside the task. Also block when read-back proof, planned cases, or cleanup is missing. A fluent success claim cannot offset any fixed mismatch in the owned state.

### How can teams keep LLM final answer state mismatch repeatable?

Pin tool schemas, test data, clocks, retry rules, expected projections, and parser requirements. Give every run isolated state and stable identifiers, then check plain records instead of logs. Re-run one green case after failure injection to prove cleanup and ensure no delayed task altered later proof.

## Conclusion

Agent final state verification testing turns task completion into a fixed release signal: the source end state, ordered trace, and bounded answer claims must agree. It also rejects partial work, duplicate effects, wrong targets, other mutations, missing proof, and incomplete cleanup.

Open the [QA skills path](/skills) to choose an AI testing skill, then read [how to test LLM tool calling accuracy](/blog/how-to-test-llm-tool-calling-accuracy) before implementing this regression gate. Start with one owned record and one direct reader, then expand only from observed failures.`,
};
