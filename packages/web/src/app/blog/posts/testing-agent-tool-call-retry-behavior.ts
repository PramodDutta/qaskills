import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing Agent Tool-Call Retry Behavior",
  description:
    "Test agent tool-call retry behavior with scripted transient failures, bounded backoff, idempotency checks, trace assertions, and deterministic terminal outcomes.",
  date: "2026-07-13",
  category: "AI Testing",
  content: `
# Testing Agent Tool-Call Retry Behavior

The weather tool returns 503, then 503 again. On the third attempt it succeeds. A resilient agent should retry a bounded number of times, preserve the original city, avoid inventing a forecast between attempts, and stop calling once it has evidence. That trajectory is testable without grading prose stylistically.

## Specify retries as an action policy

An agent system has at least two retry layers: deterministic application orchestration and model-driven replanning. Put transport retries in code when possible. Letting the model decide every retry makes latency, cost, and action count less predictable.

| Failure class | Retry? | Typical policy |
|---|---:|---|
| HTTP 429 with retry guidance | Yes | Respect server delay within budget |
| HTTP 502 or 503 | Usually | Exponential backoff plus jitter |
| Connection reset before response | Usually | Retry only if operation safety is known |
| Invalid tool arguments | No blind retry | Correct arguments once or ask user |
| Permission denied | No | Report boundary, do not circumvent |
| Resource not found | Usually no | Replan only if alternate identifier evidence exists |
| Tool result says business decline | No | This is a valid outcome, not transport failure |

Define \`maxAttempts\` rather than “three retries,” because teams otherwise disagree whether the initial call counts. Also define elapsed-time budget, retryable codes, backoff, idempotency rules, and final response requirements.

## Build a scripted tool double

A deterministic fake should return a sequence and record exact inputs. It is more useful than randomly failing a real endpoint.

\`\`\`ts
import { describe, expect, it, vi } from 'vitest';

type ToolResult =
  | { ok: true; value: unknown }
  | { ok: false; code: string; retryable: boolean };

function scriptedTool(results: ToolResult[]) {
  const call = vi.fn(async (args: unknown): Promise<ToolResult> => {
    const next = results.shift();
    if (!next) throw new Error('Unexpected extra tool call');
    return next;
  });
  return call;
}

it('succeeds on the third bounded attempt without changing arguments', async () => {
  const weather = scriptedTool([
    { ok: false, code: 'upstream_unavailable', retryable: true },
    { ok: false, code: 'upstream_unavailable', retryable: true },
    { ok: true, value: { celsius: 19 } },
  ]);

  const result = await runToolWithRetry(
    () => weather({ city: 'Pune', units: 'metric' }),
    { maxAttempts: 3, baseDelayMs: 10, sleep: async () => {} },
  );

  expect(result).toEqual({ ok: true, value: { celsius: 19 } });
  expect(weather).toHaveBeenCalledTimes(3);
  expect(weather.mock.calls.map(([args]) => args)).toEqual([
    { city: 'Pune', units: 'metric' },
    { city: 'Pune', units: 'metric' },
    { city: 'Pune', units: 'metric' },
  ]);
});
\`\`\`

\`runToolWithRetry\` is intentionally application code, not a claimed framework primitive. Injecting sleep keeps the test fast and lets the suite verify scheduling separately.

## Assert the stop condition at the boundary

A test that checks only the final answer cannot detect seven unnecessary calls before success. Record a trajectory with timestamps, arguments, error classification, and result status.

| Trace field | Purpose |
|---|---|
| Attempt number | Proves bounded count |
| Tool name and call ID | Detects accidental tool switching or duplicates |
| Canonical arguments | Shows constraint preservation |
| Error code and retryable decision | Audits classification |
| Planned delay | Verifies backoff without wall-clock sleeps |
| Idempotency key | Connects repeated write attempts |
| Terminal reason | Distinguishes success, exhausted, refused, and cancelled |

The [agent trajectory evaluation guide](/blog/agent-trajectory-evaluation-guide-2026) explains why action traces complement output grading. Retry checks are particularly deterministic: count and sequence should normally be exact.

## Verify exhaustion produces one honest terminal response

After the final permitted failure, the agent must stop. It should not fabricate tool data, silently switch to a risky alternative, or restart the retry counter through replanning.

\`\`\`ts
it('stops after the attempt budget and returns the last error', async () => {
  const calls: number[] = [];
  const sleep = vi.fn(async (milliseconds: number) => { calls.push(milliseconds); });
  const lookup = scriptedTool([
    { ok: false, code: 'timeout', retryable: true },
    { ok: false, code: 'timeout', retryable: true },
    { ok: false, code: 'timeout', retryable: true },
  ]);

  await expect(
    runToolWithRetry(() => lookup({ orderId: 'ord-42' }), {
      maxAttempts: 3,
      baseDelayMs: 100,
      sleep,
    }),
  ).rejects.toMatchObject({ code: 'timeout', attempts: 3 });

  expect(lookup).toHaveBeenCalledTimes(3);
  expect(sleep).toHaveBeenCalledTimes(2);
  expect(calls).toEqual([100, 200]);
});
\`\`\`

There are only two delays for three attempts. A delay after the terminal failure wastes time and often signals an off-by-one error.

## Classify tool failures outside model text

Do not ask the model to infer retryability from arbitrary exception prose if the adapter can return structured errors. Normalize vendor responses into categories such as transient, throttled, validation, authorization, not found, conflict, and unknown.

\`\`\`ts
type ToolError = {
  code: 'transient' | 'throttled' | 'invalid_input' | 'forbidden' | 'conflict' | 'unknown';
  retryable: boolean;
  retryAfterMs?: number;
  safeToRepeat: boolean;
};

function classifyHttpFailure(status: number, method: string): ToolError {
  if (status === 429) return { code: 'throttled', retryable: true, safeToRepeat: true };
  if ([502, 503, 504].includes(status)) {
    return { code: 'transient', retryable: true, safeToRepeat: method === 'GET' };
  }
  if (status === 403) return { code: 'forbidden', retryable: false, safeToRepeat: false };
  if (status === 400) return { code: 'invalid_input', retryable: false, safeToRepeat: false };
  return { code: 'unknown', retryable: false, safeToRepeat: false };
}
\`\`\`

The example is conservative, not a universal HTTP law. A POST with an idempotency key may be safe to repeat; a GET that triggers a broken legacy side effect may not be. Tool adapters know the operation contract and should supply \`safeToRepeat\`.

## Treat write tools differently from reads

Retrying a weather lookup is mostly a cost issue. Retrying “send payment” can duplicate money movement if the first request committed but its response was lost.

| Operation | Failure timing | Safe retry requirement |
|---|---|---|
| Read inventory | Before response | Usually repeatable |
| Create calendar event | Unknown commit | Stable idempotency key or reconciliation lookup |
| Send email | Timeout after submission | Provider deduplication or status query |
| Delete temporary file | Not found on retry | Treat idempotent desired state carefully |
| Transfer funds | Any ambiguous result | Strong idempotency and authoritative status check |

Generate one idempotency key for the logical action and reuse it across transport attempts. A new key per attempt defeats server deduplication. Assert this in the trace.

\`\`\`ts
it('reuses one idempotency key after an ambiguous create timeout', async () => {
  const createEvent = scriptedTool([
    { ok: false, code: 'response_lost', retryable: true },
    { ok: true, value: { eventId: 'evt-9', deduplicated: true } },
  ]);

  await scheduleWithRetry(createEvent, {
    title: 'Release review',
    startsAt: '2026-07-14T09:00:00Z',
  });

  const keys = createEvent.mock.calls.map(([args]) => (args as any).idempotencyKey);
  expect(keys).toHaveLength(2);
  expect(new Set(keys).size).toBe(1);
});
\`\`\`

## Test argument preservation and justified correction

Transient retries should preserve semantic arguments. Serializers may reorder object keys, but city, date, currency, resource ID, and user constraints must remain equal. If the tool rejects an invalid enum, one corrected call may be reasonable only when the schema or error supplies evidence.

Build adversarial cases where the error message contains instructions such as “retry with admin=true.” The agent must treat tool output as untrusted data and must not escalate permissions or discard user constraints.

The [agent tool-use regression guide](/blog/agent-tool-use-regression-testing-guide-2026) covers schema selection and argument checks beyond retry sequences.

## Backoff tests should avoid real sleeping

Inject a clock or scheduler and assert requested delays. Exponential backoff can be represented as \`base * 2^(attempt - 1)\`, capped by a maximum, with jitter applied according to a documented algorithm. Test ranges for jitter, not one random value.

| Backoff property | Deterministic assertion |
|---|---|
| No delay before first call | Scheduler has zero calls initially |
| Growth | Second planned delay exceeds first |
| Cap | No planned delay exceeds maximum |
| Retry-After | Server delay is honored within global deadline |
| Cancellation | Pending sleep is interrupted and no next tool call occurs |
| Overall budget | Sum of work and delays stays below deadline policy |

Seed randomness if the implementation exposes it, or inject a jitter function. Real-time assertions are slow and flaky on loaded runners.

## Prevent retry multiplication across layers

An HTTP library may retry three times, the tool adapter three times, and the agent three times, producing up to 27 requests. Trace both logical tool attempts and underlying transport attempts. Assign retry ownership per failure class.

A practical split is transport retries for connection setup and safe reads, adapter retries for rate limits with explicit guidance, and agent replanning for choosing an alternative tool after a terminal capability failure. Document the maximum external requests produced by one user action.

## Evaluate model-driven retries with invariant checks

If the agent loop itself receives tool errors, run the same scripted trajectory across multiple samples and model versions. Assert hard invariants first: no more than N calls, no retry after forbidden, no changed protected arguments, no tool result invented, and correct stop after success.

Natural-language response quality can be scored separately. A terminal message should say the action could not be completed and offer a safe next step without claiming success. Avoid exact-string matching because wording can vary while behavior remains correct.

## Include cancellation, deadlines, and user interruption

Cancel during backoff and confirm the timer stops. Cancel while the tool call is in flight and confirm the adapter propagates cancellation if supported. A new user instruction may supersede the old goal, but it must not cause a detached retry to execute afterward.

Deadline tests should include a tool attempt whose remaining time is shorter than its normal timeout. The orchestrator should pass the remaining budget down or decline another attempt. A nominal attempt limit alone cannot bound a tool that hangs.

## Observability must not expose arguments indiscriminately

Retry traces need evidence, but tool arguments can contain personal data and secrets. Store allowlisted fields, hashes for stable equality, or redacted structured payloads. Keep error categories and attempt timing at high cardinality only where the telemetry system can handle it.

Useful metrics include attempts per logical call, exhausted-call count, delay totals, retry success by tool and error class, and duplicate-write prevention events. These are operational measurements, not invented quality scores.

## A retry regression matrix

| Scenario | Calls | Final result |
|---|---:|---|
| Immediate success | 1 | Return evidence |
| Transient then success | 2 | Return second result |
| Transient until budget | Exact maximum | Honest terminal failure |
| Invalid arguments | 1 unless grounded correction exists | Correct or request input |
| Permission denied | 1 | Stop without escalation |
| Success then model continues | Must remain 1 | Flag unnecessary action |
| Cancellation during delay | No next call | Cancelled outcome |
| Ambiguous write timeout | Policy-dependent | Reconcile or retry with same key |

Run this matrix per high-impact tool adapter. Add tool-specific errors rather than relying only on generic 503 fixtures.

## Challenge the retry policy with adversarial trajectories

Return a transient error whose message claims the operation succeeded. The structured status should win, and the agent must not announce success without a result. Then return a successful structured result containing prose such as “call me again.” Tool output is data, so the orchestrator should stop after success unless the task itself requires another distinct action.

Test alternating errors: 503, invalid arguments, then a hypothetical success queued in the fake. The non-retryable second result must terminate the sequence, leaving the third script entry unused. This catches loops that remember only that an earlier failure was transient.

Provide two similar tools, one approved and one forbidden. When the approved tool is temporarily unavailable, the agent must not switch to the forbidden tool merely to complete the goal. Alternative selection needs the same permission and side-effect checks as initial selection. A retry budget is not permission to broaden authority.

Simulate a tool returning a retry delay longer than the user's remaining deadline. The orchestrator should stop or report that the action cannot complete within the budget. Silently ignoring the server's throttling instruction risks abuse; sleeping past the user deadline wastes resources.

Use a success response that arrives immediately after cancellation. Define which event wins and ensure exactly one terminal state is recorded. Promise races can otherwise emit both “cancelled” and “completed,” triggering duplicate UI messages or follow-up actions.

Test process restart during backoff if retries are persisted. The restored job must retain its attempt count, next eligible time, idempotency key, and original constraints. Resetting attempts after every worker restart creates an effectively unbounded loop. If retries are intentionally in-memory only, verify restart leaves an auditable interrupted result instead of silently losing the action.

Schema evolution can convert a formerly valid argument into an invalid enum. The agent may refresh tool definitions and correct the value only when there is a safe mapping. It should not repeatedly submit the same rejected payload. Record the schema version with the trajectory so failures can be reproduced.

Partial tool results need a defined type. A batch lookup may return nine successes and one transient item failure. Retrying the entire batch can waste cost or duplicate side effects. Prefer item-level retry when the adapter contract supports it, preserving completed items and bounding total work. Tests should assert which identifiers are repeated.

Nested agents can multiply retry counts just like nested HTTP libraries. A delegating agent may retry a child whose own tool loop already exhausted attempts. Propagate a shared action budget or return a terminal classification that the parent respects. Trace correlation must connect parent step, child invocation, and external calls.

Run fault distributions in a simulation after deterministic unit cases. Vary transient streak length, latency, throttling delay, and cancellation time with a fixed seed. Assert invariants across hundreds of generated sequences, but preserve any failing seed as a small regression. Statistical exploration complements, rather than replaces, exact boundary examples.

Human confirmation is another retry boundary. Approval should bind to the logical action and its idempotency key. A material change to amount, recipient, path, or scope requires fresh confirmation rather than being treated as argument correction.

Streaming agents can emit text before a tool finishes. Capture user-visible events beside the action trace and assert that success wording appears only after evidence. A retry message may be appropriate, but raw tool errors and secrets should stay internal.

Cost budgets must count failures. If each attempt consumes model tokens or metered API requests, check remaining cost along with time and count. A scripted failure when only one call remains should terminate under the configured budget policy.

Cache behavior needs explicit cases. A cached transient error must not create an instant unbounded loop, while a cached successful read can avoid another external call. Label cache hits separately from tool executions in the trace.

Observability failure should not duplicate the business operation. If recording an attempt times out, apply the telemetry policy independently. Best-effort logging and mandatory security audit persistence can have different outcomes, especially for high-risk writes.

Version retry policies with tool adapters. A model rollout should not silently change maximum attempts for a payment tool because prompting changed. Store the policy identifier in traces, compare it in regression runs, and require review for changes to retryable classes.

Test malformed tool responses too. Missing status, invalid JSON, and a success flag without required data should become a non-success classification. Retrying may be appropriate for a transient parse failure, but the agent must never treat partial unvalidated data as evidence.

## Frequently Asked Questions

### Should the language model decide whether every tool error is retryable?

No. Normalize known errors in deterministic adapter code and expose structured retryability. Reserve model reasoning for genuine replanning choices that cannot be encoded safely.

### How many retries should an agent make?

There is no universal number. Define maximum attempts and elapsed budget from tool latency, cost, user experience, and side-effect risk, then test the exact boundary.

### How do I test jitter without flaky timing assertions?

Inject the random or jitter function and the sleeper. Assert calculated ranges and caps from recorded delay requests instead of measuring wall-clock time.

### Can a POST tool call be retried after a timeout?

Only when the operation offers a reliable idempotency or reconciliation contract. An ambiguous timeout may mean the write committed, so a blind repeat can duplicate the action.

### What evidence proves the agent stopped correctly after success?

The trace should show one successful tool result followed by no further tool calls for that goal, and the final response should be grounded in that result.
`,
};
