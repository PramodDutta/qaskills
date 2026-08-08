import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent Testing Parallel Tool Call Safety: A Race-Proof Playbook',
  description: 'Apply agent testing parallel tool call safety with deterministic schedulers, resource locks, idempotency, trace assertions, and runnable race-condition tests.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# Agent Testing Parallel Tool Call Safety: A Race-Proof Playbook

Agent testing for parallel tool call safety must prove more than “the model can request two tools.” The orchestrator must preserve each call's identity, run only independent operations concurrently, serialize conflicting mutations, return every result to the correct call, and remain safe under duplicates, partial failures, timeouts, and retries. The strongest tests bypass model variability and feed recorded tool-call batches directly into a deterministic scheduler.

The basic workflow is: classify every tool by side effect, derive a resource key from validated arguments, build a dependency plan, execute independent groups concurrently, and assert on a trace rather than only the final answer. Then run the same logical batch under delayed and reordered completions. If outcomes change when two independent calls finish in the opposite order, the orchestrator probably has hidden shared state or incorrect result correlation.

This article provides a runnable TypeScript harness for those checks. For the wider lifecycle of model, memory, planning, and autonomy tests, use the [agentic AI testing guide for 2026](/blog/agentic-ai-testing-guide-2026). When the tool boundary is exposed through Model Context Protocol, add the transport and server checks in [MCP servers for test automation](/blog/mcp-servers-test-automation-2026).

Official OpenAI function-calling guidance describes responses that can contain multiple function calls, each with a \`call_id\`, and notes that parallel calls can be disabled with \`parallel_tool_calls: false\`: https://developers.openai.com/api/docs/guides/function-calling. Provider payloads differ, so keep the scheduler's internal contract provider-neutral and adapt at the edge.

## Model a batch as a set of effects, not an array to Promise.all

\`Promise.all\` is an execution primitive, not a safety policy. Before starting work, the harness needs to know what each operation reads or writes. A useful minimal classification separates pure computation, read-only access, resource mutation, and external irreversible effects.

| Effect class | Example | Parallel with same class? | Main test oracle |
|---|---|---:|---|
| Pure | Calculate checksum | Yes | Deterministic output |
| Read | Fetch two independent tickets | Usually | Correct call correlation |
| Write | Update one test case | Only for different resource keys | No lost update |
| Irreversible external | Send email, issue refund | Only with explicit idempotency policy | At-most-once effect |
| Read after write | Update then fetch same ticket | No, dependency required | Read observes new state |

“Read-only” must describe the implementation, not the tool name. A \`get_report\` tool that refreshes a cache, rotates a session, or records billing may mutate shared state. Likewise, two writes to different rows can still conflict through a shared quota or unique index. Build classifications from real effects and revisit them when adapters change.

Define a provider-neutral request and result type:

\`\`\`ts
export type ToolCall = {
  callId: string;
  name: string;
  arguments: unknown;
};

export type ToolResult = {
  callId: string;
  name: string;
  ok: boolean;
  output?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

export type Effect = 'pure' | 'read' | 'write' | 'external';

export type ToolDefinition<TArgs = unknown> = {
  effect: Effect;
  resourceKey: (args: TArgs) => string;
  execute: (args: TArgs, context: { callId: string }) => Promise<unknown>;
};
\`\`\`

The \`callId\` is mandatory. Array position is not identity because completion order can differ from request order, and providers may include non-tool items around calls. Names are not identity either because one turn can request the same tool more than once.

## Build a deterministic keyed scheduler

The scheduler below allows pure and read operations to run freely, while write and external effects acquire a lock derived from the tool name and resource key. Different resources can still progress concurrently. It returns results in input order, but correlates them by \`callId\` internally.

Create \`safe-runner.ts\`:

\`\`\`ts
import type { ToolCall, ToolDefinition, ToolResult } from './types.js';

class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(key, previous.then(() => current));

    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }
}

export class SafeToolRunner {
  private readonly mutex = new KeyedMutex();

  constructor(
    private readonly tools: Record<string, ToolDefinition<any>>,
  ) {}

  async executeBatch(calls: ToolCall[]): Promise<ToolResult[]> {
    const ids = new Set<string>();
    for (const call of calls) {
      if (ids.has(call.callId)) {
        throw new Error(\`duplicate callId: \${call.callId}\`);
      }
      ids.add(call.callId);
    }

    const pending = calls.map((call) => this.executeOne(call));
    return Promise.all(pending);
  }

  private async executeOne(call: ToolCall): Promise<ToolResult> {
    const tool = this.tools[call.name];
    if (!tool) {
      return {
        callId: call.callId,
        name: call.name,
        ok: false,
        error: { code: 'UNKNOWN_TOOL', message: 'Tool is not registered' },
      };
    }

    const perform = () => tool.execute(call.arguments, { callId: call.callId });

    try {
      const output = tool.effect === 'pure' || tool.effect === 'read'
        ? await perform()
        : await this.mutex.run(
            \`\${call.name}:\${tool.resourceKey(call.arguments)}\`,
            perform,
          );
      return { callId: call.callId, name: call.name, ok: true, output };
    } catch (error) {
      return {
        callId: call.callId,
        name: call.name,
        ok: false,
        error: {
          code: 'TOOL_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
\`\`\`

This is deliberately a bounded in-memory example. A production scheduler should remove idle lock entries, enforce timeouts around cooperative adapters, validate arguments before calculating resource keys, and use distributed coordination when multiple orchestrator processes can touch the same external resource. The safety property remains testable: conflicting effects never overlap inside one scheduler domain.

## Prove independent reads really overlap

Parallelism is useful only if independent work overlaps. A deterministic barrier proves that both reads start before either is released. Timers alone are flaky because a slow CI runner can distort duration assertions.

Create \`safe-runner.test.ts\`:

\`\`\`ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { SafeToolRunner } from './safe-runner.js';
import type { ToolDefinition } from './types.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('independent reads start before either completes', async () => {
  const gate = deferred<void>();
  const started: string[] = [];

  const readTicket: ToolDefinition<{ id: string }> = {
    effect: 'read',
    resourceKey: ({ id }) => id,
    execute: async ({ id }) => {
      started.push(id);
      await gate.promise;
      return { id, status: 'open' };
    },
  };

  const runner = new SafeToolRunner({ read_ticket: readTicket });
  const batch = runner.executeBatch([
    { callId: 'call-a', name: 'read_ticket', arguments: { id: 'A' } },
    { callId: 'call-b', name: 'read_ticket', arguments: { id: 'B' } },
  ]);

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started.sort(), ['A', 'B']);

  gate.resolve();
  const results = await batch;
  assert.deepEqual(results.map((result) => result.callId), ['call-a', 'call-b']);
  assert.equal(results.every((result) => result.ok), true);
});
\`\`\`

The test checks concurrency without requiring completion within an arbitrary millisecond budget. It also checks that returned result order follows call order, which makes provider adaptation simpler. If your contract intentionally returns completion order, assert correlation by \`callId\` instead and document that choice.

## Force completion order to expose correlation bugs

The most common orchestration defect assigns the first completed result to the first requested call. Make the second call finish first and verify identity survives.

\`\`\`ts
test('results remain attached to call IDs when completion reverses', async () => {
  const firstGate = deferred<void>();
  const secondGate = deferred<void>();

  const lookup: ToolDefinition<{ key: string }> = {
    effect: 'read',
    resourceKey: ({ key }) => key,
    execute: async ({ key }) => {
      if (key === 'first') await firstGate.promise;
      if (key === 'second') await secondGate.promise;
      return { key, value: key.toUpperCase() };
    },
  };

  const runner = new SafeToolRunner({ lookup });
  const pending = runner.executeBatch([
    { callId: 'c-1', name: 'lookup', arguments: { key: 'first' } },
    { callId: 'c-2', name: 'lookup', arguments: { key: 'second' } },
  ]);

  secondGate.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  firstGate.resolve();

  const results = await pending;
  assert.deepEqual(results, [
    {
      callId: 'c-1', name: 'lookup', ok: true,
      output: { key: 'first', value: 'FIRST' },
    },
    {
      callId: 'c-2', name: 'lookup', ok: true,
      output: { key: 'second', value: 'SECOND' },
    },
  ]);
});
\`\`\`

A final-answer assertion such as “the agent mentioned both values” would not diagnose a swap. Trace-level correlation is the sharper oracle.

## Serialize writes that share a resource key

To prove exclusion, track the number of active mutations for one record. The maximum must remain one even when both calls are submitted in a batch.

\`\`\`ts
test('writes to one ticket never overlap', async () => {
  let active = 0;
  let maximumActive = 0;
  const releases = [deferred<void>(), deferred<void>()];
  let invocation = 0;

  const updateTicket: ToolDefinition<{ id: string; status: string }> = {
    effect: 'write',
    resourceKey: ({ id }) => id,
    execute: async ({ id, status }) => {
      const index = invocation++;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await releases[index].promise;
      active -= 1;
      return { id, status };
    },
  };

  const runner = new SafeToolRunner({ update_ticket: updateTicket });
  const pending = runner.executeBatch([
    {
      callId: 'update-1', name: 'update_ticket',
      arguments: { id: 'T-9', status: 'in_progress' },
    },
    {
      callId: 'update-2', name: 'update_ticket',
      arguments: { id: 'T-9', status: 'closed' },
    },
  ]);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(invocation, 1);
  releases[0].resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(invocation, 2);
  releases[1].resolve();

  const results = await pending;
  assert.equal(results.every((result) => result.ok), true);
  assert.equal(maximumActive, 1);
});
\`\`\`

Add a companion case with different ticket IDs and prove both begin before release. Otherwise, an implementation that serializes every tool call globally would pass the safety assertion while destroying the performance benefit.

| Calls | Expected schedule | Forbidden behavior |
|---|---|---|
| Read A, read B | Parallel | Shared mutable scratch state |
| Write A, write A | Serial | Lost update or overlap |
| Write A, write B | Parallel if adapter permits | Global lock without reason |
| External effect with same idempotency key | One effect | Duplicate delivery |
| Write A, then dependent read A | Ordered dependency | Stale read in same batch |

## Represent dependencies instead of guessing from language

Some calls are not merely conflicting; one consumes the other's output. A model might request \`create_issue\` and \`add_comment\` in one response even though the comment needs the created issue ID. Running them concurrently cannot work unless the second call already has a stable identifier.

Do not infer dependencies from natural-language intent after execution starts. Either reject an invalid batch, ask the model for a new turn after the create result, or extend the internal plan with explicit dependencies.

\`\`\`ts
import type { ToolCall } from './types.js';

export type PlannedCall = ToolCall & {
  dependsOn: string[];
};

export function validatePlan(calls: PlannedCall[]): void {
  const ids = new Set(calls.map((call) => call.callId));
  for (const call of calls) {
    for (const dependency of call.dependsOn) {
      if (!ids.has(dependency)) {
        throw new Error(
          \`call \${call.callId} has unknown dependency \${dependency}\`,
        );
      }
      if (dependency === call.callId) {
        throw new Error(\`call \${call.callId} depends on itself\`);
      }
    }
  }
}
\`\`\`

This validator does not detect longer cycles, so production code should add graph cycle detection before scheduling. The simpler and often safer provider loop is sequential across turns: execute the create, return its call result, and let the model issue the comment call with the real ID.

Parallel tool calling should be disabled when the tool surface is mostly stateful, dependencies are common, or provider output cannot express them safely. Parallelism is an optimization after correctness, not an agent capability score.

## Give irreversible tools idempotency contracts

Serialization prevents overlap during one process lifetime. It does not prevent a retry after a timeout from sending a second email or issuing a second refund. External-effect tools need stable idempotency keys and durable deduplication at the effect boundary.

\`\`\`ts
type EmailArgs = {
  to: string;
  subject: string;
  body: string;
  idempotencyKey: string;
};

class FakeMailer {
  readonly deliveries: EmailArgs[] = [];
  private readonly completed = new Map<string, { messageId: string }>();

  async send(args: EmailArgs): Promise<{ messageId: string }> {
    const existing = this.completed.get(args.idempotencyKey);
    if (existing) return existing;

    const result = { messageId: \`msg-\${this.deliveries.length + 1}\` };
    this.deliveries.push(args);
    this.completed.set(args.idempotencyKey, result);
    return result;
  }
}

test('a retried external call produces one delivery', async () => {
  const mailer = new FakeMailer();
  const args: EmailArgs = {
    to: 'qa@example.test',
    subject: 'Run complete',
    body: 'The suite passed.',
    idempotencyKey: 'agent-run-81-email-1',
  };

  const [first, retry] = await Promise.all([
    mailer.send(args),
    mailer.send(args),
  ]);

  assert.deepEqual(first, retry);
  assert.equal(mailer.deliveries.length, 1);
});
\`\`\`

The fake is single-process and synchronous until the first \`await\`, so it demonstrates the contract rather than a distributed implementation. In production, enforce uniqueness in a transactional store or use the downstream API's documented idempotency feature. A check-then-send sequence without atomic reservation can race across processes.

Never derive the idempotency key from volatile attempt number alone. Retries of one logical effect must reuse a key, while two intentionally distinct emails need different keys. Record the mapping in the trace.

## Preserve partial failures instead of rejecting the whole batch

\`Promise.all\` rejects when one member rejects, which can hide successful siblings if exceptions escape. The runner above catches each tool error and returns a result for every call. Test that property explicitly.

\`\`\`ts
test('one tool failure does not erase sibling results', async () => {
  const tools: Record<string, ToolDefinition> = {
    succeed: {
      effect: 'pure',
      resourceKey: () => 'none',
      execute: async () => ({ value: 7 }),
    },
    fail: {
      effect: 'pure',
      resourceKey: () => 'none',
      execute: async () => {
        throw new Error('fixture failure');
      },
    },
  };

  const runner = new SafeToolRunner(tools);
  const results = await runner.executeBatch([
    { callId: 'ok-1', name: 'succeed', arguments: {} },
    { callId: 'bad-1', name: 'fail', arguments: {} },
  ]);

  assert.deepEqual(results[0], {
    callId: 'ok-1', name: 'succeed', ok: true, output: { value: 7 },
  });
  assert.equal(results[1].callId, 'bad-1');
  assert.equal(results[1].ok, false);
  assert.equal(results[1].error?.code, 'TOOL_EXECUTION_FAILED');
});
\`\`\`

The next model turn should receive both correlated results. Do not silently retry every failure. Classify errors as retryable or permanent, attach attempt counts, and apply retries only when the tool's idempotency contract makes repetition safe.

## Validate arguments before locks or side effects

Resource keys calculated from unvalidated data can collapse unrelated calls onto \`undefined\` or, worse, let two aliases for the same resource bypass the lock. Validate and canonicalize first. Examples include lowercasing tenant IDs when identity is case-insensitive, resolving path segments without allowing traversal, and converting numeric strings only when the schema permits them.

Strict schema conformance helps but does not establish semantic safety. A syntactically valid \`amount: 5000\` may exceed approval limits. A valid path may point outside an allowed workspace after symlink resolution. Keep these checks in the trusted tool boundary:

| Validation layer | Example failure | Required response |
|---|---|---|
| Structural schema | Missing \`ticketId\` | Reject before scheduling |
| Canonicalization | \`Tenant-A\` versus \`tenant-a\` | Produce same lock key |
| Authorization | Agent lacks write scope | Deny before adapter call |
| Business rule | Refund exceeds approved amount | Require human or reject |
| Filesystem boundary | Resolved path leaves workspace | Deny operation |

Do not let the model's claim that two calls are independent override the server's effect metadata.

## Capture a trace that makes races diagnosable

Final text is a lossy projection of orchestration. Emit structured events around scheduling and execution.

\`\`\`json
{
  "runId": "run-81",
  "turn": 3,
  "callId": "call-b",
  "tool": "update_ticket",
  "effect": "write",
  "resourceKey": "ticket:T-9",
  "state": "started",
  "attempt": 1,
  "timestamp": "2026-08-08T10:15:31.412Z"
}
\`\`\`

Record at least proposed, validated, waiting, started, succeeded or failed, and result-submitted states. Redact secrets from arguments and outputs before logging. Keep hashes or approved identifiers when full values are sensitive.

| Trace question | Fields needed | Safety assertion |
|---|---|---|
| Did conflicts overlap? | Resource key, start, finish | Intervals for same write key do not overlap |
| Was a result swapped? | Call ID on request and result | Exactly one result per call ID |
| Was an effect duplicated? | Idempotency key, attempt, provider receipt | One committed effect |
| Did a retry exceed policy? | Error code, attempt count | Only retryable errors repeat |
| Did cancellation leave work active? | Cancellation and adapter completion | Terminal state is observable |

Avoid putting chain-of-thought or hidden reasoning in test artifacts. Tool proposals, validated arguments, scheduling decisions, adapter outcomes, and user-visible responses are sufficient operational evidence.

## Run schedule permutations against a reference outcome

Parallel bugs are order-sensitive. For pure and read-only batches, run the same calls with controlled delays that produce different completion orders and compare normalized outcomes by call ID.

\`\`\`ts
type DelayPlan = Record<string, number>;

async function runLookupPlan(delays: DelayPlan) {
  const lookup: ToolDefinition<{ key: string }> = {
    effect: 'read',
    resourceKey: ({ key }) => key,
    execute: async ({ key }) => {
      await new Promise((resolve) => setTimeout(resolve, delays[key]));
      return { key, value: key.length };
    },
  };
  const runner = new SafeToolRunner({ lookup });
  return runner.executeBatch([
    { callId: 'one', name: 'lookup', arguments: { key: 'alpha' } },
    { callId: 'two', name: 'lookup', arguments: { key: 'beta' } },
    { callId: 'three', name: 'lookup', arguments: { key: 'gamma' } },
  ]);
}

test('independent results do not depend on completion schedule', async () => {
  const forward = await runLookupPlan({ alpha: 5, beta: 10, gamma: 15 });
  const reverse = await runLookupPlan({ alpha: 15, beta: 10, gamma: 5 });
  assert.deepEqual(forward, reverse);
});
\`\`\`

The delays are illustrative and small. Barrier-based tests are better for exact overlap assertions; delay permutations are useful for broad schedule variation. For writes, compare against a documented serial order only if order is part of the contract. Otherwise assert invariants, such as no overlap and no lost update.

## Diagnose the duplicate-refund incident

Imagine an agent receives two refund-related tool calls in one model turn. They carry distinct call IDs but identical order IDs and amounts. The scheduler runs them concurrently because it keys locks by call ID. Both read “not refunded,” both issue a payment-provider request, and the customer receives two refunds.

The diagnosis should establish:

1. The raw model response contained two calls, rather than one call being duplicated in transport.
2. Both argument objects canonicalized to the same business resource, the order ID.
3. The tool definition was marked external or write, not read.
4. The lock key incorrectly used \`callId\` instead of order ID.
5. The payment request lacked a shared idempotency key for the logical refund.
6. Both provider receipts represent committed effects.

Fix both layers. Serialize or coalesce by the business resource, and use durable downstream idempotency. A lock alone fails across process restarts; idempotency alone may still waste work and produce confusing concurrent responses. Add a recorded duplicate-call fixture to the release gate.

## Test the model and scheduler as separate systems

A complete strategy has two suites:

- Model selection tests ask whether the agent proposes appropriate tools and arguments for representative prompts. They tolerate bounded nondeterminism and score semantic behavior.
- Scheduler safety tests inject exact call batches, use fake adapters, and require deterministic invariants under controlled interleavings.

Do not depend on the model producing the dangerous batch every test run. Store provider-neutral fixtures for duplicate writes, independent reads, unknown tools, malformed arguments, dependency violations, timeouts, and partial failures. Then separately evaluate whether current models tend to produce those patterns.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when you want reusable agent-testing workflows. Regardless of packaging, keep the trusted scheduler and effect registry under ordinary code review and automated tests.

## Use a release gate built around invariants

Before enabling parallel tool calls in production, require evidence for each invariant:

| Invariant | Deterministic test |
|---|---|
| Unique identity | Duplicate \`callId\` batch is rejected |
| Correct correlation | Reverse completion order, assert outputs by ID |
| Real concurrency | Independent calls cross a start barrier together |
| Conflict exclusion | Same resource reaches maximum active count one |
| Useful granularity | Different resources can overlap |
| Failure isolation | One rejection preserves sibling results |
| Idempotent retry | Repeated logical external effect commits once |
| Dependency safety | Unknown or cyclic dependency is rejected |
| Boundary enforcement | Invalid arguments never reach adapter |
| Observability | Every accepted call reaches one terminal trace state |

Roll out by tool class. Enable parallelism first for pure calculations and independent reads. Add writes only after resource keys and locking are proven. Treat payments, messages, destructive file operations, and deployments as separate high-risk approvals.

## Bound timeouts without pretending cancellation is atomic

A timeout protects the orchestrator from waiting forever, but it does not prove the tool stopped. HTTP requests can reach a server just before the client aborts, subprocesses can ignore termination, and remote MCP servers can finish after the caller records a timeout. Model timeout as an uncertain outcome for any effectful operation unless the adapter provides authoritative cancellation or status lookup.

For a read, a timed-out result can often be discarded and retried with bounded backoff. For an external write, first query by idempotency key or operation identifier. If the remote system reports completion, return that receipt. If it reports no operation, a retry may be safe. If status is unknown, escalate rather than guessing.

| Timeout point | Known state | Safe default |
|---|---|---|
| Before validated dispatch | No adapter call | Return validation or scheduling failure |
| Before remote acknowledgement | Effect uncertain | Query status with stable key |
| After committed receipt | Effect completed | Preserve receipt, do not retry |
| During local pure calculation | No external mutation | Stop or discard result |
| While waiting for resource lock | Adapter not started | Remove waiter and return canceled |

Test late completion with a fake adapter. Let the orchestrator time out, then release the fake and observe whether it still commits. The trace must distinguish caller timeout from adapter terminal state. This prevents operators from interpreting “timed out” as “did nothing.”

## Extend resource safety across processes

The in-memory keyed mutex protects one runner instance. Horizontal replicas, job retries on another worker, and separate agent services can still overlap. Determine the concurrency domain for every tool. A local file edit may need one workspace lock, while a ticket update needs coordination across every worker connected to the same project.

Prefer concurrency controls at the system of record. Conditional updates with a revision value can reject stale writes. Unique constraints can enforce one idempotency record. A queue partitioned by canonical resource key can serialize consumers. If a distributed lease is necessary, include expiration and fencing so an old holder cannot resume and overwrite a newer holder after a pause.

Tests need at least two scheduler instances sharing the fake system of record. Submit conflicting calls through different instances and prove the external invariant holds. A unit test that constructs one runner cannot reveal this boundary.

## Test backpressure and provider quotas explicitly

Safe independence does not mean unlimited fan-out. A model can propose dozens of read calls that are logically independent but exceed a provider's concurrency quota, exhaust sockets, or flood an MCP server. Add a global or per-provider semaphore alongside resource locks. Resource locks answer which calls conflict; semaphores answer how much parallel work the dependency can sustain.

Use a fake adapter that records active invocations and blocks on a gate. Submit more calls than the configured allowance and assert that active count never exceeds it, every admitted call eventually receives a terminal result, and queued calls can be canceled before dispatch. Then inject rate-limit responses and verify the retry policy respects server guidance when the API documents it.

| Control | Scope | Failure if missing |
|---|---|---|
| Resource mutex | Same business object | Conflicting mutations overlap |
| Provider semaphore | One downstream service | Independent calls overload dependency |
| Run budget | One agent task | Tool loop grows without bound |
| Timeout | One attempt | Hung call consumes capacity forever |
| Circuit breaker | Failing dependency | Retries amplify outage |

Do not make queue order a hidden correctness dependency. If order matters, express a dependency edge or serialize by resource. Backpressure queues may reorder work during retries, prioritization, or worker restarts.

## Build adversarial batches from the tool registry

Generate deterministic safety cases whenever a new tool is registered. For each write or external tool, create two calls with the same canonical resource and two with different resources. For every tool, create malformed arguments, duplicate call IDs, a thrown adapter error, and a delayed result. External tools also need duplicate idempotency-key and uncertain-timeout cases.

This registry-driven suite keeps safety coverage aligned with the actual tool surface. It does not replace scenario tests, because business dependencies can cross tool names. Updating a ticket and deleting the same ticket may need one shared resource namespace even though the names differ. Review cross-tool conflicts as part of registry design and add explicit paired fixtures.

## Frequently Asked Questions

### Should every tool call from one model turn run in parallel?

No. Parallelize only operations whose effects and data dependencies permit it. Pure computations and unrelated reads are good candidates. Writes to the same business resource, read-after-write sequences, and irreversible external actions need serialization, explicit dependencies, or durable idempotency. The model can propose a batch, but the trusted scheduler decides what may overlap. Disable provider parallel calls when the tool surface is mostly stateful or when dependencies cannot be represented safely.

### Is Promise.all enough for parallel tool call safety?

No. \`Promise.all\` starts promises and rejects on the first uncaught rejection, but it does not validate arguments, classify effects, derive lock keys, enforce dependencies, prevent duplicate side effects, or preserve partial results. Use it only inside a scheduler that has already established safety. Tests should force reversed completion, shared-resource writes, one-call failure, and duplicate external actions, then assert by stable call ID and business resource rather than array timing.

### How do I test parallelism without flaky timing assertions?

Use deferred promises or barriers. Have each fake tool record that it started, then wait on a gate controlled by the test. For independent calls, assert that all expected starts occurred before releasing the gate. For conflicting writes, assert that only one starts, release it, and then observe the next. Small delay permutations can supplement this approach, but wall-clock thresholds alone become unreliable on loaded CI runners and provide weak diagnosis.

### What should happen when one parallel tool fails?

Return a correlated terminal result for every call, preserving successful siblings and representing the failure with a stable code. The next agent turn needs the whole batch outcome, not a rejected aggregate that hides completed work. Retry only errors classified as transient, and only when the tool's idempotency contract makes repetition safe. Trace the attempt count, resource key, call ID, and any external receipt so operators can distinguish a failed response from an effect that committed before a timeout.
`,
};
