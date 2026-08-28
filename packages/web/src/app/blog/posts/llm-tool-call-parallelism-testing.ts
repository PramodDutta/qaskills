import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Parallel Tool Calls in LLM Agents: Ordering and Partial Failures',
  description:
    'llm parallel tool calls testing verifies concurrent tool execution, tool_call_id correlation, response ordering, and partial failures in one model turn.',
  date: '2026-08-28',
  category: 'AI Testing',
  content: `
# Testing Parallel Tool Calls in LLM Agents: Ordering and Partial Failures

llm parallel tool calls testing means verifying that an agent or runtime which emits multiple tool or function calls in one model turn handles concurrent execution, response ordering and correlation, and partial failures correctly. You are not only checking that each tool can run alone. You are proving that N calls from a single assistant message keep stable \`tool_call_id\` binding when results return out of order, that a timeout or invalid payload on one sibling does not erase the others, and that "parallel" is real concurrency rather than a sequential loop that only looks concurrent in logs.

For QA and AI agent test engineers, this is a runtime contract test. The model may decide to call \`get_user\`, \`list_orders\`, and \`fetch_inventory\` together. Your harness must execute those requests under controllable latency and failure injection, then assert what the agent loop feeds back to the model on the next turn. Official conceptual models for multi-tool turns appear in the OpenAI function calling docs at https://platform.openai.com/docs/guides/function-calling and Anthropic tool use docs at https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview. The exact field names differ by provider, but the ideas stay the same: a \`tool_calls\` array (or parallel tool use block), a call id for correlation, and tool results returned as messages the model can read.

If you already test single-tool schema validity, treat this article as the concurrency layer on top of that work. Schema drift still matters; see [/blog/llm-testing-function-calling-schema-drift](/blog/llm-testing-function-calling-schema-drift) when argument shapes change under you. Parallelism is a different failure mode: correct schemas can still break when timing, ordering, and partial errors interact.

## What Parallel Tool Calls Mean Inside An Agent Loop

A parallel tool turn is one assistant message that contains N tool requests, not N separate assistant messages. In an agent loop the sequence looks like this:

1. User message arrives.
2. Model returns one assistant message with several tool requests.
3. Runtime starts those tools (often via \`Promise.all\` / \`Promise.allSettled\` or an equivalent job pool).
4. Runtime gathers tool results, each tagged with the matching call id.
5. Runtime sends tool-result messages back to the model.
6. Model continues with a final answer or another tool turn.

The critical unit under test is steps 3-5. Step 2 is usually stubbed in unit and contract tests so you do not burn tokens or depend on non-deterministic model output. You inject a fixed assistant payload with known call ids and arguments, then run your executor and message assembler.

Conceptually, a single parallel turn looks like:

\`\`\`ts
type ToolRequest = {
  id: string;
  name: string;
  arguments: unknown;
};

type AssistantToolTurn = {
  role: 'assistant';
  content: string | null;
  tool_calls: ToolRequest[];
};

const turn: AssistantToolTurn = {
  role: 'assistant',
  content: null,
  tool_calls: [
    { id: 'call_a', name: 'get_user', arguments: { userId: 'u1' } },
    { id: 'call_b', name: 'list_orders', arguments: { userId: 'u1' } },
    { id: 'call_c', name: 'fetch_inventory', arguments: { sku: 'sku-9' } },
  ],
};
\`\`\`

Your product may use slightly different property names. Do not hardcode provider-specific method names in assertions unless your SDK wrappers expose them. Assert on your internal normalized type, then map to provider wire formats at the edge.

| Loop stage | What to stub | What to execute for real |
|---|---|---|
| Model decision | Fixed \`tool_calls\` payload with known ids | Nothing; avoid live model flakiness |
| Tool dispatch | Optional fake registry | Real concurrency policy, timeouts, cancellation |
| Result assembly | Nothing | Correlation by id, error envelopes, message order policy |
| Next model call | Capture outbound messages | Assert schema of tool results, not the model's prose |

The failure modes that only appear here are easy to miss in single-tool tests: out-of-order completion, one sibling aborting a shared \`AbortController\`, a shared mutex serializing work so "parallel" never overlaps, and a message builder that drops failed siblings instead of returning structured errors.

## Correlation By tool_call_id When Results Arrive Out Of Order

Correlation is the first invariant. Every tool result that goes back to the model must carry the same call id the assistant used in the request. If tool B finishes before tool A, the result for B still must reference \`call_b\`, not the index \`1\` from the original array and not "the second result that came back."

Index-based correlation fails under concurrency. Completion order is not request order. Network jitter, DB load, and intentional sleep in fakes will shuffle finishes. The only stable join key is the call id.

\`\`\`ts
type ToolResultMessage = {
  role: 'tool';
  tool_call_id: string;
  name: string;
  content: string; // usually JSON text
};

async function runParallelTurn(
  turn: AssistantToolTurn,
  execute: (req: ToolRequest) => Promise<unknown>,
): Promise<ToolResultMessage[]> {
  const settled = await Promise.allSettled(
    turn.tool_calls.map(async (req) => {
      const value = await execute(req);
      return {
        role: 'tool' as const,
        tool_call_id: req.id,
        name: req.name,
        // String returns pass through verbatim, mirroring adapters that
        // forward tool strings unmodified. This is exactly how invalid
        // JSON reaches the model, and it is the path the
        // invalid-json-result injection exercises.
        content: typeof value === 'string' ? value : JSON.stringify({ ok: true, value }),
      };
    }),
  );

  return settled.map((item, index) => {
    const req = turn.tool_calls[index];
    if (item.status === 'fulfilled') return item.value;
    return {
      role: 'tool' as const,
      tool_call_id: req.id,
      name: req.name,
      content: JSON.stringify({
        ok: false,
        error: String(item.reason?.message ?? item.reason),
      }),
    };
  });
}
\`\`\`

Notice the map uses the original request index only to recover the request metadata after \`allSettled\`. The id written into the result still comes from \`req.id\`. A common bug is sorting results by finish time and then reassigning ids by position. That produces silent cross-wiring: the model thinks \`get_user\` returned order data.

Assert correlation explicitly:

\`\`\`ts
import assert from 'node:assert/strict';

function assertCorrelated(
  requests: ToolRequest[],
  results: ToolResultMessage[],
) {
  assert.equal(results.length, requests.length);
  const byId = new Map(results.map((r) => [r.tool_call_id, r]));
  for (const req of requests) {
    const result = byId.get(req.id);
    assert.ok(result, \`missing result for \${req.id}\`);
    assert.equal(result.name, req.name);
  }
}
\`\`\`

When you also test provider adapters, keep a golden fixture of outbound messages and verify each \`tool_call_id\` survives serialization. Correlation bugs often hide in "helpful" normalizers that rebuild messages from arrays without copying ids.

## A Deterministic Harness With Controllable Latency And Failures

Live tools make parallel tests flaky. Build a fake tool registry where each tool has configurable delay, failure mode, and optional shared state. The model turn is fixed. Only the executor and assembler are real.

\`\`\`ts
type FailureMode =
  | { type: 'none' }
  | { type: 'throw'; message: string; afterMs?: number }
  | { type: 'timeout'; afterMs: number }
  | { type: 'invalid-json-result' };

type FakeToolSpec = {
  name: string;
  delayMs: number;
  failure: FailureMode;
  handler: (args: unknown, ctx: FakeCtx) => Promise<unknown> | unknown;
};

type FakeCtx = {
  store: Map<string, number>;
  now: () => number;
};

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => resolve(), ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    });
  });
}

function createFakeExecutor(specs: FakeToolSpec[], ctx: FakeCtx) {
  const byName = new Map(specs.map((s) => [s.name, s]));
  return async (req: ToolRequest, signal?: AbortSignal) => {
    const spec = byName.get(req.name);
    if (!spec) throw new Error(\`unknown tool \${req.name}\`);
    const started = ctx.now();
    if (spec.failure.type === 'timeout') {
      await sleep(spec.failure.afterMs, signal);
      throw new Error(\`timeout:\${req.name}\`);
    }
    if (spec.failure.type === 'throw') {
      await sleep(spec.failure.afterMs ?? spec.delayMs, signal);
      throw new Error(spec.failure.message);
    }
    await sleep(spec.delayMs, signal);
    if (spec.failure.type === 'invalid-json-result') {
      // Executor returns a string the assembler must not JSON.parse blindly
      return '__not_json__';
    }
    const value = await spec.handler(req.arguments, ctx);
    (req as any).__timing = { started, ended: ctx.now() };
    return value;
  };
}
\`\`\`

Drive the clock with a monotonic fake or record \`Date.now()\` around each call. For overlap proofs you need timestamps more than pretty logs. Keep failure injection in the tool layer, not in the model stub, so you exercise the same path production uses when a downstream API fails.

A minimal Vitest case wires three tools with staggered delays:

\`\`\`ts
import { describe, it, expect } from 'vitest';

describe('parallel tool executor', () => {
  it('returns one result per call id under shuffled completion', async () => {
    const store = new Map<string, number>();
    const execute = createFakeExecutor(
      [
        {
          name: 'slow',
          delayMs: 80,
          failure: { type: 'none' },
          handler: () => ({ v: 'slow' }),
        },
        {
          name: 'fast',
          delayMs: 5,
          failure: { type: 'none' },
          handler: () => ({ v: 'fast' }),
        },
        {
          name: 'mid',
          delayMs: 40,
          failure: { type: 'none' },
          handler: () => ({ v: 'mid' }),
        },
      ],
      { store, now: () => Date.now() },
    );

    const turn = {
      role: 'assistant' as const,
      content: null,
      tool_calls: [
        { id: 'c1', name: 'slow', arguments: {} },
        { id: 'c2', name: 'fast', arguments: {} },
        { id: 'c3', name: 'mid', arguments: {} },
      ],
    };

    const results = await runParallelTurn(turn, execute);
    assertCorrelated(turn.tool_calls, results);
    const payload = Object.fromEntries(
      results.map((r) => [r.tool_call_id, JSON.parse(r.content)]),
    );
    expect(payload.c1.value.v).toBe('slow');
    expect(payload.c2.value.v).toBe('fast');
    expect(payload.c3.value.v).toBe('mid');
  });
});
\`\`\`

Optional tooling note: if your team keeps scenario packs outside the repo, \`qaskills.sh\` / the qaskills CLI can generate checklist stubs for parallel-tool suites, but the assertions above still belong in code you own.

## Ordering Policies: Preserve Order Or Accept Any Order

Products disagree on whether tool-result messages must follow the original \`tool_calls\` order. Some runtimes preserve request order after \`allSettled\`. Others append results as they complete. Both can be correct if the model correlates by id. Problems start when the product claims one policy and implements the other, or when a UI timeline assumes request order while the wire format uses completion order.

Write the policy down as a test fixture, not a comment.

| Policy name | Expected result order | Typical implementation | Test focus |
|---|---|---|---|
| preserve-request-order | Same sequence as \`tool_calls\` | \`allSettled\` then map by index | Stable order under extreme latency skew |
| completion-order | Finish-time order | push into array on resolve | Ids still match; never reorder by name |
| deterministic-sort-by-id | Sorted by call id string | sort after gather | Useful for snapshot tests only |

\`\`\`ts
type OrderPolicy = 'preserve-request-order' | 'completion-order';

async function runWithPolicy(
  turn: AssistantToolTurn,
  execute: (req: ToolRequest) => Promise<unknown>,
  policy: OrderPolicy,
): Promise<ToolResultMessage[]> {
  if (policy === 'preserve-request-order') {
    return runParallelTurn(turn, execute);
  }

  const bag: ToolResultMessage[] = [];
  await Promise.all(
    turn.tool_calls.map(async (req) => {
      try {
        const value = await execute(req);
        bag.push({
          role: 'tool',
          tool_call_id: req.id,
          name: req.name,
          content: JSON.stringify({ ok: true, value }),
        });
      } catch (err) {
        bag.push({
          role: 'tool',
          tool_call_id: req.id,
          name: req.name,
          content: JSON.stringify({
            ok: false,
            error: String((err as Error).message ?? err),
          }),
        });
      }
    }),
  );
  return bag;
}

function assertOrderPolicy(
  turn: AssistantToolTurn,
  results: ToolResultMessage[],
  policy: OrderPolicy,
) {
  if (policy === 'preserve-request-order') {
    expect(results.map((r) => r.tool_call_id)).toEqual(
      turn.tool_calls.map((c) => c.id),
    );
  } else {
    // completion-order: only require set equality + correlation
    assertCorrelated(turn.tool_calls, results);
  }
}
\`\`\`

Test both policies if your codebase supports a flag. If the product documents preserve-request-order, fail CI when completion order leaks through after a refactor to streaming executors. Snapshot tests should pin the chosen policy so a silent switch becomes a red build, not a production mystery.

## Partial Failure Across Sibling Tool Calls

Partial failure is the heart of llm parallel tool calls testing. One of N tools throws, times out, or returns a payload that cannot be serialized. Sibling results must still reach the model. The agent must not treat the whole turn as a single failed RPC.

Failure modes to inject per sibling:

| Injected fault | Symptom if runtime is wrong | Correct observable |
|---|---|---|
| throw after delay | Other tools cancelled or missing | Other tools present with \`ok: true\` |
| timeout | Entire turn hangs past SLA | Timed-out id has error envelope; siblings complete |
| invalid JSON / non-serializable value | Assembler throws and drops all results | Failed id gets structured error; others intact |
| abort signal shared incorrectly | First failure aborts healthy work | Per-call signals or careful shared-cancel policy |

Use \`Promise.allSettled\` (or an equivalent that never short-circuits) for the default gather. \`Promise.all\` is the wrong default for tool turns that must report partial success: the first rejection rejects the whole array and loses sibling values unless you wrap each promise yourself.

\`\`\`ts
it('keeps sibling results when one tool throws', async () => {
  const execute = createFakeExecutor(
    [
      {
        name: 'ok_tool',
        delayMs: 20,
        failure: { type: 'none' },
        handler: () => ({ n: 1 }),
      },
      {
        name: 'bad_tool',
        delayMs: 10,
        failure: { type: 'throw', message: 'upstream 503' },
        handler: () => ({ n: 2 }),
      },
      {
        name: 'slow_ok',
        delayMs: 50,
        failure: { type: 'none' },
        handler: () => ({ n: 3 }),
      },
    ],
    { store: new Map(), now: () => Date.now() },
  );

  const turn = {
    role: 'assistant' as const,
    content: null,
    tool_calls: [
      { id: 'a', name: 'ok_tool', arguments: {} },
      { id: 'b', name: 'bad_tool', arguments: {} },
      { id: 'c', name: 'slow_ok', arguments: {} },
    ],
  };

  const results = await runParallelTurn(turn, execute);
  const byId = Object.fromEntries(
    results.map((r) => [r.tool_call_id, JSON.parse(r.content)]),
  );

  expect(byId.a.ok).toBe(true);
  expect(byId.b.ok).toBe(false);
  expect(String(byId.b.error)).toMatch(/503/);
  expect(byId.c.ok).toBe(true);
  expect(results).toHaveLength(3);
});
\`\`\`

Timeouts deserve their own case with \`AbortController\` and \`Promise.race\`. Bound each tool, not only the whole turn, so a hung sibling cannot stall forever while others already finished.

\`\`\`ts
async function executeWithTimeout(
  req: ToolRequest,
  execute: (req: ToolRequest, signal?: AbortSignal) => Promise<unknown>,
  ms: number,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await Promise.race([
      execute(req, controller.signal),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new Error(\`timeout:\${req.id}\`)),
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
\`\`\`

After partial failure, also assert the next outbound model request includes all three tool messages. Dropping the error sibling is as bad as dropping a success sibling: the model then invents a fill-in or retries the wrong call.

## Shared-State Races When Tools Mutate The Same Store

Parallel tools that only read are the easy case. Real agents often expose \`increment_counter\`, \`append_note\`, or \`reserve_stock\` style tools that mutate shared memory, a DB row, or a cache key. Concurrent mutation without isolation produces lost updates that look like "the model forgot a tool result."

Reproduce with a shared \`Map\` and two increments that should both apply:

\`\`\`ts
it('reproduces the lost update with unserialized mutate tools', async () => {
  const store = new Map<string, number>([['n', 0]]);

  const execute = createFakeExecutor(
    [
      {
        name: 'inc',
        delayMs: 15,
        failure: { type: 'none' },
        handler: async (_args, ctx) => {
          const cur = ctx.store.get('n') ?? 0;
          await sleep(10); // widen the race window
          ctx.store.set('n', cur + 1);
          return { n: cur + 1 };
        },
      },
    ],
    { store, now: () => Date.now() },
  );

  const turn = {
    role: 'assistant' as const,
    content: null,
    tool_calls: [
      { id: 'i1', name: 'inc', arguments: {} },
      { id: 'i2', name: 'inc', arguments: {} },
    ],
  };

  await runParallelTurn(turn, execute);
  // Both handlers read 0 before either writes, so one increment is lost.
  expect(store.get('n')).toBe(1);
});

it('passes only when mutate tools are serialized', async () => {
  const store = new Map<string, number>([['n', 0]]);

  let chain: Promise<unknown> = Promise.resolve();
  const serialize = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const execute = createFakeExecutor(
    [
      {
        name: 'inc',
        delayMs: 15,
        failure: { type: 'none' },
        handler: (_args, ctx) =>
          serialize(async () => {
            const cur = ctx.store.get('n') ?? 0;
            await sleep(10);
            ctx.store.set('n', cur + 1);
            return { n: cur + 1 };
          }),
      },
    ],
    { store, now: () => Date.now() },
  );

  const turn = {
    role: 'assistant' as const,
    content: null,
    tool_calls: [
      { id: 'i1', name: 'inc', arguments: {} },
      { id: 'i2', name: 'inc', arguments: {} },
    ],
  };

  await runParallelTurn(turn, execute);
  expect(store.get('n')).toBe(2);
});
\`\`\`

The first test pins the failure mode so it cannot regress silently; the second is the contract test for a runtime that promises serialized mutation. If the product documents best-effort concurrency, flip the expectation: assert that either the runtime serializes mutate tools, or the tool API rejects conflicting parallel writes with a structured error. The wrong outcome is silent loss.

Patterns that make the race test honest:

1. Insert an await between read and write in the fake to widen the race.
2. Run the case many times in a tight loop (property-style) to catch intermittent passes.
3. Compare against a serial baseline: run the same two calls with an explicit queue.

For MCP-like tool servers that expose resources and tools together, race bugs often sit between a tool write and a resource read subscription. Pair this section with [/blog/mcp-testing-resource-subscription-updates](/blog/mcp-testing-resource-subscription-updates) when your stack pushes resource update notifications while parallel tools still run.

## The Shape Of Tool Results Fed Back To The Model

The model does not see your TypeScript objects. It sees tool-result messages, usually with string \`content\` that embeds JSON. Parallel turns multiply the chance that one bad serializer breaks the whole feedback batch.

Contract checks that belong in every parallel suite:

1. Every request id has exactly one result message.
2. Success content parses as JSON when your product promises JSON tools.
3. Error content is also structured JSON (or a documented plain-string policy), never an empty body.
4. No result reuses another call's id.
5. Byte size stays under your provider limit for the batch, not only per message.

\`\`\`ts
function assertToolFeedbackBatch(
  requests: ToolRequest[],
  results: ToolResultMessage[],
) {
  assertCorrelated(requests, results);
  const seen = new Set<string>();
  for (const r of results) {
    assert.equal(seen.has(r.tool_call_id), false);
    seen.add(r.tool_call_id);
    const parsed = JSON.parse(r.content);
    assert.equal(typeof parsed.ok, 'boolean');
    if (parsed.ok) assert.ok('value' in parsed);
    else assert.ok('error' in parsed);
  }
}
\`\`\`

When one tool returns a circular structure or a \`bigint\`, \`JSON.stringify\` throws. Catch that at the tool boundary and convert it into \`{ ok: false, error: 'serialization_failed' }\` for that id only. A test that injects \`invalid-json-result\` or a circular object proves the assembler does not abort the batch.

Provider docs describe the wire concepts; keep your assertions on the normalized batch your agent loop owns. That keeps tests stable if you swap SDKs while preserving the same id and envelope rules.

## Proving Real Concurrency With Overlapping Timestamps

Many executors claim parallelism but await tools in a \`for\` loop. Functional tests still pass because results look fine. Add an overlap assertion so sequential fake-parallel cannot hide.

Record \`startedAt\` / \`endedAt\` per call. Two calls with delays of 50ms each should overlap if truly concurrent: \`start2 < end1\` and \`start1 < end2\`. If wall time is roughly the sum of delays, you are serial.

\`\`\`ts
type Timing = { id: string; started: number; ended: number };

function assertOverlapping(a: Timing, b: Timing) {
  const overlap = a.started < b.ended && b.started < a.ended;
  assert.equal(
    overlap,
    true,
    \`expected overlap between \${a.id} and \${b.id}, got \${JSON.stringify({ a, b })}\`,
  );
}

it('runs independent tools concurrently, not serially', async () => {
  const timings: Timing[] = [];
  const execute = async (req: ToolRequest) => {
    const started = Date.now();
    await sleep(60);
    const ended = Date.now();
    timings.push({ id: req.id, started, ended });
    return { ok: true };
  };

  const turn = {
    role: 'assistant' as const,
    content: null,
    tool_calls: [
      { id: 't1', name: 'x', arguments: {} },
      { id: 't2', name: 'y', arguments: {} },
    ],
  };

  const t0 = Date.now();
  await runParallelTurn(turn, execute);
  const wall = Date.now() - t0;

  assertOverlapping(timings[0], timings[1]);
  // Serial would be ~120ms+; concurrent should be near 60-90ms on a healthy CI runner
  expect(wall).toBeLessThan(110);
});
\`\`\`

Be careful on overloaded CI hosts. Prefer relative checks (overlap boolean + wall time less than 1.7x single delay) over absolute millisecond budgets. If you must run under heavy load, increase delays to 200ms so scheduling noise is a smaller fraction of the window.

| Observation | Likely cause | Fix direction |
|---|---|---|
| No timestamp overlap, wall ~ sum of delays | \`await\` inside a sequential loop | Switch gather to concurrent promises |
| Overlap exists, wall still huge | Global mutex or shared connection pool of size 1 | Raise pool size or scope locks finer |
| Overlap flaky | Delay too small vs scheduler noise | Increase fake delays |
| Overlap always true but wrong results | Correlation bug, not concurrency bug | Fix id binding first |

## Property Tests And Table-Driven Interleavings

You cannot hand-write every interleaving of success and failure. Use table-driven cases for fault patterns, and a small property loop that randomizes delays while keeping call ids fixed.

\`\`\`ts
type Case = {
  name: string;
  tools: Array<{ id: string; delayMs: number; fail?: boolean }>;
  expectOk: string[];
  expectErr: string[];
};

const cases: Case[] = [
  {
    name: 'all success shuffled',
    tools: [
      { id: 'a', delayMs: 5 },
      { id: 'b', delayMs: 40 },
      { id: 'c', delayMs: 15 },
    ],
    expectOk: ['a', 'b', 'c'],
    expectErr: [],
  },
  {
    name: 'first fails others ok',
    tools: [
      { id: 'a', delayMs: 10, fail: true },
      { id: 'b', delayMs: 5 },
      { id: 'c', delayMs: 25 },
    ],
    expectOk: ['b', 'c'],
    expectErr: ['a'],
  },
  {
    name: 'last fails',
    tools: [
      { id: 'a', delayMs: 5 },
      { id: 'b', delayMs: 5 },
      { id: 'c', delayMs: 5, fail: true },
    ],
    expectOk: ['a', 'b'],
    expectErr: ['c'],
  },
  {
    name: 'all fail',
    tools: [
      { id: 'a', delayMs: 5, fail: true },
      { id: 'b', delayMs: 15, fail: true },
    ],
    expectOk: [],
    expectErr: ['a', 'b'],
  },
];

describe.each(cases)('interleaving: \$name', (tc) => {
  it('preserves per-id outcomes', async () => {
    const specs: FakeToolSpec[] = tc.tools.map((t) => ({
      name: t.id,
      delayMs: t.delayMs,
      failure: t.fail
        ? { type: 'throw', message: \`fail-\${t.id}\` }
        : { type: 'none' },
      handler: () => ({ id: t.id }),
    }));
    const execute = createFakeExecutor(specs, {
      store: new Map(),
      now: () => Date.now(),
    });
    const turn = {
      role: 'assistant' as const,
      content: null,
      tool_calls: tc.tools.map((t) => ({
        id: t.id,
        name: t.id,
        arguments: {},
      })),
    };
    const results = await runParallelTurn(turn, execute);
    const parsed = results.map((r) => ({
      id: r.tool_call_id,
      ...JSON.parse(r.content),
    }));
    expect(parsed.filter((p) => p.ok).map((p) => p.id).sort()).toEqual(
      [...tc.expectOk].sort(),
    );
    expect(parsed.filter((p) => !p.ok).map((p) => p.id).sort()).toEqual(
      [...tc.expectErr].sort(),
    );
  });
});
\`\`\`

For a light property check, randomize \`delayMs\` between 0 and 100 for a fixed fault mask and run 50 iterations. Assert set equality of ok/error ids every time. You are hunting for order-dependent drops, not for cryptographic randomness quality.

Python is fine for the same idea if your agent runtime is Python-first. The structure is identical: fixed call ids, \`asyncio.gather(..., return_exceptions=True)\`, then assert envelopes.

\`\`\`python
import asyncio
import json

async def run_one(call_id: str, delay: float, fail: bool):
    await asyncio.sleep(delay)
    if fail:
        raise RuntimeError(f"fail-{call_id}")
    return {"ok": True, "value": {"id": call_id}}

async def parallel_turn(calls):
    tasks = [run_one(c["id"], c["delay"], c.get("fail", False)) for c in calls]
    settled = await asyncio.gather(*tasks, return_exceptions=True)
    out = []
    for call, item in zip(calls, settled):
        if isinstance(item, Exception):
            content = {"ok": False, "error": str(item)}
        else:
            content = item
        out.append({
            "tool_call_id": call["id"],
            "content": json.dumps(content),
        })
    return out
\`\`\`

## Filtering Parallel-Tool Suites In CI With Vitest

Parallel-tool tests are slower than pure unit tests because they intentionally sleep. Keep them in dedicated files such as \`parallel-tools.spec.ts\` and filter in CI when you only need that slice.

Vitest supports \`--testNamePattern\` / \`-t\` to run matching test titles:

\`\`\`bash
npx vitest run -t "parallel tool"
npx vitest run src/agent/parallel-tools.spec.ts
npx vitest run -t "interleaving:"
\`\`\`

Practical CI tips:

1. Tag describe blocks with a stable prefix like \`parallel tool\` so \`-t\` stays precise.
2. Put overlap and race tests behind a project name or separate job so a contended runner does not flake PR checks; still run them on main.
3. Fail the job if wall-time overlap assertions are skipped via an env flag left on by mistake.
4. Keep model-live evaluations out of this job; stub the assistant \`tool_calls\` array.
5. Upload the gathered tool-result JSON as a CI artifact on failure so you can see which id went missing.

When debugging a single interleaving locally, prefer \`-t\` with the case name over commenting out siblings. That habit keeps the table intact and avoids committing a narrowed file.

## Contract Checks For MCP-Style Tool Servers

If tools run behind an MCP-style server, parallel calls from the agent become concurrent requests into that server. Your agent-side suite still needs the correlation and partial-failure tests above. Add a thin contract suite against the server:

1. Fire N tool requests without waiting between sends.
2. Assert each response can be joined to its request id or protocol correlation token.
3. Inject one server-side error and confirm other requests still complete.
4. If the server exposes resources, confirm a tool mutation emits the subscription update you expect without dropping parallel tool responses.

You do not need the full MCP SDK surface for this harness. Treat the server as an HTTP or stdio peer that returns envelopes. The agent loop remains the system under test for message assembly; the server contract test proves the peer can survive concurrent load without resetting state mid-batch.

## Incident Story: The Dashboard Agent That Lost Half Its Context

Symptom: In staging, a support dashboard agent sometimes answered with user profile data but claimed orders were unavailable, even though the orders API was healthy. Failure rate was about 1 in 12 parallel turns that called \`get_user\` and \`list_orders\` together.

Wrong theory: The team blamed the model for ignoring the orders tool result. They added stronger system-prompt language ("always wait for both tools") and lengthened the temperature debug matrix. Nothing changed. A secondary theory blamed the orders API for intermittent 500s, but API metrics were clean.

Cause: The executor used \`Promise.all\`. When \`get_user\` hit a 30ms path and \`list_orders\` hit a code path that threw on an unexpected null field, \`Promise.all\` rejected before the assembler ran. A top-level catch converted the rejection into a single synthetic tool error message reused for both call ids (actually, it reused the first id and dropped the second message entirely). On retries, timing changed and both tools succeeded, which is why the bug looked non-deterministic.

Fix: Switch gather to \`Promise.allSettled\`, emit per-id error envelopes, and add the partial-failure Vitest case with one throwing sibling. Also add correlation assertions so a future "helpful" catch cannot collapse two ids again. After the fix, the agent received profile success plus a structured orders error, and the model asked for a single orders retry instead of inventing empty orders.

The lasting lesson for llm parallel tool calls testing: prompt edits cannot repair a runtime that never ships sibling results to the model.

## What People Get Wrong About Parallel Tool Call Tests

People treat "the model returned two tool calls" as proof that the product handles parallelism. That only proves the router can parse a \`tool_calls\` array. It says nothing about concurrent execution, id correlation, partial failure, or overlap. Another frequent miss is asserting message count without asserting ids: you can have two messages and still cross-wire content. Teams also overfit to preserve-request-order snapshots, then break completion-order adapters used by streaming UIs. Finally, many suites never widen race windows, so shared-state bugs pass in CI and fail under production load.

Correct the mindset: stub the model, control the tools, assert envelopes by id, prove overlap, and inject one sibling fault every time you claim parallel support.

## Frequently Asked Questions

### Do I need a live LLM to test parallel tool calls?

No for the executor and assembler. Stub a fixed assistant message that already contains multiple tool requests with known ids, then run your real dispatch and result-batching code. Live models are useful later for evaluation of whether the model chooses parallel calls appropriately, but they add cost and nondeterminism that hide runtime bugs. Keep provider wire compatibility tests as fixture-driven adapter tests. Use live calls in a separate eval job, not in the partial-failure regression suite that should catch \`Promise.all\` mistakes on every PR.

### How should timeouts interact with sibling tools?

Bound each tool call with its own timeout budget and prefer per-call abort signals unless your product documents a shared cancel-on-first-failure policy. When one sibling times out, the result batch should still include success envelopes for tools that finished, plus a structured timeout error for the timed-out id. A single turn-level timeout can exist as a backstop, but it should not be your only control or you will keep canceling healthy work. Assert both the error text or code and the presence of sibling successes.

### What is the minimum assertion set for a parallel-tool PR gate?

Require four checks: one result per \`tool_call_id\`, correct name binding, at least one partial-failure case where a throwing sibling leaves others intact, and one overlap or wall-time check that rejects sequential fake-parallel. Add order-policy assertions if you document a specific order. Schema validation of arguments remains necessary, but it does not replace concurrency checks. If you expose mutate tools, add one lost-update race case as well.

### Can completion-order results confuse the model compared with request order?

Models that honor call ids should tolerate either order, because each tool result message carries its correlation id. Confusion appears when the application layer displays results without ids, when snapshots assume request order, or when a bug writes the wrong id onto a completion-ordered message. If your product UI shows a timeline, test the UI order separately from the model feedback batch. Document the policy, pin it in tests, and never rely on array position as the join key between requests and results.
`,
};
