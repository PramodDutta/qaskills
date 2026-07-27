import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent stale tool result testing',
  description:
    'Agent stale tool result testing: use repo evidence, focused fixtures, code examples, and CI checks to expose contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'Agent stale tool result testing',
  keywords: [
    'Agent stale tool result testing',
    'how to agent stale tool result testing',
    'agent stale tool result testing example',
    'agent stale function response',
    'tool result freshness assertion',
    'expire cached agent evidence',
  ],
  relatedSlugs: [
    'how-to-test-llm-tool-calling-accuracy',
    'agent-tool-use-regression-testing-guide-2026',
    'ai-agent-eval-testing-guide',
    'openai-trace-grading-tutorial-2026',
  ],
  sources: [
    'https://platform.openai.com/docs/guides/function-calling',
    'https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/',
    'https://www.nist.gov/itl/ai-risk-management-framework',
  ],
  repoEvidence: [
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'seed-skills/ai-agent-eval/SKILL.md',
  ],
  content: `Agent stale tool result testing marks every time-sensitive result with an observed time, source version, scope, and maximum age. A passing agent checks those fields before any dependent action. It refreshes expired evidence, uses the new result, or stops safely when refresh fails, while the trace proves that no stale value guided the decision.

## What must Agent stale tool result testing prove?

Agent stale tool result testing must prove that freshness is part of the action contract, not optional tags. The seen pass requires a time mark check, a source-version check, a scope check, and either a refresh or a safe stop.

Prices, rights, stock levels, and rule text can all be correct when fetched yet wrong minutes later. A test therefore needs a fixed choice time and a written age rule for each result type.

The rule should name what starts the clock, which version finds the source, and which action needs fresh proof. A quote might remain useful for display while being too old to approve a purchase.

Freshness differs from tool-call accuracy. The [tool-calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) checks whether an agent chose and called the right tool, while this contract checks whether returned proof remains fit for the later choice.

A green case starts with an expired cached result, advances a fake clock to a known instant, and offers a newer tool response. The agent must call the tool once, cite the new version, and act only from that value.

A second green case makes refresh not at hand. The correct outcome is a typed stop such as \`freshness_unavailable\`, with no purchase, permission change, hold, or rule answer emitted.

The test should also retain the rejected cached record. Keeping both versions lets a reviewer confirm that the newer value, rather than a changed prompt, caused the final choice.

Existence checks are too weak because both a stale and current payload can contain the expected field. Stable checks compare exact versions, times, call order, final state, and the absence of other effects.

Use the [agent tool regression guide](/blog/agent-tool-use-regression-testing-guide-2026) for wider trajectory checks. Keep this gate focused on proof age so its failure points to one clear rule or setup fault.

## Which repository behavior defines the test contract?

The repo gives two useful anchors for this contract. Lines 132 through 147 of \`seed-skills/ai-system-quality-engineer/SKILL.md\` treat cited chunks, real tools, valid arguments, action safety, tool order, and final state as fixed checks.

That proof does not define a freshness duration. It establishes the method: tool output and source notes become inspectable inputs, while the final state becomes an inspectable result.

Lines 867 through 890 of \`seed-skills/ai-agent-eval/SKILL.md\` add versioned datasets, live failures, CI gates, and historical result tracking. Those practices support versioned tool fixtures and trend records without claiming that one age limit suits each domain.

Read the flow in run order. The input is a cached tool result plus a requested action, the trace records check and refresh, and the output is either a choice or a typed stop.

The result record should include \`observedAt\`, \`sourceVersion\`, \`scope\`, and \`maxAgeMs\`. The choice record should include the proof version actually used and the rule that accepted it.

The [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling) explains that tools connect a model with application functions and outside data. Application code still owns the freshness rule because the model cannot infer a valid age from an unmarked payload.

The [OpenTelemetry GenAI attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) documents fields for request model, seed, temperature, and other run facts. Those fields help find the run, while custom freshness fields should retain the source time and version beside them.

The [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) provides a lifecycle frame for governing and measuring AI risk. A release gate can apply that frame by assigning each stale-proof failure to a named owner and reviewed rule.

Repo facts and source guidance should remain split in the report. The repo supports fixed proof checks, while the external sources explain tool access, trace identity, and risk ownership.

The [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) covers broader scoring and judge design. Here, a pass comes from exact trace and state facts, so no judge should decide whether an expired time mark looked acceptable.

## How to agent stale tool result testing?

How to agent stale tool result testing begins with a fake clock and two versions of one result. Fix each time value in the fixture so a one-clock tick edge has the same answer on laptops and CI workers.

Define freshness as \`decisionTime - observedAt <= maxAgeMs\` if the product rule includes the exact edge. Write that check sign in the case name because an undocumented \`<\` versus \`<=\` choice creates a hidden gap.

The fixture needs a cached result, a refresh response, and a side-effect spy. The stale value should lead to a changed choice than the current value, or the test cannot prove which proof won.

For example, set cached stock to one unit and current stock to zero units. A faulty agent may reserve stock from the old record and still produce a plausible success message.

The following TypeScript contract keeps the rule outside model prose. It returns the accepted proof and calls the action only after freshness check succeeds.

\`\`\`typescript
type ToolResult = {
  value: number;
  observedAt: number;
  sourceVersion: string;
  scope: string;
};

async function decideInventory(input: {
  now: number;
  maxAgeMs: number;
  cached: ToolResult;
  refresh: () => Promise<ToolResult>;
  reserve: (amount: number) => Promise<void>;
}) {
  const age = input.now - input.cached.observedAt;
  const evidence = age <= input.maxAgeMs ? input.cached : await input.refresh();

  if (input.now - evidence.observedAt > input.maxAgeMs) {
    return { status: 'stopped', reason: 'freshness_unavailable', evidence };
  }
  if (evidence.value < 1) {
    return { status: 'declined', reason: 'out_of_stock', evidence };
  }

  await input.reserve(1);
  return { status: 'reserved', reason: null, evidence };
}
\`\`\`

This code is intentionally small enough to expose each branch. A live bridge may add retries and auth, but the test oracle remains the accepted version, ordered calls, and final effect.

Run one case at the exact age limit and another one clock tick beyond it. The first should use cache under an inclusive rule, while the second must refresh before reading the value.

Also vary the scope while keeping the age current. A fresh permission for account A must not authorize account B, because age alone cannot make mismatched proof usable.

Save a structured trace event for \`freshness_checked\`, \`refresh_requested\`, \`refresh_received\`, and \`decision_committed\`. Their order proves that the action did not race ahead of the updated tool result.

The [trace grading tutorial](/blog/openai-trace-grading-tutorial-2026) can help with wider trace review. This test should still use exact event fields and positions rather than asking a grader to infer timing from narrative output.

## Agent stale tool result testing example: scenario and assertion matrix

An agent stale tool result testing example should make each rule branch seen before adding model variation. The matrix below uses controlled stock data, but the same structure fits prices, access checks, and rule versions.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Current baseline | Cache age is 59 seconds under a 60-second rule | No refresh, version v1 cited, one valid action | Extra call or wrong evidence version | \`seed-skills/ai-system-quality-engineer/SKILL.md\` |
| Exact boundary | Cache age is exactly 60 seconds | Inclusive comparator accepts v1 once | Boundary refresh contradicts written rule | Repository final-state check |
| Expired result | Cache age is 60,001 milliseconds and refresh returns v2 | One refresh, v2 cited, v2 drives decision | v1 appears in final evidence | \`seed-skills/ai-agent-eval/SKILL.md\` |
| Repeated request | Two decisions share one allowed refresh result | Defined cache behavior and complete trace identity | Duplicate effects or mixed versions | Versioned fixture record |
| Refresh failure | Tool rejects after stale cache is found | Typed stop and zero action calls | Cached value drives a side effect | Risk-owned release policy |

The current baseline proves that the harness does not refresh each request by accident. Its exact call count matters because an always-refresh setup can hide a broken cache rule and add avoidable load.

The edge row captures the most common check sign defect. Teams must choose an inclusive or exclusive rule, then freeze that choice in both rule text and tests.

The expired row needs a changed value, not merely a changed version string. If v1 and v2 both allow the same action, a stale setup could pass the final-state check.

Repeated run tests need an explicit product rule. One shared refresh may be correct within a request scope, but cross-user sharing is wrong when the result contains tenant-specific rights.

Refresh failure is a first-class outcome rather than an exception that the harness ignores. The choice must stop, preserve the original fault, and record that stale cache was rejected.

Add a malformed case where \`observedAt\` is missing, in the future, or not numeric. Treat unknown age as stale and stop or refresh according to rule, never as automatically current.

Keep the table with the retained run file. A reviewer can map each row to a case ID, trace ID, source version, and final-state assertion without reading model wording.

The [tool-calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) supplies adjacent tool selection cases. Do not merge those outcomes into this matrix, since correct selection and current proof can fail independently.

## What failures expose agent stale function response?

An agent stale function response is exposed when expired output is cited as current, a newer version is ignored, or proof crosses its allowed scope. The strongest fixture makes each defect change both the trace and the final choice.

Start with mutation tests against the freshness bridge. Reverse the check sign, remove the refresh await, accept a missing time mark, and substitute the cached record after refresh returns.

Each mutation should fail at least one exact assertion. If a mutated bridge stays green, the suite has an oracle gap even when its normal case passes.

The negative example below fixes time and forces the old and new stock values apart. It also checks complete case accounting and the absence of a hold.

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';

describe('stale inventory evidence', () => {
  it('refreshes expired cache and declines from version v2', async () => {
    const refresh = vi.fn().mockResolvedValue({
      value: 0,
      observedAt: 120_000,
      sourceVersion: 'inventory-v2',
      scope: 'tenant-a',
    });
    const reserve = vi.fn();

    const result = await decideInventory({
      now: 120_000,
      maxAgeMs: 60_000,
      cached: {
        value: 1,
        observedAt: 59_999,
        sourceVersion: 'inventory-v1',
        scope: 'tenant-a',
      },
      refresh,
      reserve,
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: 'declined',
      reason: 'out_of_stock',
      evidence: { sourceVersion: 'inventory-v2' },
    });
    expect(reserve).not.toHaveBeenCalled();
  });
});
\`\`\`

Add a refresh that returns another expired record. The agent should stop after the defined retry budget, rather than loop forever or quietly fall back to v1.

Add a current result with an older source version than the cache. This contradictory input should produce a provenance fault because a recent fetch time does not prove newer source state.

Add two concurrent requests with changed scopes and delayed replies. Their traces must keep split case IDs, and neither request may cite the other tenant's proof.

An empty run must fail when no freshness event appears. A zero side-effect count is not enough because the agent could have skipped the requested work before reaching check.

Preserve refresh errors, rule IDs, and selected versions in the file. These details distinguish a product rule defect from a tool outage, trace gap, or test fixture error.

## How should tool result freshness assertion run in CI?

A tool result freshness assertion should run with fixed clocks, local fakes, and no live action endpoint. CI must control each tool response so time, retries, versions, and failures remain repeatable.

Split the suite into fast bridge cases and a smaller agent path. bridge tests cover each clock tick edge, while the agent path proves that the validated record reaches source notes and final state.

Use one focused command such as \`pnpm vitest run tests/agent/tool-freshness.test.ts\`. Keep the fake tool in process so a network delay cannot change which case crosses the age edge.

Set a short test timeout and a smaller refresh timeout inside the fixture. A hanging refresh should produce a typed stop and retained trace, not an unexplained CI cancellation.

Retain JSON files for failed cases and a compact summary for passing cases. Each file needs case ID, fake choice time, cached version, returned version, rule ID, event order, and final effect.

Block release for stale proof used in a high-risk action, missing freshness fields, scope leakage, or incomplete observation. A refresh outage may follow a product rule, but any action based on rejected proof must remain blocking.

Keep retries fixed with scripted replies rather than timers based on worker speed. The first attempt can fail and the second succeed while both exact delays come from the fake clock.

Clean spies, clock state, and fixture caches after each case. Leaked fake time can make other tests fail later and obscure the real owner.

Use the [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) when this gate joins a larger scorecard. Keep the fixed freshness failure visible even if aggregate quality stays above its wider threshold.

## Which assertions verify expire cached agent evidence?

Checks that expire cached agent evidence must cover value, order, count, source, state, and forbidden effects. Checking only that refresh occurred misses agents that call the tool yet still answer from cache.

First compare the accepted \`sourceVersion\` with the refresh response. Then compare the cited version and final choice's proof version with that same exact value.

Next assert event order. \`refresh_received\` must precede \`decision_committed\`, and no action event may appear between stale detection and refresh completion.

Assert call cardinality from the written retry rule. A normal stale case might require one refresh, while two calls could expose duplicate agent steps or an unbounded retry path.

Assert scope and subject identity as exact strings. Fresh proof for a changed tenant, product, role, or rule region remains invalid even when its time mark passes.

Assert the stale record remains in diagnostic history but not in active choice input. This distinction preserves proof without allowing rejected data to affect the outcome.

Assert a safe final state when refresh fails. The result needs a stable reason, zero high-risk effects, and a complete trace through the stopped choice.

Also assert absence of other changes. An stock check should not update user rights, write other cache entries, or clear proof used by another request.

For concurrent cases, assert unique trace and choice IDs plus the expected mapping from each request to one result. Set equality alone can hide swapped tenant records.

The [agent tool regression guide](/blog/agent-tool-use-regression-testing-guide-2026) covers broader forbidden actions and step budgets. Add those checks around this exact freshness core without replacing its version and timing checks.

## Step-by-step test implementation

Implement the gate from proof to effect, then add model behavior only after fixed branches pass. This order keeps failures small and makes the first broken contract easy to find.

1. Read \`seed-skills/ai-system-quality-engineer/SKILL.md\` lines 132 through 147 and \`seed-skills/ai-agent-eval/SKILL.md\` lines 867 through 890, then record the exact evidence and history contract.
2. Define versioned tool records with observed time, source version, scope, value, and policy identifier, using fixed values that make stale and current decisions differ.
3. Build a fake clock, scripted refresh function, event recorder, and side-effect spy, then reset all four after every isolated test case.
4. Run current, exact-boundary, expired, and refresh-failure cases, asserting accepted version, ordered trace, final state, call count, and forbidden effects.
5. Inject missing timestamps, older returned versions, scope mismatches, delayed concurrent replies, and exhausted retries without changing the production policy.
6. Run the focused suite in CI, retain case-level JSON evidence, remove temporary state, and route each failed assertion to its owning layer.

Begin with bridge tests because they do not depend on model output. The rule function should accept plain records and return a typed acceptance or rejection that Vitest can compare exactly.

Then wrap the same bridge in the agent harness. Stub the model response if needed, but preserve the tool-call, freshness, source note, and choice events that live emits.

Use the clean case to prove the harness was active. It should contain a freshness check and accepted version even though no refresh call occurs.

Use the stale case to prove the refreshed record flows through each later stage. The tool mock, trace record, source note, final choice, and side-effect spy should agree on one version.

Use the outage case to prove cleanup and unchanged state. The harness must close pending work, attach proof, and leave the action store untouched.

Run one repeated case with the same input to confirm stable event counts. If the product shares fresh cache within a request, document that scope and assert its cache key directly.

Finally, connect the focused suite to a release job before broad stochastic evaluations. A fixed stale-action failure should stop the job immediately and keep its file for ownership.

## Failure triage and regression ownership

Triage starts with the first incorrect seen event, not the final model sentence. Compare the cached record, freshness choice, refresh reply, accepted version, source note, and action in order.

If the input lacks a time, version, or scope, assign the defect to the tool bridge or data contract owner. The model cannot validate freshness tags that the application never supplied.

If check accepts an expired or mismatched record, the rule setup owns the failure. Attach the exact age calculation, check sign, and rule ID to avoid debate over prose.

If refresh returns a current record but the trace keeps the old one, inspect state replacement and asynchronous ordering. This is usually an orchestration fault rather than a provider quality issue.

If the source note names v2 while the action uses v1, compare split state channels. A polished answer can hide a stale side effect when rendering and run read changed objects.

If no trace event exists, observability owns an proof gap until the team can prove check ran. Do not mark the product path safe from a missing record.

If only CI fails, compare fake-clock setup, worker isolation, locale, and leaked caches. Real time must never decide a one-clock tick edge in this suite.

If a provider changes wording but exact proof remains correct, update only output checks that belong to another suite. Freshness status, versions, and action counts should not depend on wording.

Use the [trace grading tutorial](/blog/openai-trace-grading-tutorial-2026) for related trace scoring. Preserve this compact choice path as a fixed gate before any model-based grade runs.

## Frequently Asked Questions

### How do you mark time-sensitive tool results and test that an agent refreshes expired prices, permissions, inventory, or policy data before acting?

Add observed time, source version, scope, and maximum age to each high-risk result. Freeze the choice clock, supply stale cache plus a changed refresh response, and assert the accepted version, event order, source note, final state, and zero effects before refresh. A failed refresh must return a typed safe stop.

### What fixture best tests how to agent stale tool result testing?

Use a fake clock with two versioned payloads whose values produce opposite choices. Place the cached result one clock tick beyond the allowed age, return a current result from a local fake, and spy on the action. This fixture proves refresh, proof replacement, and effect ordering without network timing.

### Which failure signal proves agent stale tool result testing example?

The clearest failure is a final source note or action tied to the cached source version after refresh returned a newer version. Also fail on missing check events, wrong call counts, scope mismatches, or an empty run. These facts find stale use more reliably than judging the answer's wording.

### How should CI report agent stale function response?

CI should report the case ID, fixed choice time, age rule, cached version, refresh version, ordered events, final proof version, and side-effect count. Retain the refresh error when present. This record lets owners split bad input tags, rule logic, orchestration, tool availability, and trace collection without rerunning live.

### When should tool result freshness assertion block a release?

Block when stale or scope-mismatched proof drives a high-risk action, freshness tags is absent, a newer result is ignored, or observation is incomplete. A product may define a safe fallback for low-risk display, but that exception needs its own rule, fixture, exact final state, and reviewed owner.

### How can teams keep expire cached agent evidence repeatable?

Freeze time, use local scripted tool replies, reset caches and spies after each case, and avoid live endpoints. Keep age edges, versions, scopes, and retry sequences in plain fixtures under version control. Repeated runs should produce identical event counts, accepted proof, final status, and attached JSON fields.

## Conclusion

Agent stale tool result testing is complete when each high-risk result carries usable freshness tags and each dependent action proves which version it used. The release signal is exact: refresh and continue from current proof, or stop without effects when current proof cannot be obtained.

Open the [AI testing skills directory](/skills) to choose a focused workflow, then read [how to test LLM tool-calling accuracy](/blog/how-to-test-llm-tool-calling-accuracy) before adding this regression gate. Keep the freshness fixture narrow so a failed run names the rule, tool, state, or trace layer that actually broke.`,
};
