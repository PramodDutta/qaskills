import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Testing Token Limit Truncation Before It Breaks Agent Workflows',
  description: 'Use llm testing token limit truncation to catch clipped prompts, incomplete outputs, lost tool context, and misleading eval scores before release.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# LLM Testing Token Limit Truncation Before It Breaks Agent Workflows

LLM testing token limit truncation is the practice of proving that your prompts, retrieved context, tool outputs, and generated answers stay complete when they approach a model's context and output limits. The failure is not always a loud API error. Sometimes the model silently receives less context than your application intended, returns an answer cut off mid-structure, omits the final safety instruction, or loses the tool result that contained the only correct answer.

The direct way to test it is to create cases near the limits you actually use, instrument the prompt assembly path, assert on provider finish metadata when available, and verify semantic completeness rather than only string length. For agent workflows, add tests around tool-result compression, conversation history pruning, and multi-turn state because truncation often appears after the first successful turn.

This guide is for QA and test-automation engineers testing AI products and coding-agent flows. It uses TypeScript examples for harness design, YAML examples for promptfoo-style evals, and Python examples for RAG evaluation workflows. For broader agent test strategy, see the [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026). If your LLM app exposes tools through Model Context Protocol servers, connect these checks with [MCP servers for test automation](/blog/mcp-servers-test-automation-2026).

## Treat Tokens as a Contract, Not a Billing Detail

Token budgets control correctness. A prompt that fits during development can fail in production because a user uploads a longer document, retrieval returns more chunks, an agent accumulates more turns, or a tool emits verbose JSON. If the application truncates the wrong section, the model may answer confidently from stale or incomplete evidence. If output length is too small, the model may stop before closing JSON, listing all required test steps, or explaining a refusal.

There are four separate budgets to test:

| Budget | What it constrains | Typical truncation symptom | Test signal |
| --- | --- | --- | --- |
| Prompt assembly budget | System, developer, history, tools, retrieved context, user input | Missing instruction or missing evidence | Prompt manifest shows dropped segment |
| Model context window | Total input and output accepted by the provider | Request error or application-side pruning | Harness records estimated and provider usage |
| Maximum output setting | Generated response length | Answer ends mid-sentence or invalid JSON | Finish metadata or completeness assertion |
| Evaluator budget | Judge prompt plus candidate output | Misleading eval score or judge failure | Eval row marked invalid instead of scored |

The important shift is this: token limits are part of the product contract. A support bot that promises to answer from uploaded policy documents must handle long policies. A coding agent that promises to inspect test failures must keep the failing stack trace and relevant source. A RAG assistant that cites sources must not drop the chunk that backs the citation.

## Build a Prompt Manifest for Every LLM Call

Do not test truncation by staring at final answers only. Instrument the prompt builder so each LLM call produces a manifest: which segments were available, which were included, which were summarized, which were dropped, and why. This manifest can be attached to test results without exposing secrets if you store IDs, token estimates, and redacted excerpts.

\`\`\`ts
// src/llm/prompt-manifest.ts
export type PromptSegmentKind =
  | 'system'
  | 'developer'
  | 'conversation'
  | 'retrieved_context'
  | 'tool_result'
  | 'user';

export type PromptSegment = {
  id: string;
  kind: PromptSegmentKind;
  priority: number;
  text: string;
};

export type PromptManifestEntry = {
  id: string;
  kind: PromptSegmentKind;
  priority: number;
  estimatedTokens: number;
  action: 'included' | 'summarized' | 'dropped';
  reason: string;
};

export type PromptBuildResult = {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  manifest: PromptManifestEntry[];
};
\`\`\`

The exact token estimator should match your provider and model as closely as your stack allows. When exact tokenization is unavailable in a unit test, use a conservative estimator and verify with provider usage metadata in integration tests. The goal is not perfect accounting in every local test. The goal is to make prompt assembly decisions observable.

What people get wrong: they put truncation inside a utility that returns only final messages. Tests can see that the answer is bad, but not whether the system prompt, retrieved context, tool result, or user input was dropped. A manifest turns a vague model-quality failure into a debuggable product failure.

## Preserve High-Priority Segments First

A prompt builder should not drop segments in incidental array order. System and developer instructions usually have high priority. The latest user request is usually high priority. Tool results may outrank older conversation history. Retrieved chunks should be included based on relevance and citation needs, not only on retrieval order.

\`\`\`ts
// src/llm/build-prompt.ts
import type { PromptBuildResult, PromptSegment } from './prompt-manifest';

type Options = {
  maxInputTokens: number;
  estimateTokens: (text: string) => number;
};

export function buildPrompt(segments: PromptSegment[], options: Options): PromptBuildResult {
  let remaining = options.maxInputTokens;
  const manifest = [];
  const included = [];

  const sorted = [...segments].sort((a, b) => b.priority - a.priority);

  for (const segment of sorted) {
    const estimatedTokens = options.estimateTokens(segment.text);

    if (estimatedTokens <= remaining) {
      remaining -= estimatedTokens;
      included.push(segment);
      manifest.push({
        id: segment.id,
        kind: segment.kind,
        priority: segment.priority,
        estimatedTokens,
        action: 'included' as const,
        reason: 'fits within remaining input budget',
      });
      continue;
    }

    manifest.push({
      id: segment.id,
      kind: segment.kind,
      priority: segment.priority,
      estimatedTokens,
      action: 'dropped' as const,
      reason: 'not enough input budget',
    });
  }

  return {
    messages: included.map(segment => ({
      role: segment.kind === 'system' ? 'system' : 'user',
      content: segment.text,
    })),
    manifest,
  };
}
\`\`\`

This is a simplified builder, not a universal prompt architecture. Real systems often summarize old turns, reserve output tokens, group retrieved chunks, and preserve tool-call structure. The key testing property still applies: decisions are deterministic and visible.

A truncation test can assert that critical segments are included even under pressure.

\`\`\`ts
// test/build-prompt.truncation.test.ts
import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../src/llm/build-prompt';
import type { PromptSegment } from '../src/llm/prompt-manifest';

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

describe('buildPrompt truncation policy', () => {
  it('keeps system instructions, latest user request, and top tool result', () => {
    const segments: PromptSegment[] = [
      { id: 'system-safety', kind: 'system', priority: 100, text: 'Never reveal secrets.' },
      { id: 'old-turns', kind: 'conversation', priority: 10, text: 'Old conversation '.repeat(200) },
      { id: 'tool-test-log', kind: 'tool_result', priority: 90, text: 'The failing assertion is status 403.' },
      { id: 'retrieved-doc-low', kind: 'retrieved_context', priority: 30, text: 'Low relevance chunk '.repeat(100) },
      { id: 'user-latest', kind: 'user', priority: 95, text: 'Why did the checkout test fail?' },
    ];

    const result = buildPrompt(segments, {
      maxInputTokens: 80,
      estimateTokens,
    });

    const includedIds = result.manifest
      .filter(entry => entry.action === 'included')
      .map(entry => entry.id);

    expect(includedIds).toContain('system-safety');
    expect(includedIds).toContain('user-latest');
    expect(includedIds).toContain('tool-test-log');
    expect(includedIds).not.toContain('old-turns');
  });
});
\`\`\`

The test does not assert a model answer. It asserts the product's prompt assembly contract. That is faster, cheaper, and less flaky than calling a real model for every truncation policy case.

## Create Boundary Cases, Not Only Giant Inputs

A good truncation suite has cases just below the budget, exactly at the budget, and just above it. Giant inputs are useful for stress, but off-by-one and reservation bugs usually appear near boundaries. If your app reserves output tokens, the input budget is not the full context limit. It is the context limit minus the output allowance, tool overhead, and any provider-specific message overhead your adapter accounts for.

| Case | Input shape | Expected behavior |
| --- | --- | --- |
| Below budget | Critical context plus small history | No truncation, complete answer |
| At budget | Critical context fills available input | No critical segment dropped |
| Over budget by one low-priority segment | Old history exceeds budget | Old history dropped or summarized |
| Over budget by one high-priority segment | Latest user input is too large | User-visible error or explicit summarization |
| Long output required | Answer needs many steps or JSON fields | Output budget large enough or response asks to narrow |
| Long evaluator prompt | Candidate plus rubric near judge limit | Eval row marked invalid if judge context is insufficient |

Use fixtures that describe intent. A file named \`long-history-drops-policy.md\` is confusing. A file named \`old-history-dropped-system-kept.json\` tells reviewers what matters.

\`\`\`json
{
  "name": "old-history-dropped-system-kept",
  "maxInputTokens": 120,
  "requiredIncluded": ["system-policy", "latest-user", "retrieved-refund-policy"],
  "allowedDropped": ["conversation-turn-001", "conversation-turn-002"],
  "mustNotDrop": ["system-policy"]
}
\`\`\`

Store these cases in your normal test-data directory. Keep the long text in separate fixture files if it makes diffs easier. The assertion should read the case, build the prompt, and compare manifest decisions to \`requiredIncluded\`, \`allowedDropped\`, and \`mustNotDrop\`.

## Detect Output Truncation with More Than Length

Output truncation can be obvious, such as a sentence ending halfway through. It can also be subtle, such as JSON missing the last array item, a test plan omitting cleanup, or a coding agent stopping after describing a patch without giving the commands. If your provider returns finish metadata that indicates the output stopped because of length, record it and fail or retry according to product policy. If finish metadata is not available, use structural completeness checks.

\`\`\`ts
// src/llm/assert-complete-output.ts
export type LlmResponse = {
  text: string;
  finishReason?: string;
};

export function assertCompleteJsonObject(response: LlmResponse) {
  if (response.finishReason === 'length') {
    throw new Error('LLM output stopped because the output token limit was reached');
  }

  const trimmed = response.text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new Error('LLM output is not a complete JSON object');
  }

  return JSON.parse(trimmed) as unknown;
}
\`\`\`

Do not assume every provider uses the same finish reason names or exposes metadata in the same place. Normalize provider responses inside your adapter, then test your application against the normalized contract. For providers that support structured JSON output modes, use them where appropriate, but still test length pressure. A structured mode cannot produce fields if the response budget is too small.

For prose answers, define task-specific completion markers. A generated QA checklist might require sections for setup, execution, assertions, and cleanup. A debugging answer might require observed evidence, likely cause, and next step. A simple character count cannot prove that those sections are present.

\`\`\`ts
export function assertQaPlanComplete(answer: string) {
  const requiredHeadings = [
    'Setup',
    'Execution',
    'Assertions',
    'Cleanup',
  ];

  for (const heading of requiredHeadings) {
    if (!answer.includes(heading)) {
      throw new Error('Missing required section: ' + heading);
    }
  }
}
\`\`\`

The section names should match your product's output contract, not a generic template. If your agent returns machine-readable plans, validate the schema. If it returns Markdown, validate required headings and critical facts.

## Test Retrieval Overflow in RAG Systems

RAG truncation usually happens after retrieval. The retriever returns too many chunks, chunks are too large, or reranking keeps redundant text while dropping the one chunk that answers the question. The model then receives context that looks substantial but lacks the decisive evidence.

Create tests where the answer exists only in a late or medium-ranked chunk. Then assert that your context packing strategy includes that chunk when it is required by the query. Do not only test "top three chunks fit" because that rewards happy-path retrieval.

\`\`\`ts
type RetrievedChunk = {
  id: string;
  score: number;
  text: string;
  mustCite?: boolean;
};

export function packRetrievedContext(
  chunks: RetrievedChunk[],
  maxTokens: number,
  estimateTokens: (text: string) => number,
) {
  const selected = [];
  let remaining = maxTokens;

  const ordered = [...chunks].sort((a, b) => {
    if (a.mustCite && !b.mustCite) return -1;
    if (!a.mustCite && b.mustCite) return 1;
    return b.score - a.score;
  });

  for (const chunk of ordered) {
    const cost = estimateTokens(chunk.text);
    if (cost <= remaining) {
      selected.push(chunk);
      remaining -= cost;
    }
  }

  return selected;
}
\`\`\`

And the boundary test:

\`\`\`ts
import { expect, it } from 'vitest';
import { packRetrievedContext } from '../src/rag/pack-retrieved-context';

it('keeps the required refund policy chunk under tight context budget', () => {
  const chunks = [
    { id: 'shipping-general', score: 0.91, text: 'Shipping rules '.repeat(80) },
    { id: 'returns-general', score: 0.88, text: 'Return rules '.repeat(80) },
    { id: 'refund-exception', score: 0.72, mustCite: true, text: 'Refunds after failed payment capture require manual review.' },
  ];

  const selected = packRetrievedContext(
    chunks,
    90,
    text => Math.ceil(text.length / 4),
  );

  expect(selected.map(chunk => chunk.id)).toContain('refund-exception');
});
\`\`\`

This example uses a \`mustCite\` marker to show the test idea. In production, the marker might come from query analysis, reranker evidence, metadata filters, or a previous tool decision. The key is that context packing is a testable algorithm, not an invisible prelude to model generation.

Ragas and similar RAG evaluation tools can score faithfulness, context precision, answer relevance, and other metrics. Use those metrics after your deterministic packing tests. If the required evidence was never sent to the model, a faithfulness score only tells you about the downstream consequence, not the packing defect.

## Add Promptfoo-Style Evals for User-Visible Behavior

Deterministic unit tests protect prompt assembly and structural completeness. You still need end-to-end evals that call the model through your normal provider path. A promptfoo configuration can express prompts, providers, tests, and assertions. Keep token-limit cases separate from general quality cases so failures are easy to interpret.

\`\`\`yaml
description: Token truncation regression checks for support assistant
providers:
  - id: openai:gpt-4.1-mini
prompts:
  - file://prompts/support-answer.txt
tests:
  - vars:
      question: "Can I get a refund after a failed payment capture?"
      retrieved_context: file://fixtures/refund-policy-long-context.txt
    assert:
      - type: contains
        value: "manual review"
      - type: javascript
        value: |
          if (output.length < 200) {
            return false;
          }
          return output.includes("failed payment capture");
\`\`\`

Check provider IDs, model names, and assertion support against your installed promptfoo version and provider documentation. The shape above uses documented concepts: providers, prompts, tests, variables, and assertions. Your production config may add labels, thresholds, transforms, or sharing settings.

Do not let an eval pass when the model says, "The provided context does not mention that." For a truncation test, that answer is a failure if the fixture intentionally contains the policy. The test should prove the correct evidence survived context packing and generation.

## Protect Tool Results in Agent Workflows

Agent truncation often occurs after tool calls. A browser tool returns a long DOM snapshot, a test runner emits thousands of log lines, or a repository search returns many matches. The agent history grows, then the next model call drops the exact tool result that explained the failure. The agent may then hallucinate a fix because it remembers the task but not the evidence.

Create tool-result compaction tests. The contract should preserve the command, exit code, key error lines, relevant file paths, and a bounded excerpt. It should drop repeated passing logs, progress bars, dependency noise, and unrelated files.

\`\`\`ts
type ToolResult = {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

export function compactTestRunnerOutput(result: ToolResult) {
  const lines = (result.stdout + String.fromCharCode(10) + result.stderr)
    .split(String.fromCharCode(10));

  const important = lines.filter(line =>
    line.includes('FAIL') ||
    line.includes('Error:') ||
    line.includes('expected') ||
    line.includes('received') ||
    line.includes('.test.'),
  );

  return {
    command: result.command,
    exitCode: result.exitCode,
    excerpt: important.slice(0, 40),
  };
}
\`\`\`

Test that the compacted result keeps the failure line:

\`\`\`ts
import { expect, it } from 'vitest';
import { compactTestRunnerOutput } from '../src/agent/compact-tool-output';

it('keeps failing assertion details when compacting test output', () => {
  const compacted = compactTestRunnerOutput({
    command: 'npm test',
    exitCode: 1,
    stdout: [
      'PASS src/a.test.ts',
      'FAIL src/checkout.test.ts',
      'Error: expected status 200 received 403',
      'PASS src/b.test.ts',
    ].join(String.fromCharCode(10)),
    stderr: '',
  });

  expect(compacted.excerpt).toContain('FAIL src/checkout.test.ts');
  expect(compacted.excerpt).toContain('Error: expected status 200 received 403');
});
\`\`\`

This is a truncation test even though it never calls an LLM. It protects the evidence before the prompt is built. For coding agents, that is often the highest-leverage place to test.

## Mark Invalid Eval Rows Instead of Scoring Garbage

Evaluator truncation is easy to miss. A judge model may receive a long candidate answer plus rubric plus reference context. If the judge prompt truncates the reference, it might score a bad answer as good or a good answer as unsupported. Your eval harness should detect when an evaluator lacks required inputs and mark the row invalid, not scored.

\`\`\`python
from dataclasses import dataclass

@dataclass
class EvalRow:
    case_id: str
    candidate_answer: str
    reference_context: str
    rubric: str

def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)

def can_score(row: EvalRow, judge_budget: int) -> bool:
    total = (
        estimate_tokens(row.candidate_answer)
        + estimate_tokens(row.reference_context)
        + estimate_tokens(row.rubric)
    )
    return total <= judge_budget

def classify_eval_row(row: EvalRow, judge_budget: int) -> str:
    if not can_score(row, judge_budget):
        return "invalid_judge_context_too_large"
    return "ready_to_score"
\`\`\`

If you use Ragas, DeepEval, promptfoo, or custom judges, keep the same principle. A metric is only meaningful when the judge saw the necessary answer, reference, rubric, and tool trace. When that cannot fit, split the case, summarize with a tested summarizer, or use a judge model and configuration that can handle the row. Do not average invalid rows into a quality score.

## Diagnose the Cut-Off JSON Failure

A realistic failure mode: an LLM-powered API returns JSON to the frontend. Under normal inputs, the JSON parses. Under long retrieved context, the model hits the output limit and returns a string that starts with a valid object but ends before the final field. The frontend catches the parse error and displays a generic fallback. Product analytics show lower task completion, but the test suite only checked that the HTTP status was 200.

The diagnosis sequence:

| Evidence | What to inspect | Likely finding |
| --- | --- | --- |
| Provider metadata | Finish reason or usage fields when available | Output stopped due to length |
| Raw response text | Last characters of output | Object or Markdown list cut off |
| Prompt manifest | Included and dropped segments | Too much low-value context included |
| App logs | Parser error and fallback path | Invalid JSON converted to generic answer |
| Eval result | Assertion details | Quality assertion did not check structure |

Fix the issue at the right layer. Increase output allowance if the answer is legitimately long. Reduce prompt context if irrelevant chunks are consuming budget. Use structured output support where your provider and SDK support it. Add a completeness check before returning the answer to the frontend. Most importantly, add a regression case with the same long-context shape that caused the failure.

\`\`\`ts
it('rejects truncated structured answers before returning to clients', () => {
  const response = {
    text: '{"summary":"Refund requires manual review","steps":["Open case"',
    finishReason: 'length',
  };

  expect(() => assertCompleteJsonObject(response)).toThrow(
    'LLM output stopped because the output token limit was reached',
  );
});
\`\`\`

The app can then retry with a larger output allowance, ask the user to narrow the request, or return a controlled error. What it should not do is pass partial JSON into product logic.

## Build a Release Gate for Token Regressions

Token regressions creep in through harmless-looking changes: a longer system prompt, extra retrieved chunks, verbose tool schemas, added conversation memory, or more detailed output requirements. Put token checks in CI so the team sees budget drift before users do.

| Gate | What it catches | Suggested failure message |
| --- | --- | --- |
| Prompt manifest unit tests | Wrong segment dropped | Critical prompt segment excluded under budget |
| Fixture boundary tests | Off-by-one packing bugs | Context case exceeded budget policy |
| Model eval truncation cases | User-visible incomplete answer | Required evidence missing from answer |
| Structured output parser tests | Cut-off JSON or lists | Output incomplete or stopped by length |
| Evaluator budget checks | Misleading quality scores | Eval row invalid because judge lacks context |

Keep these gates separate from broad subjective quality evals. A truncation failure is usually binary: required context was included or not, output completed or not, judge could score or not. That makes it a good fit for CI.

## Frequently Asked Questions

### How do I know if an LLM answer was truncated?

Check provider finish metadata when your adapter exposes it, then validate the response structure. A length-related finish reason, missing closing JSON delimiter, incomplete Markdown section, absent required field, or answer that stops mid-list can all indicate truncation. Do not rely only on character count. Task-specific completeness checks are more reliable because short complete answers and clipped long answers can look similar in metrics.

### Should I solve truncation by always using a larger context model?

Not by default. Larger context can help, but it can also hide poor prompt packing and increase cost. First test whether critical segments are prioritized, old history is summarized or dropped safely, and retrieved context is deduplicated. Use a larger context when the product genuinely needs it, then keep the same boundary tests so regressions remain visible as prompts, tool schemas, and user documents grow.

### What is the difference between prompt truncation and output truncation?

Prompt truncation means the model did not receive all intended input: instructions, history, retrieved context, tool results, or user text. Output truncation means the model received the prompt but stopped before completing the answer. They require different evidence. Prompt manifests diagnose input loss. Finish metadata, parser checks, and completeness assertions diagnose output loss. A good test suite separates those failure modes.

### How should I test truncation in agent workflows?

Test the layers before the model call and after it. Verify tool-result compaction keeps failing evidence, prompt assembly preserves the latest request and critical tool outputs, and generated plans include required sections or valid structure. Add multi-turn cases because agents often fit on turn one and fail after history, tool results, and memory accumulate. Include at least one case with long logs or large tool JSON.
`,
};
