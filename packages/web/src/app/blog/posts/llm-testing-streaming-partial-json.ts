import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'LLM Testing Streaming Partial JSON Without Fragile Parsers',
  description: 'Use this llm testing streaming partial json guide to catch broken chunks, schema drift, parser hangs, and unsafe agent output before production reliably.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# LLM Testing Streaming Partial JSON Without Fragile Parsers

LLM testing streaming partial JSON means testing the entire output path, not just the final object. A reliable suite should replay realistic chunks, verify that incomplete JSON never gets treated as complete, enforce schema after assembly, and prove the UI or agent loop can handle cancellation, malformed fragments, and delayed closing braces without hanging.

This matters because streaming changes the failure surface. A non-streaming JSON response either parses or it does not. A streaming response can look valid for the first ten chunks, drift into free text, emit duplicate keys, pause before a required field, or close a nested object after the client has already acted. QA engineers need tests for the parser, the transport wrapper, the schema validator, and the product behavior triggered by partial output.

The examples below use TypeScript and generic web streams so they apply whether the upstream model is called directly, through a gateway, through an agent runtime, or through an MCP-connected tool. The provider-specific event format can vary, but the test principles remain the same: separate framing from JSON assembly, treat partial state as untrusted, and assert what can safely happen before the complete object is available.

## Name the three layers before writing tests

Streaming partial JSON bugs usually come from mixing three separate layers: transport framing, text assembly, and semantic validation. The transport layer delivers bytes or events. The assembly layer decides when enough text exists to parse a JSON value. The semantic layer validates that the parsed value matches the schema and business rules. If one helper does all three, tests become hard to target and failures become vague.

| Layer | Responsibility | Example failure | Best test seam |
|---|---|---|---|
| Transport framing | Convert chunks, lines, or events into text fragments | Split multibyte character, dropped final event | Replay byte chunks and event lines |
| JSON assembly | Detect when a full JSON value is complete | Parse early, hang forever, accept trailing text | Feed fragments into incremental assembler |
| Schema validation | Enforce required fields and allowed values | Missing action, wrong enum, extra unsafe field | Validate complete parsed object |
| Product behavior | Decide what UI or agent loop may do | Executes a tool before final validation | Integration test with fake stream |

Keep the boundaries visible in code. A stream reader should not decide that an action is approved. A JSON assembler should not know about browser buttons. A schema validator should not read network bytes. Once these responsibilities are separate, you can test ugly chunk boundaries without making every scenario call a real model.

For larger AI workflow coverage, the [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) covers planning, tool choice, and multi-turn state. This article zooms into the narrower but critical problem of streamed structured output.

## Build a replayable stream fixture

The fastest way to test streaming behavior is to remove the real model from parser tests. Capture or hand-author representative fragments, then replay them through the same stream-reading code the application uses. Tests should include tiny chunks, awkward boundary splits, delayed completion, and explicit aborts.

Here is a small fixture that creates a \`ReadableStream<Uint8Array>\` from text chunks. It uses \`TextEncoder\`, which is available in modern Node and browser environments.

\`\`\`ts
export function streamFromTextChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
\`\`\`

That fixture is deliberately simple. A second fixture can add delays or cancellation when needed:

\`\`\`ts
export function delayedStream(
  chunks: string[],
  delayMs: number,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
\`\`\`

Do not start with a live model call. Live calls are useful for end-to-end smoke tests and regression corpus collection, but they are poor unit tests for parser correctness. They introduce latency, cost, nondeterminism, and provider behavior that may change independently of your parser. Use real calls to discover cases, then turn those cases into replayable fixtures.

## Decode bytes before making JSON decisions

Stream chunks are not guaranteed to align with characters, tokens, JSON properties, or event boundaries. A multibyte character can be split across two byte chunks. A closing brace can arrive alone. A JSON string can contain escaped quotes. Your first job is to decode bytes into text safely, preserving decoder state between chunks.

\`\`\`ts
export async function readAllText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = '';

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    output += decoder.decode(result.value, { stream: true });
  }

  output += decoder.decode();
  return output;
}
\`\`\`

The \`{ stream: true }\` option tells the decoder that more bytes may arrive. Without that, split characters can be replaced or corrupted. That is not an LLM problem. It is a stream decoding problem, and it should be tested independently.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { streamFromTextChunks } from './stream-fixtures';
import { readAllText } from './read-all-text';

describe('readAllText', () => {
  it('preserves text across small chunks', async () => {
    const stream = streamFromTextChunks(['{"act', 'ion":"summ', 'arize"}']);

    await expect(readAllText(stream)).resolves.toBe('{"action":"summarize"}');
  });
});
\`\`\`

This test is basic, but it prevents a class of false parser failures. If decoding corrupts text, schema validation will blame the model for invalid JSON when the client actually broke the stream.

## Choose a framing format and test it directly

Partial JSON can arrive in several formats. Some systems stream raw JSON text. Some stream newline-delimited JSON objects. Some use server-sent events where each event line contains a data payload. Some model gateways send deltas that must be concatenated. Each format needs a framing parser before JSON assembly.

| Format | What arrives per chunk | Testing focus | Common mistake |
|---|---|---|---|
| Raw JSON text | Arbitrary pieces of one JSON document | Full-value detection | Calling \`JSON.parse\` after every chunk and logging noise |
| NDJSON | One JSON object per line when complete | Line buffering | Treating partial lines as complete objects |
| SSE-style events | Lines with event data and blank-line separators | Event boundary handling | Dropping the final event without a trailing blank line |
| Delta events | Small text or field deltas inside envelopes | Ordered assembly | Acting on an action name before required arguments arrive |

Here is a line framer for newline-delimited data. It buffers the last incomplete line instead of emitting it early.

\`\`\`ts
export class LineFramer {
  private buffer = '';

  push(text: string): string[] {
    this.buffer += text;
    const lines = this.buffer.split('\\n');
    this.buffer = lines.pop() ?? '';
    return lines.filter((line) => line.length > 0);
  }

  flush(): string[] {
    if (this.buffer.length === 0) return [];
    const final = this.buffer;
    this.buffer = '';
    return [final];
  }
}
\`\`\`

In normal source code, the string delimiter should contain the newline escape your runtime expects.

Test the incomplete-line behavior:

\`\`\`ts
import { expect, it } from 'vitest';
import { LineFramer } from './line-framer';

it('does not emit an incomplete line before the newline arrives', () => {
  const framer = new LineFramer();

  expect(framer.push('{"type":"delta"')).toEqual([]);
  expect(framer.push(',"text":"hel')).toEqual([]);
  expect(framer.push('lo"}\\n')).toEqual(['{"type":"delta","text":"hello"}']);
  expect(framer.flush()).toEqual([]);
});
\`\`\`

This catches a subtle production bug. If the parser emits \`{"type":"delta"\` as a line, downstream code may attempt to parse it, catch the error, and either spam logs or mark the model as failed before the stream has actually delivered the rest.

## Assemble JSON only at safe boundaries

For raw JSON text, a common approach is to collect fragments and attempt parsing after each append. That can work if parse failures are treated as “not complete yet” only when they are plausibly caused by incompleteness. It becomes dangerous when every parse error is ignored forever. A malformed completed object should fail, not hang until a timeout.

A safer assembler should track whether the stream has ended. During streaming, it may return “incomplete.” At the end, it must either return a parsed value or raise a useful error.

\`\`\`ts
export class JsonValueAssembler {
  private text = '';

  push(fragment: string): { status: 'incomplete' } | { status: 'complete'; value: unknown } {
    this.text += fragment;

    try {
      return { status: 'complete', value: JSON.parse(this.text) };
    } catch {
      return { status: 'incomplete' };
    }
  }

  finish(): unknown {
    try {
      return JSON.parse(this.text);
    } catch (error) {
      throw new Error('Stream ended before valid JSON was assembled');
    }
  }
}
\`\`\`

This is intentionally conservative. It does not try to repair JSON. It does not remove Markdown fences. It does not guess missing braces. Repair logic can be appropriate for developer tooling, but production QA tests should distinguish between supported tolerant parsing and accidental cleanup that hides model drift.

A basic test proves that complete JSON is emitted once the final brace arrives:

\`\`\`ts
import { expect, it } from 'vitest';
import { JsonValueAssembler } from './json-value-assembler';

it('waits until the full object is parseable', () => {
  const assembler = new JsonValueAssembler();

  expect(assembler.push('{"tool":"search",')).toEqual({ status: 'incomplete' });
  expect(assembler.push('"args":{"query":"etag tests"}}')).toEqual({
    status: 'complete',
    value: {
      tool: 'search',
      args: { query: 'etag tests' },
    },
  });
});
\`\`\`

Now test a malformed final stream. This is where many suites are weak. They test valid fragments but never prove that the client fails closed when the final output is invalid.

\`\`\`ts
import { expect, it } from 'vitest';
import { JsonValueAssembler } from './json-value-assembler';

it('fails when the stream ends with malformed JSON', () => {
  const assembler = new JsonValueAssembler();

  assembler.push('{"tool":"search",');
  assembler.push('"args":');

  expect(() => assembler.finish()).toThrow('Stream ended before valid JSON was assembled');
});
\`\`\`

The exact error message can be your own. The requirement is that the stream does not silently produce an empty object, execute a default action, or leave a promise pending until the test runner times out.

## Validate schema after assembly, before action

Parsing JSON is not enough. A parsed object can still be semantically unsafe. It may omit a required field, use an unsupported action, include a string where an object is expected, or include extra fields that should not reach a tool. Put schema validation between assembly and product behavior.

The example below uses a small hand-written validator to avoid claiming a particular schema library API. In production, use the schema validator already standard in your stack.

\`\`\`ts
type AgentCommand =
  | { action: 'summarize'; input: { documentId: string } }
  | { action: 'search'; input: { query: string } };

export function parseAgentCommand(value: unknown): AgentCommand {
  if (!value || typeof value !== 'object') {
    throw new Error('Command must be an object');
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.action === 'summarize') {
    const input = candidate.input as Record<string, unknown> | undefined;
    if (!input || typeof input.documentId !== 'string') {
      throw new Error('Summarize command requires input.documentId');
    }
    return { action: 'summarize', input: { documentId: input.documentId } };
  }

  if (candidate.action === 'search') {
    const input = candidate.input as Record<string, unknown> | undefined;
    if (!input || typeof input.query !== 'string') {
      throw new Error('Search command requires input.query');
    }
    return { action: 'search', input: { query: input.query } };
  }

  throw new Error('Unsupported command action');
}
\`\`\`

This validator also normalizes the object. It returns only the fields the application uses. That prevents extra model-supplied fields from being forwarded to tools by accident. In agent systems, extra fields can matter. A model might include \`dryRun: false\`, \`scope: all\`, or \`reasoning\` next to arguments. If downstream code spreads the whole object into a tool call, the agent can cross boundaries the schema never approved.

Test rejected commands explicitly:

\`\`\`ts
import { expect, it } from 'vitest';
import { parseAgentCommand } from './agent-command';

it('rejects a parsed command with an unsupported action', () => {
  expect(() => parseAgentCommand({
    action: 'delete_all',
    input: { confirm: true },
  })).toThrow('Unsupported command action');
});

it('does not pass extra fields through normalization', () => {
  const command = parseAgentCommand({
    action: 'search',
    input: { query: 'fixture composition', scope: 'admin' },
  });

  expect(command).toEqual({
    action: 'search',
    input: { query: 'fixture composition' },
  });
});
\`\`\`

The second test is especially useful for AI coding agents. Generated integration code often uses object spreading because it is concise. The test forces a safer shape: validate, normalize, then execute.

## Verify UI behavior while JSON is incomplete

User interfaces that stream structured output often show progress. That is fine. The risky part is enabling actions too early. If the final JSON has not been assembled and validated, the UI can preview text but should not execute a tool, submit a form, or commit a setting.

An integration test can use a fake stream to prove the button remains disabled until validation completes. In a browser test, one dependable option is to replace \`fetch\` before the app loads and return a standard \`Response\` whose body is a \`ReadableStream\`.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('agent action stays disabled until streamed JSON is complete', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      if (String(input).includes('/api/agent/command')) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('{"action":"search",'));
            setTimeout(() => {
              controller.enqueue(encoder.encode('"input":{"query":"playwright fixtures"}}'));
              controller.close();
            }, 50);
          },
        });

        return new Response(stream, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return originalFetch(input, init);
    };
  });

  await page.goto('/agent');
  await page.getByRole('button', { name: 'Generate command' }).click();

  await expect(page.getByRole('button', { name: 'Run command' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Run command' })).toBeEnabled();
});
\`\`\`

This assumes the application reads from \`fetch\` in the page. If your app uses a framework-level transport abstraction, mock that abstraction instead. The scenario is the important part: the first fragment is convincing but incomplete, and the UI must wait.

For tool-connected agent workflows, the [MCP servers for test automation guide](/blog/mcp-servers-test-automation-2026) explains the server side of tool schemas and automation surfaces. Streaming tests should sit in front of those tool calls so malformed partial JSON never becomes an MCP request.

## Build a corpus of chunk boundary cases

A good stream test suite has a small corpus of cases that can run quickly in CI. Do not store only final JSON examples. Store chunk arrays, expected status, and the reason each case exists. That makes regression intent clear when a future agent or developer changes the parser.

| Case name | Chunks | Expected result | Risk covered |
|---|---|---|---|
| split property name | \`{"act\`, \`ion":"search"}\` | Complete object | Token boundary does not matter |
| delayed required field | action first, input later | No execution until complete | Early action bug |
| malformed ending | valid prefix, invalid finish | Parser error | Fail closed on final invalid output |
| extra unsafe field | complete JSON with extra property | Normalized command | Prevent argument spreading |
| duplicate-looking event | repeated delta text | Deterministic assembly | Avoid double tool execution |

Represent the corpus as data:

\`\`\`ts
type StreamCase = {
  name: string;
  chunks: string[];
  shouldParse: boolean;
};

export const streamCases: StreamCase[] = [
  {
    name: 'split property name',
    chunks: ['{"act', 'ion":"search","input":{"query":"qa"}}'],
    shouldParse: true,
  },
  {
    name: 'malformed ending',
    chunks: ['{"action":"search",', '"input":'],
    shouldParse: false,
  },
  {
    name: 'trailing prose',
    chunks: ['{"action":"search","input":{"query":"qa"}}', ' done'],
    shouldParse: false,
  },
];
\`\`\`

Then drive a table test:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { JsonValueAssembler } from './json-value-assembler';
import { streamCases } from './stream-cases';

describe('stream corpus', () => {
  for (const item of streamCases) {
    it(item.name, () => {
      const assembler = new JsonValueAssembler();
      for (const chunk of item.chunks) assembler.push(chunk);

      if (item.shouldParse) {
        expect(() => assembler.finish()).not.toThrow();
      } else {
        expect(() => assembler.finish()).toThrow();
      }
    });
  }
});
\`\`\`

The “trailing prose” case is important. Many LLMs are prompted to return JSON but occasionally append a sentence. If your parser uses \`JSON.parse\`, trailing prose fails. If your product intentionally extracts the first JSON object from surrounding text, write tests for that explicit tolerant behavior and add safety rules. Do not let accidental tolerance become the contract.

## What people get wrong about partial JSON

The first mistake is equating “visible opening fields” with permission to act. A stream might start with \`{"action":"refund"\` and later add arguments that fail validation. Until the full command is parsed and normalized, it is only text. The agent loop may display progress, but it should not call a tool.

The second mistake is letting timeouts define correctness. A test that waits five seconds and expects no crash is not a parser test. It is a slow absence-of-evidence test. Parser tests should complete quickly and deterministically. Use explicit stream closure to prove invalid endings fail. Use cancellation tests to prove user aborts release resources.

The third mistake is repairing too much. Stripping Markdown fences from a model response may be a reasonable compatibility feature in a developer tool, but it must be an intentional product behavior. For production agents, silent repair can hide prompt drift and make audit logs misleading. If you allow repairs, record that a repair happened and test both repaired and rejected paths.

## Add cancellation and backpressure checks

Streaming code often passes parser tests and still leaks work after the user leaves the page. A QA suite should include cancellation behavior. When an \`AbortSignal\` fires, the fetch should stop, the reader should release or cancel according to your implementation, and no later partial output should update the UI.

\`\`\`ts
export async function collectUntilAbort(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';

  signal.addEventListener('abort', () => {
    reader.cancel().catch(() => undefined);
  });

  while (!signal.aborted) {
    const result = await reader.read();
    if (result.done) break;
    text += decoder.decode(result.value, { stream: true });
  }

  return text;
}
\`\`\`

The test does not need a real model. Use a delayed stream, abort after the first chunk, and assert that later chunks do not appear in collected text.

\`\`\`ts
import { expect, it } from 'vitest';
import { delayedStream } from './stream-fixtures';
import { collectUntilAbort } from './collect-until-abort';

it('stops collecting text after abort', async () => {
  const controller = new AbortController();
  const stream = delayedStream(['first', 'second', 'third'], 20);

  setTimeout(() => controller.abort(), 25);

  const text = await collectUntilAbort(stream, controller.signal);

  expect(text).toContain('first');
  expect(text).not.toContain('third');
});
\`\`\`

Backpressure is harder to test at the product level, but you can still protect against the worst mistake: accumulating unbounded text. Add a maximum byte or character budget for structured responses. If the model streams beyond the budget without producing a valid object, abort and report a structured error.

## Put streaming JSON checks into the release pipeline

Split the pipeline into fast deterministic tests and slower live smoke tests. Parser, framer, schema, cancellation, and UI fake-stream tests should run on every pull request. Live model tests should run on a schedule, behind a cost budget, or for release candidates. The live tests should not be the only place where malformed chunks are covered.

| Test type | Runs on pull request? | Uses live model? | Primary signal |
|---|---|---|---|
| Byte decoding unit tests | Yes | No | No text corruption |
| Framing and assembly corpus | Yes | No | Partial JSON handled deterministically |
| Schema normalization tests | Yes | No | Unsafe fields rejected or stripped |
| UI fake-stream tests | Yes | No | No action before complete validation |
| Live provider smoke tests | Maybe | Yes | Prompt and provider still produce expected shape |

A minimal command can run the deterministic layer:

\`\`\`bash
npm test -- tests/streaming-json tests/agent-command
\`\`\`

Keep the fixture corpus near the parser code and review it whenever a production stream incident occurs. The best new test after an incident is not a broad “model should behave better” prompt assertion. It is a replayable stream that reproduces the exact parser or product behavior that failed.

## Frequently Asked Questions

### Should I parse partial JSON after every streamed chunk?

You can attempt parsing after each append, but treat parse failures during the stream as “not complete yet” only until the stream ends. At stream end, invalid JSON must fail clearly. Never execute business behavior just because an early fragment contains a convincing field. The safer design is to separate assembly from validation, then allow product actions only after a complete parsed value has passed schema checks.

### How do I test streaming without paying for live LLM calls?

Use replayable stream fixtures. Capture or write chunk arrays that represent valid output, malformed endings, delayed required fields, extra fields, cancellation, and trailing prose. Feed those chunks into the same reader and parser used in production. Live LLM calls are still useful as smoke tests and for discovering new cases, but they should not be the main parser test because they are slower, cost money, and are nondeterministic.

### Is it safe to repair malformed JSON from an LLM?

Only if repair is an explicit product decision with tests and observability. Silent repair can hide prompt drift, convert unsafe output into apparently valid commands, and make audit trails misleading. If you support repair, constrain it tightly, record when it happens, and validate the repaired object before action. For high-risk agent tools, failing closed on malformed final JSON is usually easier to defend than guessing what the model meant.

### What should the UI show while structured output is incomplete?

The UI can show progress text, a spinner, token count, or a preview marked as incomplete. It should not enable irreversible actions, submit tool calls, or save settings until the JSON is fully assembled and schema-valid. Test this with a fake stream that emits a plausible action first and required arguments later. The button or agent action should stay disabled during the partial state and become available only after validation succeeds.
`,
};
