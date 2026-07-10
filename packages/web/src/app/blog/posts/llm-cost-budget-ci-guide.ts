import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Cost Budget Testing in CI Guide',
  description:
    'LLM cost budget testing in CI guide: enforce token ceilings, sample evals, cap model spend, and stop prompt changes from surprising finance.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `# LLM Cost Budget Testing in CI Guide

A single harmless prompt can become a budget regression when it doubles context, raises max output tokens, or routes a common request to a more expensive model. Traditional CI catches syntax errors. It rarely catches "this pull request makes every support answer cost twice as much." LLM cost budget testing fills that gap by treating cost as a testable property of prompts, routes, evals, and agent loops.

The goal is not to block every experiment. The goal is to make cost changes visible while they are still small. A senior SDET should be able to say which workflow was sampled, how tokens were counted, what ceiling was enforced, and whether the change was accepted deliberately. For latency and quality tradeoffs, read [LLM eval cost latency testing guide](/blog/llm-eval-cost-latency-testing-guide-2026). For dashboard language that leadership understands, connect the numbers to [test automation metrics and KPIs](/blog/test-automation-metrics-kpis-guide).

## Define budgets at the workflow boundary

Budget tests fail when they are attached to the wrong thing. A raw prompt file does not spend money by itself. A workflow spends money when it chooses a model, builds messages, calls tools, retries, and generates output. Put budgets around those executable paths.

Different workflows deserve different ceilings. A lightweight classification call can have a tiny budget. A deep code review agent may need more tokens but should still have a cap on iterations. A customer-facing chat route may need both per-request cost and daily sampling alarms.

| Workflow | Budget dimension | Example ceiling style | Failure meaning |
|---|---|---|---|
| Intent classifier | Input plus output tokens | Fixed low maximum per request | Prompt or schema grew too large |
| Retrieval answer | Prompt tokens and retrieved chunks | Context window cap per query | Retriever is stuffing irrelevant text |
| Agentic bug triage | Tool calls and total tokens | Max loop count plus token ceiling | Agent is wandering or retrying blindly |
| Batch eval | Total estimated dollars | Per-PR sample budget | Eval set is too large for every pull request |

## Use deterministic cost estimation before live calls

CI should not always call paid APIs just to estimate cost. Start by counting tokens for the messages your application would send, then multiply by checked-in pricing configuration or a deliberately mocked rate table. Keep the rate table easy to update and label it as an estimate. Real provider prices can change, so do not bury them in test code as eternal facts.

The following Vitest example uses \`tiktoken\` to count tokens for a prompt builder. The prices are sample configuration values, not a claim about current provider pricing.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { encoding_for_model } from 'tiktoken';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

const estimateRates = {
  inputPerMillion: 2.5,
  outputPerMillion: 10,
};

function estimateCost(messages: Message[], expectedOutputTokens: number) {
  const enc = encoding_for_model('gpt-4o-mini');
  try {
    const inputTokens = messages.reduce((sum, message) => {
      return sum + enc.encode(message.role).length + enc.encode(message.content).length;
    }, 0);

    return (
      (inputTokens / 1_000_000) * estimateRates.inputPerMillion +
      (expectedOutputTokens / 1_000_000) * estimateRates.outputPerMillion
    );
  } finally {
    enc.free();
  }
}

describe('support answer prompt budget', () => {
  it('stays under the per-request estimate', () => {
    const messages: Message[] = [
      { role: 'system', content: 'Answer from approved support policy only.' },
      { role: 'user', content: 'Customer cannot reset password after MFA change.' },
    ];

    expect(estimateCost(messages, 350)).toBeLessThan(0.01);
  });
});
\`\`\`

The value of this test is not the exact cent. It prevents unreviewed prompt growth from sneaking into a common route.

## Put token accounting beside prompt construction

Token budgets become unreliable when tests rebuild prompts differently from production. The application should expose a prompt construction function that CI can call without making a live LLM request. That function should include system messages, retrieved context, tool descriptions, schemas, and any hidden developer instructions.

If your app dynamically selects context, test representative fixtures. For retrieval, include a fixture with many candidate chunks and assert the final packed context stays under the cap. For agents, include the tool list because tool schemas can dominate prompt size.

\`\`\`ts
import { describe, expect, it } from 'vitest';

type SearchHit = { title: string; body: string };

function buildAnswerMessages(question: string, hits: SearchHit[]) {
  const context = hits
    .slice(0, 4)
    .map((hit) => 'Title: ' + hit.title + '\\n' + hit.body)
    .join('\\n\\n');

  return [
    { role: 'system' as const, content: 'Use the provided context. Say when context is missing.' },
    { role: 'user' as const, content: 'Context:\\n' + context + '\\n\\nQuestion: ' + question },
  ];
}

describe('retrieval packing', () => {
  it('caps the number of chunks sent to the model', () => {
    const hits = Array.from({ length: 20 }, (_, index) => ({
      title: 'policy ' + index,
      body: 'Refund policy paragraph '.repeat(80),
    }));

    const messages = buildAnswerMessages('Can I get a refund after 40 days?', hits);

    expect(messages[1].content.match(/Title:/g)).toHaveLength(4);
  });
});
\`\`\`

This test does not need an API key. It checks the packing rule that drives cost.

## Sampling evals without hiding expensive paths

Full eval suites can be too expensive for every pull request. Sampling is fine if it is intentional. Do not sample randomly without a seed and then compare unstable results. Keep a small deterministic smoke set for PRs, a broader scheduled set, and a deep release gate when model or prompt routing changes.

The sample must include cost-heavy paths. If every PR eval uses short English questions, it will not catch long-context support tickets, multi-turn agent loops, or tool schemas. Maintain a "budget adversarial" subset with the longest realistic inputs and the workflows that historically spend the most.

| Eval tier | When it runs | What it should include | Budget rule |
|---|---|---|---|
| PR smoke | Every prompt or route change | Fixed small cases plus one long-context case | Hard ceiling, fast fail |
| Nightly | Scheduled | Broader language, topic, and retrieval set | Trend budget and alert |
| Release | Before model or routing launch | High-volume workflows and agent loops | Approval required for increase |
| Incident replay | After cost anomaly | Real anonymized expensive cases | Prove regression is contained |

## Testing retry and agent loop limits

Cost spikes often come from loops, not single prompts. A tool call fails, the agent retries with more context, the model asks for another tool, and the request slowly turns into a bill. CI should test loop limits with mocked model responses.

Use fake model clients that return tool-call sequences. Assert the orchestrator stops at the configured cap and returns a controlled failure. This is budget testing and reliability testing at the same time.

## Making failures actionable for developers

A budget test that says "cost too high" is not useful. It should report which workflow exceeded the ceiling, estimated input tokens, expected output cap, model route, and the largest prompt section. Developers need to know whether to shorten instructions, reduce retrieved chunks, compress tool schemas, or ask for a budget increase.

Avoid shaming language in CI messages. Cost changes can be legitimate. The test should force review, not imply wrongdoing. A good failure message says: "support-answer estimated 7,820 input tokens, ceiling 5,000, top contributor retrieved_context." That points directly to the fix.

## Handling real provider prices without pretending they are static

Provider pricing changes, discounts differ, and enterprise agreements may not match public pages. Treat checked-in rates as testing configuration. Store the date and source in a comment outside the assertion, or load rates from a controlled config updated by the platform team. The test enforces relative budget discipline, while finance reconciliation uses actual billing exports.

Never fabricate savings claims in test reports. If you report dollars, label them estimated unless they come from billing data. For CI gating, estimated cost is usually enough because the purpose is detecting regressions early.

## Golden prompts for budget regression testing

Keep a small set of golden prompts for each expensive workflow. These are not golden answers. They are representative requests used to measure prompt size, route choice, output cap, and loop behavior. Store them with labels that explain why they exist: long support ticket, multilingual refund request, codebase triage with many files, or tool-heavy agent case.

Golden prompts should be stable. If every PR changes the fixture, the budget trend becomes meaningless. Add new fixtures when production traffic reveals a new expensive shape. Remove fixtures only after the workflow is retired or the case is no longer realistic.

For privacy, scrub real customer text before turning it into a fixture. Preserve the structural cost driver, such as length, number of attachments, or policy references, without retaining personal data.

## Separating cost budgets from quality gates

Cost and quality are related, but a cheap bad answer is not a success. Keep budget tests separate from quality evals so failures are diagnosable. A cost budget failure says the workflow spent too much. A quality eval failure says the answer did not satisfy expectations. A latency failure says the user waited too long.

The release decision may combine all three. For example, a prompt change might increase estimated cost by 12 percent but improve critical answer accuracy enough to justify it. That should be an explicit approval, not a hidden side effect. Separate gates make the tradeoff visible.

| Gate | Primary signal | Owner likely to review |
|---|---|---|
| Budget test | Estimated tokens, model route, loop count | Platform or engineering manager |
| Quality eval | Rubric score, exact match, human review sample | Product and QA |
| Latency check | p95 response time and timeout rate | SRE and application team |
| Safety eval | Refusal, policy adherence, leakage checks | Security or trust team |

## Provider usage reconciliation

CI estimates should be reconciled against actual billing or usage exports. The goal is not to make CI equal the invoice penny for penny. The goal is to detect when estimates drift so far that budget tests stop being useful.

Compare aggregate usage by workflow when possible. If the app tags requests with workflow names, model names, and environment, finance reports become easier to interpret. Without tags, teams end up arguing from total spend, which is too coarse for engineering action.

Testing can enforce tags. A model client wrapper can require \`workflow\`, \`environment\`, and \`requestPurpose\` metadata before sending a request. Unit tests can assert that common routes pass those fields. That small control pays off when a cost anomaly needs root cause analysis.

## Budget tests for streaming responses

Streaming changes the user experience but not the need for output caps. A streamed answer can still generate far more tokens than expected if the stop condition is weak. Test the requested max output tokens or equivalent provider option in the request builder. Also test that the application stops reading or cancels when the user disconnects, if your stack supports cancellation.

For streaming UX, include a latency-to-first-token measure in performance tests, but keep the budget assertion focused on total allowed output. A quick stream that produces an enormous answer can still be a cost regression.

## Handling model routing rules

Many applications choose models dynamically. A short classifier may use one model, a complex reasoning path another, and a fallback path a third. Budget tests should assert routing rules for representative cases. Otherwise a small prompt edit can accidentally push common traffic to the expensive route.

Mock the router inputs and assert the selected model class, not the provider's private details. If a workflow is allowed to escalate, test the condition. If escalation requires approval, make that approval visible in configuration.

Model routing tests also protect evals. An eval sample intended to measure the economical path should not silently run on the premium route because a feature flag changed.

## Pull-request reporting that developers will read

Budget checks should produce a short diff-style report. Show previous estimate, new estimate, delta, and the prompt section responsible. Developers do not need a finance dashboard in a pull request. They need to know whether the system prompt grew, retrieved context expanded, a tool schema changed, or the output cap moved.

Good reports group by workflow. If the support answer route increases but the classifier stays flat, say that. If every workflow increases because a shared policy block was added, say that too. The report should point to the owner of the changed prompt or route.

Keep historical comparison deterministic. Compare against the main-branch fixture result or a checked-in baseline file, not against the last random CI run. If the baseline changes intentionally, review it like code.

## Budgeting multi-turn conversations

Many LLM applications are not single request systems. Chatbots, coding agents, and support copilots carry conversation history. Budget tests should include history compaction and truncation rules. Otherwise a route can pass first-turn tests and become expensive by turn six.

Create a fixture with a realistic conversation history, then assert which messages are retained, summarized, or dropped. If the app summarizes old turns, test the maximum summary size. If it keeps tool results, test that large tool outputs are clipped before returning to the model.

The pass condition should reflect product behavior: preserve facts needed for correctness, remove stale verbosity, and stay under the token cap. Cost control should not erase context silently in a way that creates wrong answers.

## Reducing cost without damaging test realism

When a budget test fails, the cheapest fix is often to shrink the fixture until it passes. That is also the easiest way to make the test useless. Preserve the cost driver that matters. If production tickets include long logs, keep a long log fixture but remove irrelevant repetition. If tool schemas are large, test the real schema shape rather than a toy substitute.

Cost reduction should happen in the product path: better retrieval limits, shorter system instructions, smaller tool schemas, stricter output caps, or earlier classification. The test should then prove the actual workflow became cheaper. A fixture-only reduction is valid only when the fixture was unrealistic.

Track accepted increases with a reason. A budget history that says "raised support-answer ceiling for new compliance citation requirement" is far more useful than an unexplained number change.

## Alerting on budget drift after merge

CI protects the proposed change, but production traffic can still drift when user behavior changes. Add alerts for workflow-level spend, unusually long prompts, and unexpected model routes. Keep those alerts tied to engineering owners, not only finance inboxes. The team that can reduce the cost needs to see the signal quickly.

## Frequently Asked Questions

### Should CI call the real LLM provider for budget tests?

Not for basic token ceilings. Count tokens and test prompt construction offline. Use live calls only for small eval samples where quality, latency, or provider behavior matters.

### How do I choose a budget ceiling?

Start from current measured behavior for a workflow, add a small review buffer, and document the owner. Critical high-volume routes should have tighter ceilings than rare analyst workflows.

### What if a prompt needs to become more expensive to improve quality?

Allow an intentional budget update with evidence: quality improvement, expected traffic, and approval from the product or platform owner. The test should make the tradeoff explicit.

### Are token counts enough to control LLM cost?

No. Also cap model selection, retries, tool-call loops, eval sample size, and expected output tokens. Token counting is the foundation, not the whole control system.

### How should agent tool schemas be tested?

Include the tool definitions in the prompt builder used by tests. Large schemas can dominate input tokens, so CI should fail when a tool description change pushes a common workflow over its cap.
`,
};
