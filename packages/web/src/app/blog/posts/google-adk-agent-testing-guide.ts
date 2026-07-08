import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Google ADK Agent Testing Guide for QA Engineers',
  description: 'Google ADK agent testing validates tool calls, trajectories, state, and multi-agent behavior so QA teams can test agentic systems reliably with practical QA guidance.',
  date: '2026-07-08',
  category: 'AI Testing',
  content: `
# Google ADK Agent Testing Guide for QA Engineers

Google ADK agent testing is worth discussing because it changes how QA teams create evidence. The useful version is concrete: define what is captured or generated, what gets asserted, which values are ignored, and who owns the follow-up when the check fails. Google Agent Development Kit shifts QA from checking a single answer to checking a stateful system that reasons, calls tools, delegates work, and updates memory.
This is not a pitch for more automation volume. It is a way to make Google ADK agent testing produce a clearer signal. A senior SDET should ask whether the workflow reduces blind spots, whether it creates new false positives, and whether the team can maintain it through normal product change.
For adjacent context, read [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) and [DeepEval versus Ragas](/blog/deepeval-vs-ragas-rag-evaluation-2026). Those guides cover neighboring practices, while this article focuses on agent-behavior tests for trajectories, tool calls, session state, and multi-agent systems, distinct from raw LLM output evaluation.

## Why This Matters in 2026

Agentic systems can produce a correct-looking final answer after taking an unsafe tool path, leaking state, or skipping validation. Release cycles are shorter, API and UI surfaces are larger, and AI-assisted development can change code faster than traditional review processes. QA work has to become more evidence-driven without becoming slower.
The best teams do not treat tools as magic. They define boundaries, add review checkpoints, and measure whether failures are useful. If a check cannot explain why it failed, it should not block a deployment. If it never blocks anything meaningful, it probably does not deserve to run on every pull request.

## Technical Workflow

First, record user input, model decisions, tool calls, tool results, state changes, and final response in a test harness. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A workflow should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Second, mock side-effecting tools by default so behavior tests remain deterministic and safe. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A workflow should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Third, compare observed trajectories with expected tool-call order for safety-critical paths. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A workflow should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Fourth, test session state before and after each run to detect memory bleed or lost context. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A workflow should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Fifth, exercise multi-agent handoffs with policy rules, tool budgets, and stop conditions. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A workflow should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.

## What to Validate Before Trusting It

First, validation tools run before side-effecting tools. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A validation rule should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Second, tool arguments match schema and permission rules. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A validation rule should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Third, state changes are intentional and scoped. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A validation rule should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Fourth, handoffs preserve only necessary context. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A validation rule should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Fifth, loop limits and tool budgets are enforced. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A validation rule should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.

## ADK Testing Layers

Separate behavior layers so failures can be diagnosed precisely.

| Area | Validation | Risk |
| --- | --- | --- |
| record user input, model decisions, tool | validation tools run before side-effecting tools | strict trajectory matching can be brittle |
| mock side-effecting tools by default so | tool arguments match schema and permission rules | loose matching can miss unsafe behavior |
| compare observed trajectories with expected tool-call | state changes are intentional and scoped | mocked tools do not prove real integrations |
| test session state before and after | handoffs preserve only necessary context | multi-agent paths multiply coverage needs |
| exercise multi-agent handoffs with policy rules, | loop limits and tool budgets are enforced | LLM output evaluation is a separate concern |

## Testing a Tool-Call Sequence

This example asserts the trajectory rather than only final text.

\`\`\`ts
import { expect, test } from "vitest";
type Step = { type: "tool_call"; name: string; args: Record<string, unknown> };
async function runExpenseAgent(): Promise<Step[]> {
  return [
    { type: "tool_call", name: "lookupPolicy", args: { category: "travel" } },
    { type: "tool_call", name: "validateReceipt", args: { currency: "USD" } },
    { type: "tool_call", name: "draftResponse", args: { status: "needs_manager_approval" } },
  ];
}
test("validates policy before drafting", async () => {
  const steps = await runExpenseAgent();
  expect(steps.map((step) => step.name)).toEqual(["lookupPolicy", "validateReceipt", "draftResponse"]);
});
\`\`\`

## Failure Modes and Honest Limits

First, strict trajectory matching can be brittle. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A failure mode should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Second, loose matching can miss unsafe behavior. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A failure mode should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Third, mocked tools do not prove real integrations. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A failure mode should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Fourth, multi-agent paths multiply coverage needs. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A failure mode should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.
Fifth, LLM output evaluation is a separate concern. For Google ADK agent testing, this is not a documentation detail. It is a test-design decision that affects determinism, review quality, and the confidence a team can place in the result. A failure mode should expose the input, the assumption, the expected outcome, and the observed evidence so a failure can be triaged without folklore.

## Practitioner Checklist

- Record trajectories as fixtures.
- Mock side-effecting tools.
- Assert tool order for risky workflows.
- Test memory before and after runs.
- Add loop and budget checks.

Use this checklist before moving the workflow from advisory mode into a required gate. A first successful run proves the tool can execute. Repeated clean runs and actionable failures prove the team can depend on it.

## Verdict

ADK testing should explain how the agent acted, because tool calls and state transitions are often the real product behavior. Start with a narrow pilot, keep ownership close to the product team, and measure maintenance work after real failures. The goal is not a larger suite. The goal is a suite that gives better release decisions.

## Frequently Asked Questions

### Does ADK behavior testing replace hand-written tests?

No. It can reduce repetitive work and expose gaps, but hand-written tests still matter for business rules, new behavior, security paths, and cases that tools cannot infer from inputs alone.

### When should this become a CI gate?

Promote it only after failures are deterministic, actionable, and mapped to release risk. Start in reporting mode, remove noise, then gate the stable subset.

### What is the main maintenance risk?

The main risk is unclear ownership. Generated, healed, replayed, or instrumented checks still need someone to review failures, prune stale cases, and update assumptions when the product changes.
`,
};
