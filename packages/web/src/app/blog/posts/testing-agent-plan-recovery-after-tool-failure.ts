import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Agent Plan Recovery After a Tool Failure',
  description:
    'Test agent plan recovery after tool failure with fault injection, trajectory assertions, bounded replanning, and outcome-based evaluation for AI agents.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Agent Plan Recovery After a Tool Failure

The agent has already decided to query the customer database when the tool returns \`ECONNREFUSED\`. The interesting behavior starts now. Does it retry forever, invent an account balance, abandon a still-achievable task, or revise the plan using an authorized fallback?

Plan recovery is a trajectory property. A final answer can look plausible even when the agent ignored a failed tool, duplicated a side effect, or silently broadened its permissions. Evaluation therefore needs controlled tool faults, a trace of decisions and calls, and assertions about both the eventual outcome and the path taken.

This guide treats the agent as a system under test. The harness can be deterministic even if the model is not: tool responses, fault timing, budgets, and acceptance rules all remain under test control.

## Define recovery as an observable state transition

A tool failure should change the agent's belief about available actions. The next step may retry, select an equivalent tool, gather missing information, ask the user, or stop with a precise limitation. Which response is correct depends on the failure and the task.

| Failure class | Example signal | Reasonable recovery | Dangerous response |
| --- | --- | --- | --- |
| Transient | timeout, 503, rate limit with retry hint | Bounded retry with delay or cheaper fallback | Tight infinite loop |
| Permanent input error | 400, schema validation failure | Correct arguments or request clarification | Repeat identical invalid call |
| Authorization | 401 or 403 | Stop, request access, or use an authorized read path | Seek credentials in unrelated tools |
| Capability absent | tool unavailable or method unsupported | Replan with a declared alternative | Fabricate the missing result |
| Partial side effect | request timed out after submission | Reconcile status using idempotency key | Submit again blindly |
| Corrupt output | malformed JSON or inconsistent fields | Validate, retry safely, or reject evidence | Treat invalid data as fact |

Recovery is not synonymous with task completion. If all authorized paths are blocked, an honest, actionable failure is a passing behavior. A fabricated success is not.

## Build a fault-injectable tool boundary

Keep tool implementations behind a narrow dispatcher that records every attempt. The example below is ordinary TypeScript and Vitest. A scripted agent stands in for the model so the recovery policy can be tested deterministically before adding statistical model evaluations.

\`\`\`ts
import { expect, test } from 'vitest';

type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; code: string; retryable: boolean; message: string };

type ToolCall = { name: string; args: Record<string, unknown> };
type TraceEntry = ToolCall & { result: ToolResult };

class ToolHarness {
  readonly trace: TraceEntry[] = [];
  private attempts = new Map<string, number>();

  constructor(
    private readonly tools: Record<
      string,
      (args: Record<string, unknown>, attempt: number) => Promise<ToolResult>
    >,
  ) {}

  async call(request: ToolCall): Promise<ToolResult> {
    const attempt = (this.attempts.get(request.name) ?? 0) + 1;
    this.attempts.set(request.name, attempt);
    const implementation = this.tools[request.name];
    const result = implementation
      ? await implementation(request.args, attempt)
      : { ok: false as const, code: 'TOOL_UNAVAILABLE', retryable: false, message: request.name };
    this.trace.push({ ...request, result });
    return result;
  }
}
\`\`\`

The harness records structured failures rather than throwing every error. Production adapters may catch network exceptions and normalize them into this shape. Preserve relevant distinctions: a retryable timeout should not look like a permission denial.

Do not expose arbitrary fault controls to the model. Injection belongs to the test harness. The agent sees only the same failure object it would receive from a real tool adapter.

## Prove that a transient retry is bounded

Suppose the plan needs inventory availability before promising a delivery date. The inventory tool times out once and then succeeds. The agent may retry once, but it must not issue the shipping quote before obtaining inventory evidence.

\`\`\`ts
async function answerAvailability(harness: ToolHarness, sku: string): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const stock = await harness.call({ name: 'inventory.lookup', args: { sku } });
    if (stock.ok) {
      const quantity = (stock.data as { available: number }).available;
      return quantity > 0 ? \`\${quantity} units available\` : 'Currently out of stock';
    }
    if (!stock.retryable) return \`Unable to verify inventory: \${stock.code}\`;
  }
  return 'Unable to verify inventory after two attempts';
}

test('retries one transient inventory failure and uses the recovered evidence', async () => {
  const harness = new ToolHarness({
    'inventory.lookup': async ({ sku }, attempt) => {
      if (attempt === 1) {
        return { ok: false, code: 'TIMEOUT', retryable: true, message: '2s deadline' };
      }
      return { ok: true, data: { sku, available: 7 } };
    },
  });

  const answer = await answerAvailability(harness, 'KB-104');

  expect(answer).toBe('7 units available');
  expect(harness.trace.map((entry) => entry.name)).toEqual([
    'inventory.lookup',
    'inventory.lookup',
  ]);
  expect(harness.trace[0].result).toMatchObject({ ok: false, retryable: true });
  expect(harness.trace[1].result).toMatchObject({ ok: true });
});
\`\`\`

This is a policy unit test, not an LLM evaluation. It establishes executable expectations for budgets and evidence use. Run the same fault against the real agent many times to measure adherence under sampling.

Notice that the retry preserves the arguments. In other scenarios, correction is expected. A validation error for a malformed date should lead to a changed date format, not the identical call.

## Score replanning without requiring one exact chain of thought

There may be several valid trajectories. After a search index outage, an agent could query the source database, use a cached read model, or ask whether the user wants to wait. Exact-sequence golden files overfit to one implementation and break on harmless model variation.

Evaluate constraints and milestones instead:

| Dimension | Passing evidence | Example failure |
| --- | --- | --- |
| Failure recognition | Trace or action references the tool's actual error | Continues as if data was returned |
| Plan revision | Next useful action differs or retry has a stated bound | Repeats identical call indefinitely |
| Authority preservation | Fallback is within allowed tool and data scope | Uses an admin write tool to replace a failed read |
| Dependency order | Required evidence arrives before dependent action | Sends refund before verifying transaction |
| Side-effect safety | Reconciles uncertain writes or uses idempotency | Duplicates an order after timeout |
| Communication | Final response separates known facts from blocked facts | Presents guessed values without qualification |

The [agent trajectory evaluation guide](/blog/agent-trajectory-evaluation-guide-2026) goes deeper into trace representations and partial-order scoring. For recovery, model the failed call as a causal pivot and inspect what changes afterward.

Keep private chain-of-thought out of the contract. Tool calls, normalized tool results, plan summaries intended for the system, user-visible messages, and final outcomes are sufficient observables. Requiring hidden reasoning is neither portable nor necessary.

## Inject failure at every position in a multi-step plan

A single first-step outage misses the hard cases. For a plan \`search customer -> fetch invoice -> issue refund -> notify customer\`, inject faults before evidence, during the side effect, and after the side effect.

Before the refund, failure should prevent the write. A timeout during the refund is ambiguous because the provider may have processed it. After the refund, notification failure should not cause the refund to run again.

\`\`\`ts
type RefundStatus = 'not_found' | 'pending' | 'completed';

async function refundWithReconciliation(
  harness: ToolHarness,
  invoiceId: string,
  key: string,
): Promise<string> {
  const refund = await harness.call({
    name: 'payments.refund',
    args: { invoiceId, idempotencyKey: key },
  });
  if (refund.ok) return 'Refund completed';
  if (refund.code !== 'TIMEOUT_AFTER_SEND') return \`Refund blocked: \${refund.code}\`;

  const status = await harness.call({
    name: 'payments.refundStatus',
    args: { idempotencyKey: key },
  });
  if (!status.ok) return 'Refund status is unknown; manual review required';

  const value = (status.data as { status: RefundStatus }).status;
  return value === 'completed' ? 'Refund completed' : \`Refund status: \${value}\`;
}

test('reconciles an ambiguous refund instead of submitting a second write', async () => {
  const harness = new ToolHarness({
    'payments.refund': async () => ({
      ok: false,
      code: 'TIMEOUT_AFTER_SEND',
      retryable: true,
      message: 'connection closed before response',
    }),
    'payments.refundStatus': async () => ({
      ok: true,
      data: { status: 'completed' },
    }),
  });

  const result = await refundWithReconciliation(harness, 'inv-900', 'refund-case-771');

  expect(result).toBe('Refund completed');
  expect(harness.trace.map(({ name }) => name)).toEqual([
    'payments.refund',
    'payments.refundStatus',
  ]);
});
\`\`\`

This scenario is materially different from a read retry. Test matrices should label whether each tool is read-only, idempotent, conditionally idempotent, or non-idempotent.

## Distinguish unavailable tools from denied tools

An unavailable tool can justify an equivalent fallback. A denied tool indicates an authority boundary. The agent should not respond to \`FORBIDDEN\` by searching for a broader credential, exporting the entire dataset through another integration, or asking a user to paste secrets.

Create adversarial tool descriptions that make the unsafe fallback tempting. For example, deny \`customer.readProfile\` and leave \`warehouse.runSql\` available. A secure agent must not use arbitrary SQL to bypass profile authorization even if the data exists there.

The [agent tool-use regression testing guide](/blog/agent-tool-use-regression-testing-guide-2026) helps organize permission and argument assertions. In recovery suites, specifically check that failure does not expand scope.

Ask-for-help behavior needs acceptance criteria too. A useful response names the failed capability, explains what could not be verified, preserves completed work, and requests only the minimum information or access needed. "Something went wrong" is safe but operationally weak.

## Generate recovery cases from tool metadata

Handwritten scenarios should cover business-critical paths, while generated cases widen fault coverage. Tool metadata can supply read/write classification, idempotency, required permissions, error taxonomy, and safe alternatives.

For each tool in a representative plan, generate at least permanent failure, one transient failure followed by success, repeated transient failure until budget exhaustion, malformed successful output, and latency beyond the tool deadline. Side-effecting tools additionally need timeout-before-send and timeout-after-send cases.

Do not assume every HTTP 500 is retryable. The adapter's normalized contract should decide based on provider semantics. Likewise, rate limiting may contain a retry time that exceeds the agent's remaining deadline; the correct recovery may be to tell the user when it can resume.

Property assertions work well across generated cases:

- total calls never exceed the plan's tool budget;
- identical non-idempotent writes occur at most once;
- final claims cite only successful tool data or user-provided facts;
- a permanent permission error is never followed by a more privileged workaround;
- every failure outcome names the unresolved dependency;
- successful recovery still satisfies the original user constraint.

Keep generators reproducible by recording the seed, model version, prompt revision, tool catalog version, and injected fault schedule.

## Evaluate stochastic agents with rates, not anecdotes

A model may recover nine times and loop on the tenth. Run each high-risk scenario across multiple seeds or repeated samples with production decoding settings. Report recovery success, unsafe action rate, unnecessary-call count, duplicate-side-effect rate, and honest-block rate.

Do not invent a universal acceptable percentage. Set thresholds from consequence. A duplicate refund requires far stricter protection, often deterministic idempotency outside the model, than an extra read-only search call.

Compare model or prompt versions on the same case set. Pair outcomes by scenario so a change in test mix does not masquerade as improvement. Review trajectory diffs for newly introduced fallback tools, not only aggregate pass rate.

LLM judges can classify nuanced communication, but executable checks should own tool counts, order constraints, permissions, and idempotency. If a judge scores recovery quality, blind it to model identity and calibrate it against senior human labels.

## Capture a compact failure artifact

A useful artifact includes the initial goal, allowed tools, fault schedule, normalized results, public plan updates, tool calls with redacted arguments, final answer, evaluator findings, and reproducibility metadata. It should not contain secrets or hidden reasoning.

Represent causality explicitly: call 4 failed, call 5 was the recovery action, and constraint X was still satisfied. That is faster to debug than reading a flat transcript.

Redact before persistence, especially when tools touch customer data. Keep hashes or synthetic identifiers where equality across retries matters. The evaluator may need to know that two idempotency keys match without seeing their production value.

When a case fails only in the full agent, replay it first with deterministic tool outputs. If it disappears, inspect model variance and prompt context. If it remains, the orchestrator's retry, budget, or state-transition logic is likely responsible.

## Decide when stopping is the correct recovery

Agent benchmarks often reward completion, which can pressure a model to improvise after evidence disappears. Add cases where no authorized alternative exists and score a controlled stop as success.

For example, if the deployment status tool and read-only cluster fallback are both unavailable, the agent cannot truthfully confirm rollout health. It may preserve the deployment ID, report which checks failed, suggest an operator command, and stop. It must not infer success from the absence of alerts.

An escalation should not repeat work the agent already completed. If it gathered logs before the final tool failed, include those facts and their provenance. Recovery quality includes preserving valid intermediate state.

Set a maximum number of replans as well as tool calls. An agent can loop cognitively without invoking tools, emitting slightly different plans that never change feasibility. The orchestrator should detect repeated state and terminate with a useful block.

## Separate planner defects from tool-adapter defects

A recovery evaluation can blame the model for information the adapter never represented. If a rate-limit response loses its retry timestamp during normalization, the agent cannot schedule an informed retry. If a timeout after submission is mislabeled as a timeout before submission, even a careful policy may duplicate a write.

Test adapters independently with recorded protocol-level responses. Assert the normalized code, retryability, operation identifier, uncertainty flag, safe user message, and redaction. Then use those normalized results in planner evaluations. This layering identifies whether remediation belongs in HTTP parsing, orchestration policy, tool descriptions, or the model prompt.

Tool descriptions also need failure semantics. State whether a method is read-only, whether an idempotency key is required, which status method reconciles an ambiguous result, and what permissions it needs. Do not rely on the model to infer transaction safety from a tool's name.

## Add metamorphic checks around the same failed plan

Vary one property while keeping the goal fixed. Change a timeout from retryable to permanent and expect the retry to disappear. Mark the fallback unauthorized and expect escalation instead of substitution. Provide a successful reconciliation result and then an unknown result, checking that the final claim changes from completed to unresolved.

These paired cases are more diagnostic than unrelated prompts because the expected behavioral delta is clear. They also catch agents that ignore structured failure fields and respond from superficial wording. Keep tool messages similar while changing the machine-readable code to verify which signal drives policy.

For multilingual user prompts, hold the fault schedule constant and confirm that authorization, idempotency, and evidence rules survive translation. The explanation language may change; the allowed trajectory must not.

## Test recovery when the fallback returns weaker evidence

Fallback tools are rarely perfect substitutes. A live inventory service may return exact quantity, while a replicated catalog returns only an "in stock" flag that can be several minutes old. The recovered answer must narrow its claim to the evidence actually available. It can report likely availability with freshness context, but it cannot repeat the precise quantity requested from the failed source.

Encode evidence strength in the tool result and assert claim compatibility. Create paired cases where the fallback is fresh enough for a browsing question but insufficient for a purchase commitment. This catches a planner that treats every successful tool response as equally authoritative.

Recovery can also change latency or cost. Give the plan a remaining deadline and call budget, then make the fallback valid but too slow or expensive. A good agent asks for a tradeoff or stops within the service objective instead of completing after the user-visible deadline. These constraints belong in the evaluator because an outcome delivered too late may be operationally equivalent to failure.

## Frequently Asked Questions

### Is retrying the failed tool enough to count as plan recovery?

Only when the failure is transient, the operation is safe to repeat, and the retry is bounded. Permanent errors and ambiguous side effects require a changed plan or reconciliation.

### How do I test recovery without depending on model randomness?

Start with deterministic policy tests around a scripted agent and fault-injectable dispatcher. Then run the same contracts repeatedly against the real model and report adherence rates.

### Should tests assert the agent's exact revised plan text?

Usually not. Assert observable milestones, prohibited actions, dependency order, call budgets, and final claims. Several different plans can be equally valid.

### What is the safest response to a timed-out write tool?

Treat its result as unknown, query status with an idempotency key or operation ID, and avoid blind resubmission. If reconciliation also fails, escalate with the ambiguity intact.

### Can a blocked final answer be a passing test?

Yes. When every authorized path is unavailable, a precise limitation with preserved evidence and a minimal next step is safer and more correct than fabricated completion.
`,
};
