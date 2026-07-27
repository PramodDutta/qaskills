import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent tool result truncation testing in CI',
  description:
    'Agent tool result truncation testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'Agent tool result truncation testing',
  keywords: [
    'Agent tool result truncation testing',
    'how to agent tool result truncation testing',
    'agent tool result truncation testing example',
    'LLM tool response token limit',
    'truncated function result test',
    'agent incomplete evidence handling',
  ],
  relatedSlugs: [
    'how-to-test-llm-tool-calling-accuracy',
    'agent-tool-use-regression-testing-guide-2026',
    'ai-agent-eval-testing-guide',
    'openai-trace-grading-tutorial-2026',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/function-calling',
    'https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken',
    'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
  ],
  repoEvidence: [
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'seed-skills/ai-agent-eval/SKILL.md',
  ],
  content: `Agent tool result truncation testing cuts a valid tool reply at known byte, token, field, and record points. The test passes when the agent sees clear signs that data is not full, makes no claim without proof, and either asks for one more small result or says which proof is still missing.

## What must Agent tool result truncation testing prove?

Agent tool result truncation testing must prove a client can tell partial proof from a full result. The key check is the agent's next step and final answer, not whether the stub sent back text that looks clear, because deterministic state transitions expose semantic incompleteness before generation begins.

A passing case keeps a clear full-state flag in the tool reply, agent trace, and user response, while serialization preserves explicit continuation metadata across the adapter boundary. The agent may ask for the next page, ask for fewer fields, or stop and name the exact gap.

A failing case treats a cut record as whole, drops the full-state mark, or fills gaps with sure claims. These faults are distinct because they may belong to the bridge code, plan step, prompt, or final view, so diagnostic classification separates transport, orchestration, generation, and rendering ownership.

The official [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling) describes tool output as JSON or text linked to one call ID. That set shape lets a test keep the call ID fixed while it changes only the data and its full-state fields, and deterministic correlation prevents interleaved responses from changing attribution.

The repo adds two useful test rules for this flow. \`seed-skills/ai-system-quality-engineer/SKILL.md\` treats schema, source, time, and token limits as fixed gates before model grades begin, which establishes validation precedence before probabilistic evaluation or aggregation.

The second file, \`seed-skills/ai-agent-eval/SKILL.md\`, splits right results, safe use, time, cost, and task end state. A cut case should show its full-state result on its own, not hide it in one broad score, so completion telemetry remains independent from linguistic quality assessment.

This scope starts after a valid tool call reaches a real tool contract. Use the [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) when the question concerns tool choice or arguments instead.

The [QA skills directory](/skills) can supply wider agent test flows for later work. Keep this gate so small that one failed check names the changed not-full result flow.

## Which repository behavior defines the test contract?

The repo proof is guidance, not a ready-made helper for cut data. Read it in run order, then turn each stated rule into a field or check that tests can see, with observable invariants for identity, cardinality, provenance, and completion.

First, \`seed-skills/ai-system-quality-engineer/SKILL.md\` puts fixed checks before score tests. Here, parse state, call ID, full state, source range, and size must fail before a judge scores the final words, preserving deterministic validation ahead of subjective model evaluation.

Next, the same file says checks should prove a known tool, valid input, safe side effects, step order, and final state. This test rig keeps the valid call fixed, so only the proof sent back can change, isolating response completeness from invocation correctness and authorization controls.

Then, \`seed-skills/ai-agent-eval/SKILL.md\` asks for more than one test score and saved case sets. Record a full-state result next to right and safe use, so good style cannot offset a made-up answer, and preserve dimension-level evidence for later regression analysis.

Define the tool result with four fields that tests can read: \`callId\`, \`records\`, \`complete\`, and \`continuation\`. A byte or token count can explain the cut point, but a count alone cannot prove that all asked-for rows arrived, because semantic completeness depends on request scope and pagination state.

The trace must keep the same call ID from the first ask through result and next call. This lets a reviewer show that the agent saw the planned partial reply, not some other tool event, with unambiguous correlation across concurrent tool execution.

The final answer must show one of two safe states. It either uses a next result that fills the proof gap or says which part is still not known.

Use the [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) for the larger scorecard around this fixed rule. The cut-data check should stay an exact release gate before the team works out broad scores.

## How to agent tool result truncation testing?

How to agent tool result truncation testing starts with one full source result and a fixed cutter. Each new test case must keep the same row order, query, call ID, and safe tool flow.

Create cuts at several layers because each finds a new kind of bridge fault. A byte cut can break text, a token cut can end mid-line, a field cut can omit state, and a row cut can keep valid JSON while it loses facts, producing different diagnostics for decoding, serialization, schema validation, and semantic coverage.

Do not cut a JSON wire string and call each parse fault an agent fault. Include partial replies that still parse, so the plan must act on an explicit \`complete: false\` state after clean decode, which isolates orchestration behavior from malformed transport handling.

The token cut must use the same token map set by the test rules. The [OpenAI token counting recipe](https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken) shows that maps split text in distinct ways and warns that one token may not decode cleanly at UTF-8 byte points, so tokenizer provenance belongs in every reproducible boundary artifact.

This first TypeScript and Vitest sample is a test rig drawn from the repo's fixed-gate rule. It proves the pass path with no live API call and no change to shared state.

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';

type ToolResult = {
  callId: string;
  records: Array<{ id: string; fact: string }>;
  complete: boolean;
  continuation: string | null;
};

type Decision =
  | { kind: 'answer'; citedIds: string[] }
  | { kind: 'fetch-more'; cursor: string }
  | { kind: 'incomplete'; missing: string };

async function consume(result: ToolResult): Promise<Decision> {
  if (!result.complete && result.continuation) {
    return { kind: 'fetch-more', cursor: result.continuation };
  }
  if (!result.complete) {
    return { kind: 'incomplete', missing: 'remaining tool records' };
  }
  return { kind: 'answer', citedIds: result.records.map((record) => record.id) };
}

describe('bounded tool result', () => {
  it('requests the next bounded page', async () => {
    const sideEffect = vi.fn();
    const fixture: ToolResult = {
      callId: 'call-17',
      records: [{ id: 'r1', fact: 'approved fact' }],
      complete: false,
      continuation: 'cursor-2',
    };

    await expect(consume(fixture)).resolves.toEqual({
      kind: 'fetch-more',
      cursor: 'cursor-2',
    });
    expect(sideEffect).not.toHaveBeenCalled();
  });
});
\`\`\`

The exact next-step shape matters because a broad truthy result could hide an \`answer\` branch. Also check that no cited ID appears unless its source row exists in the full set seen so far.

Repeat the same case with no next-page token. The next step changes to \`incomplete\`, while the call ID, rows, and lack of side effects stay the same.

Keep provider sampling outside this focused suite. The [agent tool regression guide](/blog/agent-tool-use-regression-testing-guide-2026) can cover broader trajectories after this local contract is stable.

## Agent tool result truncation testing example: scenario and assertion matrix

An agent tool result truncation testing example needs more than one full result and one broken string. The grid below changes one cut point at a time and gives each row one exact result to check.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Complete baseline | Three ordered records with \`complete: true\` | Answer cites exactly three known IDs | Follow-up occurs or an ID disappears | Repository deterministic gates |
| Exact record boundary | First two records, \`complete: false\`, cursor present | One bounded follow-up uses the cursor | Agent answers before follow-up | OpenAI function calling guide |
| Missing completion field | Valid records but no completion state | Adapter rejects the envelope | Missing state defaults to complete | Repository schema gate |
| Token boundary | Text ends at a measured token limit | Incomplete state survives decoding | Partial sentence becomes a fact | OpenAI token recipe |
| Concurrent calls | Two call IDs with different cursors | Each follow-up retains its own ID | Results or cursors cross calls | Repository trajectory rule |
| No continuation | Partial records and explicit null cursor | Final response names missing evidence | Agent invents remaining records | Repository completion dimension |

Run the base case first to prove the test rig can answer from full data. A fail result has weight only when the same client passes the sound control with all rows in place, establishing fixture validity before negative-case interpretation.

For an exact row cut, keep JSON valid and save the next cursor. This keeps not-full proof handling apart from parse fixes and wire faults during the same run, while pagination metadata remains independently verifiable.

For a missing full-state field, reject at the bridge gate instead of letting a default imply success. A weak default turns schema drift into a final answer with no proof, bypassing explicit completeness validation and contaminating downstream attribution.

The race row catches state keyed only by tool name or last reply. Use distinct call IDs, cursors, and row IDs, so a crossed result fails with a clear and useful mismatch, exposing correlation errors without relying on completion order.

Store this matrix beside the fixture generator and version both together. The [trace grading tutorial](/blog/openai-trace-grading-tutorial-2026) helps add trajectory review without weakening these exact assertions.

Agent tool result truncation testing should make a case log with cut type, kept row count, full state, call ID, next step, and cited IDs. That small log lets CI explain the gate without a replay of model prose.

## What failures expose LLM tool response token limit?

An LLM tool response token limit can fail before, at, or after the wire format step. Test those layers on their own because a parse fault, lost field, and false full-state choice need distinct fixes.

A byte cut may split a multibyte mark and make bad text. The bridge should show a decode fault with the call ID, rather than swap bytes in secret and keep going.

A token cut may leave valid text that ends in the midst of a line. The token recipe shows why cut points depend on the chosen map, so cases must save its name and set limit.

A field cut can remove \`complete\` while retaining a valid object. Rejecting that shape is safer than treating absence as true, because the result no longer proves all records arrived.

A record cut is the most important semantic case. The payload can be valid, grammatical, and persuasive even though later records would contradict an early conclusion.

The fail sample below puts that meaning fault in a client that is unsafe on purpose. The test fails if it lets an answer pass from the same partial reply that the safe client marks as not full.

\`\`\`typescript
import { expect, it } from 'vitest';

type Evidence = {
  complete?: boolean;
  records: Array<{ id: string; fact: string }>;
};

function unsafeAnswer(result: Evidence) {
  return {
    status: 'answered',
    claim: result.records[0]?.fact ?? 'no data',
    citedIds: result.records.map((record) => record.id),
  };
}

it('rejects a confident answer from cut records', () => {
  const cutResult: Evidence = {
    complete: false,
    records: [{ id: 'r1', fact: 'the first sample passed' }],
  };

  const output = unsafeAnswer(cutResult);
  expect(output.status).not.toBe('answered');
  expect(output.citedIds).toEqual(['r1']);
  expect(cutResult.records).toHaveLength(1);
});
\`\`\`

This test is expected to fail until the unsafe branch checks completeness. Its stable signal is the forbidden \`answered\` state, while record accounting proves the fixture itself was not empty.

Also add a false cut mark to a full result. The agent should avoid a claim with no proof, but the bridge should flag state fields that clash for the tool owner instead of loop with no end.

Set a strict next-call cap and check it. An agent that sees partial data but asks for the same cursor with no end still fails task end state and cost control.

The [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) remains useful for argument validation. Here, the call is valid and the defect appears only after the tool returns.

## How should truncated function result test run in CI?

A truncated function result test should run with saved cases, a fixed token tool build, a set clock, and no live tool link. These choices keep cut-point faults easy to run again on each pull request.

Start CI with schema and parse cases because they are fast and exact. Run plan choices next, then use model-backed path checks only after the fixed cases pass with the same logs.

Give each case a stable ID such as \`record-cut-with-cursor\`. The report should map that ID to the call ID, cut point, planned next step, real next step, and cited row set.

Set timeouts around the whole follow-up loop, not just one tool call. A retry sequence can meet every per-call timeout while exceeding the task budget.

Run at least two concurrent call fixtures in the focused suite. Shared mutable state often passes serial tests but crosses cursors when results arrive in another order.

The pipeline should fail on claims with no proof, missing full state, crossed call IDs, repeat cursors, too many next calls, parse repair with no proof, or zero run cases. A skipped or blank report is not a pass.

Retain the compact JSON report and failing fixture, but redact tool data that is not needed for diagnosis. This follows the least-data goal behind the [OWASP Excessive Agency guidance](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/), which warns about unnecessary functions, permissions, and autonomy.

Use the [agent regression guide](/blog/agent-tool-use-regression-testing-guide-2026) to place this small gate in the wider CI run. Name a clear owner for bridge code, plan, prompt, and trace-log faults.

Agent tool result truncation testing should block release when a planned not-full state becomes an answer or loses its trace ID. A change in words can pass if the next step, source IDs, and stated limit stay exact.

## Which assertions verify agent incomplete evidence handling?

Agent incomplete evidence handling needs checks on input, state, act, output, and lack of side effects. A search for words such as "incomplete" can pass while the answer still holds facts that were made up.

Check the input count and order before you call the client. This proves the cutter made the planned case and stops a broken setup from making a false green result.

Check the full-state field as an exact boolean and need a cursor only when one more small read can work. Reject state that clashes, such as full data with a next-page token.

Check the next-step union in full. Accept only \`fetch-more\`, \`incomplete\`, or \`answer\`, then check each key field and ban extra state that could hide a fallback path.

Check the call ID through each trace event from start to end. A sound-looking next call tied to some other call does not fill the proof gap for the user's current ask.

Assert citation provenance by comparing cited IDs with accumulated record IDs. Set equality is useful for coverage, while ordered equality matters when the final answer claims ranking or sequence.

Assert the follow-up count and cursor sequence. A successful eventual answer should still fail when it exceeded the configured request or token budget.

Check that the fake risky side effect, other cache, and shared log stay unchanged. This guards against a plan that tries to make up for lost proof by calling some other action.

Use the [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) to score broad use after these core rules pass. Do not let a good judge score cancel a fixed full-state failure in the same run.

The final case report should include expected and actual values, not merely pass or fail. That detail makes agent tool result truncation testing useful during triage and future regression review.

## Step-by-step test implementation

Build the test from a full, repo-backed set of rules toward results with less proof. Keep each cut change fixed so a failed case can be run again on a local host.

1. Read \`seed-skills/ai-system-quality-engineer/SKILL.md\` and \`seed-skills/ai-agent-eval/SKILL.md\`, then record the schema gate, trajectory evidence, separate completion score, and release condition.
2. Build one canonical result with ordered record IDs, an explicit completion flag, a call ID, and a nullable continuation cursor.
3. Derive byte, token, field, and record cuts without changing the query, tool choice, safe side effects, or expected record order.
4. Run the complete result first, then assert that each partial result produces one bounded follow-up or an explicit incomplete-evidence response.
5. Inject missing metadata, crossed call IDs, repeated cursors, false completion, invalid bytes, and a consumer that answers from partial records.
6. Run the focused suite in CI, retain case-level reports, verify cleanup, and assign each failed boundary to its owning layer.

Keep the canonical result small enough for reviewers to inspect. Add larger generated fixtures only when they exercise limits that the compact case cannot reach.

Save a build tag for the case schema and cutter as one set. A schema change with no new cut cases can leave old cuts at points that no longer matter.

Measure token cuts with the pinned token map, but keep byte and row cuts too. One token count does not stand for each wire fault or loss of meaning.

Run a code change that takes the full-state check out of the safe client. The suite should fail on the first partial result that can parse, which proves the check can find its named bug.

Document the focused command beside the tests and make it return nonzero for zero cases. Reviewers should not need a live provider account to reproduce the core failure.

Browse the [QA skills directory](/skills) when the implementation needs adjacent safety or trace practices. Keep the resulting gate tied to this one incomplete-result contract.

## Failure triage and regression ownership

Start triage with the first failed core rule, since later prose may come from an earlier bridge fault. Parse and schema faults come before plan or model review in this flow.

If bytes cannot decode, give the issue to the wire or data-map owner. Save the cut offset, token map, call ID, and raw size without saving other private text.

If JSON parses but full state is missing, give the issue to the tool schema or bridge. The plan must never guess that an absent field means all rows came back.

If state is right but the next act answers, inspect the plan rules and prompt flow. Match the trace with the exact next step set for that test case.

If the agent follows a cursor but cites records from another call, inspect correlation and concurrent state. Reordering the same two results should reproduce a keying defect.

If repeat cursors use the whole budget, inspect the stop rule and tool page flow. Save each cursor and reply state, so the owner does not depend on the last sentence.

If next steps pass but the reply adds a detail with no proof, match cited IDs with claims in the final view. The [trace grading tutorial](/blog/openai-trace-grading-tutorial-2026) can help find the step where that detail first arose.

If no case ran, own the failure in CI configuration rather than the application. Empty discovery, skipped fixtures, and missing reports must stay release-blocking.

Agent tool result truncation testing is done only when each partial case keeps a clear source and stays honest. That rule turns a vague made-up claim into a contract fault the team can run again.

## Frequently Asked Questions

### How do you truncate oversized tool results at controlled boundaries and verify the agent detects incomplete data instead of producing confident answers?

Start from one full result, then make byte, token, field, and row cuts while you keep the call ID. Mark partial cases that can parse as incomplete and save the next step. Pass only when the agent asks for one small next page or states the proof gap with no made-up facts.

### What fixture best tests how to agent tool result truncation testing?

Use a small ordered record set with explicit \`complete\`, \`callId\`, and \`continuation\` fields. Derive each cut from that control and retain expected record IDs. This fixture separates parsing faults from semantic incompleteness while making follow-up count, citation coverage, and unchanged side effects easy to assert.

### Which failure signal proves agent tool result truncation testing example?

The strongest fail sign is an exact \`answer\` step from a result marked incomplete, mainly when cited IDs omit rows that were not sent. Missing full-state fields, crossed call IDs, and repeat cursors are distinct stable signs. Keep each one under its own case ID so ownership stays clear.

### How should CI report LLM tool response token limit?

CI should report the token map, set limit, real token count, cut point, call ID, full state, and agent's next step. It should also list all seen and cited row IDs. These fields show whether the bug came from count, wire format, call match, plan, or final view.

### When should truncated function result test block a release?

Block release when a partial result becomes a sure answer, loses its call ID, defaults to full, breaks its next-call cap, or makes a blank test report. A safe word change need not block when the next step, proof cut, cited IDs, and stated limit stay right.

### How can teams keep agent incomplete evidence handling repeatable?

Commit the source result, cutter, planned next steps, token tool build, and fixed clock setup. Avoid live tools in the small suite, then post JSON logs for each case. Run the same checks after bridge, prompt, page, model, or trace changes, and review case updates with schema changes.

## Conclusion

Agent tool result truncation testing gives a release sign when partial tool proof stays clear from bridge to final answer. The gate should reject claims with no proof, lost full state, crossed calls, loops with no cap, and blank runs while it keeps a small case report.

Open the [QA skills directory](/skills) to choose an AI testing skill, then read the [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) before you build this gate. This order keeps the first run small and gives each failed check a clear owner.`,
};
