import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Agent Testing Human Handoff Escalation That Never Loses Context',
  description: 'Build agent testing human handoff escalation workflows that route risky cases, preserve context, respect timeouts, and resume safely after human review.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# Agent Testing Human Handoff Escalation That Never Loses Context

Agent testing human handoff escalation requires more than checking whether an agent can emit "ask a human." You must prove that policy triggers at the right boundary, risky automation stops, a complete and minimal evidence packet reaches the correct queue, duplicate escalations collapse safely, timeouts follow a defined path, and execution resumes only from an authorized human decision.

Treat handoff as a stateful protocol between an AI agent and an operations system. The protocol needs typed reasons, risk levels, correlation ids, redaction, acknowledgement, ownership, expiry, and a resumable decision. Test the transitions and side effects, not the model's prose. A beautifully worded escalation that leaks credentials or continues executing a payment is a failed control.

This guide provides a deterministic TypeScript model, policy tests, queue-contract tests, adversarial cases, and production monitoring checks for QA engineers using coding agents. Broader system risks are covered in the [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026). If the agent operates tools exposed through Model Context Protocol, add the [MCP servers test automation guide](/blog/mcp-servers-test-automation-2026) to validate the tool boundary itself.

## Define handoff as a protocol, not a fallback sentence

A human handoff begins when automation decides it cannot or must not continue and ends when the case is resolved, rejected, expired, or safely resumed. Every state must be externally observable. Otherwise a test can assert that an escalation message was generated while the agent quietly continues making tool calls.

| State | Entry condition | Allowed side effects | Exit evidence |
|---|---|---|---|
| \`running\` | Agent has an active task | Policy-approved tool calls | Result, escalation request, or failure |
| \`escalation_pending\` | Policy requires review | Persist packet and request queue delivery | Queue acknowledgement |
| \`waiting_for_human\` | Queue accepted the packet | Read-only status checks | Human decision or expiry |
| \`approved_to_resume\` | Authorized approval received | Only approved action scope | Resumption receipt |
| \`rejected\` | Human denies action | Notification and safe cleanup | Terminal audit record |
| \`expired\` | Review deadline passes | Compensating or cancellation workflow | Terminal audit record |
| \`completed\` | Task finishes safely | Final audit event | Terminal result |

The state machine prevents a dangerous ambiguity: "escalated" cannot mean both "sent a message" and "human took ownership." Pending delivery and accepted ownership are different states. Your service-level objective may measure both, but tests must not collapse them.

Define the events before choosing UI copy:

\`\`\`ts
// src/contracts.ts
export type EscalationReason =
  | 'policy_denied'
  | 'low_confidence'
  | 'missing_authority'
  | 'conflicting_instructions'
  | 'tool_failure'
  | 'customer_request';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type EscalationPacket = {
  escalationId: string;
  taskId: string;
  reason: EscalationReason;
  risk: RiskLevel;
  summary: string;
  attemptedAction: string;
  evidence: Array<{ label: string; value: string }>;
  allowedResumeActions: string[];
  createdAt: string;
  expiresAt: string;
};

export type HumanDecision = {
  escalationId: string;
  reviewerId: string;
  outcome: 'approve' | 'reject';
  approvedAction?: string;
  decidedAt: string;
};
\`\`\`

These types are application contracts, not claims about a vendor API. Keep them small enough to validate, and version them if producers and queue consumers deploy independently.

## Build an escalation oracle outside the model

The model may contribute uncertainty signals, but policy-critical escalation should be evaluated by deterministic code wherever possible. The test oracle then checks facts such as action class, monetary amount, authorization scope, customer request, and tool status.

| Signal | Example policy | Why deterministic control helps |
|---|---|---|
| Irreversible action | Always require approval | Prompt wording cannot bypass it |
| Missing authority | Stop and escalate | Prevents privilege inference |
| Customer asks for human | Honor immediately | Avoids trapping the user in automation |
| Conflicting instructions | Escalate with both sources | Preserves ambiguity for review |
| Tool transient failure | Retry within budget, then escalate | Prevents infinite retry |
| Low model confidence | Escalate only for defined task classes | Avoids treating raw score as universal truth |

Implement a pure decision function that your tests can cover exhaustively:

\`\`\`ts
// src/escalation-policy.ts
export type PolicyInput = {
  action: 'read_record' | 'issue_refund' | 'delete_account' | 'send_message';
  amountCents?: number;
  hasAuthority: boolean;
  customerRequestedHuman: boolean;
  instructionConflict: boolean;
  consecutiveToolFailures: number;
};

export type PolicyDecision =
  | { kind: 'continue' }
  | { kind: 'escalate'; reason: string; risk: 'low' | 'medium' | 'high' | 'critical' };

export function decideEscalation(input: PolicyInput): PolicyDecision {
  if (input.customerRequestedHuman) {
    return { kind: 'escalate', reason: 'customer_request', risk: 'low' };
  }
  if (input.instructionConflict) {
    return { kind: 'escalate', reason: 'conflicting_instructions', risk: 'high' };
  }
  if (!input.hasAuthority) {
    return { kind: 'escalate', reason: 'missing_authority', risk: 'high' };
  }
  if (input.action === 'delete_account') {
    return { kind: 'escalate', reason: 'policy_denied', risk: 'critical' };
  }
  if (input.action === 'issue_refund' && (input.amountCents ?? 0) > 10_000) {
    return { kind: 'escalate', reason: 'policy_denied', risk: 'high' };
  }
  if (input.consecutiveToolFailures >= 3) {
    return { kind: 'escalate', reason: 'tool_failure', risk: 'medium' };
  }
  return { kind: 'continue' };
}
\`\`\`

The amount and retry values are illustrative business rules. In production, name their policy source and ownership. The useful testing property is precedence: a customer request is honored even when the contemplated action appears safe, and missing authority stops action before execution.

## Generate a pairwise matrix plus boundary cases

Exhaustive combinations grow quickly, so combine explicit high-risk boundaries with pairwise coverage for lower-risk dimensions. Every irreversible action and authorization failure deserves a direct test.

\`\`\`ts
// test/escalation-policy.test.ts
import { describe, expect, it } from 'vitest';
import { decideEscalation, type PolicyInput } from '../src/escalation-policy';

const safeInput: PolicyInput = {
  action: 'read_record',
  hasAuthority: true,
  customerRequestedHuman: false,
  instructionConflict: false,
  consecutiveToolFailures: 0,
};

describe('decideEscalation', () => {
  it('continues a permitted read', () => {
    expect(decideEscalation(safeInput)).toEqual({ kind: 'continue' });
  });

  it('honors an explicit request for a person', () => {
    expect(decideEscalation({
      ...safeInput,
      customerRequestedHuman: true,
    })).toEqual({
      kind: 'escalate',
      reason: 'customer_request',
      risk: 'low',
    });
  });

  it.each([10_000, 10_001])(
    'checks the refund boundary at %i cents',
    (amountCents) => {
      const result = decideEscalation({
        ...safeInput,
        action: 'issue_refund',
        amountCents,
      });
      expect(result.kind).toBe(amountCents > 10_000 ? 'escalate' : 'continue');
    },
  );

  it('blocks a destructive action even with authority', () => {
    expect(decideEscalation({
      ...safeInput,
      action: 'delete_account',
    })).toMatchObject({ kind: 'escalate', risk: 'critical' });
  });
});
\`\`\`

What people get wrong is testing only obvious trigger phrases such as "talk to a human." The critical cases are structural: action risk, authority, tool state, and conflicting policy. Natural-language tests matter at the intent-extraction layer, but they should feed a deterministic policy decision whose expected result is unambiguous.

## Freeze execution before enqueuing the handoff

The order of operations is a safety property. Persist the task's paused state before publishing the escalation. Otherwise a worker crash can produce an escalation while leaving the task runnable, or publish two cases with different continuation state.

A minimal coordinator can express that ordering through injected interfaces:

\`\`\`ts
// src/escalation-coordinator.ts
import type { EscalationPacket } from './contracts';

export interface TaskStore {
  pause(taskId: string, escalationId: string): Promise<void>;
  markWaiting(taskId: string, escalationId: string): Promise<void>;
}

export interface EscalationQueue {
  publish(packet: EscalationPacket): Promise<{ accepted: boolean }>;
}

export async function requestHandoff(
  packet: EscalationPacket,
  store: TaskStore,
  queue: EscalationQueue,
): Promise<void> {
  await store.pause(packet.taskId, packet.escalationId);
  const acknowledgement = await queue.publish(packet);
  if (!acknowledgement.accepted) {
    throw new Error('Escalation queue did not accept ' + packet.escalationId);
  }
  await store.markWaiting(packet.taskId, packet.escalationId);
}
\`\`\`

The implementation deliberately does not resume on publish failure. Recovery can retry delivery by escalation id while the task remains paused. Production persistence and publishing may require an outbox or comparable atomic-delivery pattern, but the invariant stays the same: no risky tool execution after policy decides to escalate.

Test call order and failure behavior with simple fakes:

\`\`\`ts
import { expect, it, vi } from 'vitest';
import { requestHandoff } from '../src/escalation-coordinator';
import type { EscalationPacket } from '../src/contracts';

const packet: EscalationPacket = {
  escalationId: 'esc-44',
  taskId: 'task-19',
  reason: 'missing_authority',
  risk: 'high',
  summary: 'Refund approval scope is missing',
  attemptedAction: 'issue_refund',
  evidence: [{ label: 'order', value: 'ORD-8' }],
  allowedResumeActions: ['issue_refund'],
  createdAt: '2026-08-08T09:00:00.000Z',
  expiresAt: '2026-08-08T09:15:00.000Z',
};

it('pauses before publishing and waits only after acknowledgement', async () => {
  const events: string[] = [];
  const store = {
    pause: vi.fn(async () => { events.push('paused'); }),
    markWaiting: vi.fn(async () => { events.push('waiting'); }),
  };
  const queue = {
    publish: vi.fn(async () => {
      events.push('published');
      return { accepted: true };
    }),
  };

  await requestHandoff(packet, store, queue);
  expect(events).toEqual(['paused', 'published', 'waiting']);
});

it('leaves the task paused when delivery is rejected', async () => {
  const store = {
    pause: vi.fn(async () => undefined),
    markWaiting: vi.fn(async () => undefined),
  };
  const queue = { publish: vi.fn(async () => ({ accepted: false })) };

  await expect(requestHandoff(packet, store, queue)).rejects.toThrow(/did not accept/);
  expect(store.pause).toHaveBeenCalledTimes(1);
  expect(store.markWaiting).not.toHaveBeenCalled();
});
\`\`\`

## Make the context packet complete, minimal, and safe

A reviewer needs enough evidence to decide without replaying an entire private conversation. More context is not always better. The packet should minimize personal and secret data while preserving decision-relevant facts.

| Packet field | Test for completeness | Test for safety |
|---|---|---|
| Reason and risk | Typed, recognized values | No model-generated arbitrary category |
| Summary | States conflict and requested decision | No credentials or hidden prompt text |
| Attempted action | Matches blocked tool intent | Uses stable action name, not raw arguments |
| Evidence | Contains source labels and safe values | Allowlist fields, redact secrets |
| Resume scope | Enumerates permitted next actions | Cannot expand original authority |
| Expiry | Parseable and after creation | Bounded review window |

Write a redaction function and test it independently. Do not ask the model to remember every secret pattern.

\`\`\`ts
// src/redact-evidence.ts
const blockedLabels = new Set([
  'authorization',
  'cookie',
  'password',
  'api_key',
]);

export function redactEvidence(
  evidence: Array<{ label: string; value: string }>,
): Array<{ label: string; value: string }> {
  return evidence.map((item) => {
    const normalized = item.label.toLowerCase();
    if (blockedLabels.has(normalized)) {
      return { label: item.label, value: '[REDACTED]' };
    }
    return item;
  });
}
\`\`\`

Test mixed casing, repeated sensitive labels, empty values, long values, and lookalike labels. Label allowlists are stronger than trying to recognize every possible token shape. At higher assurance, construct evidence only from pre-approved typed fields rather than accepting arbitrary label-value pairs.

## Authenticate the human decision and constrain resumption

A decision is not valid merely because it references an escalation id. Verify reviewer identity, role or queue authority, freshness, outcome, and approved scope. Bind the decision to the task version that was paused so stale approval cannot resume a changed plan.

\`\`\`ts
// src/resume-policy.ts
import type { EscalationPacket, HumanDecision } from './contracts';

export function authorizeResume(
  packet: EscalationPacket,
  decision: HumanDecision,
  now: Date,
): string {
  if (decision.escalationId !== packet.escalationId) {
    throw new Error('Decision does not match escalation');
  }
  if (decision.outcome !== 'approve' || !decision.approvedAction) {
    throw new Error('Escalation was not approved');
  }
  if (now.getTime() >= Date.parse(packet.expiresAt)) {
    throw new Error('Approval arrived after escalation expiry');
  }
  if (!packet.allowedResumeActions.includes(decision.approvedAction)) {
    throw new Error('Approved action exceeds resume scope');
  }
  return decision.approvedAction;
}
\`\`\`

This pure function assumes identity and role were authenticated upstream. Integration tests must cover that upstream authorization. A complete resume token should also be single-use or guarded by task state so duplicate decision delivery cannot execute the tool twice.

## Test duplicate delivery and idempotent handling

Queues, webhooks, and reviewer clients can retry. Design escalation creation and decision consumption around stable identifiers.

| Duplicate event | Required invariant | Assertion |
|---|---|---|
| Same escalation published twice | One review case | Queue deduplicates or consumer upserts by id |
| Same approval delivered twice | One resumed action | Task transition is conditional and idempotent |
| Approval after rejection | Terminal rejection wins | No tool call |
| Two reviewers race | One decision commits | Loser receives conflict result |
| Worker restarts while waiting | State remains waiting | No automatic replay of risky action |

A concurrency test should release two decision promises together and assert exactly one state transition and one tool invocation. Avoid fakes that cannot model atomic compare-and-set behavior. For a database-backed implementation, run the test against the real transaction semantics in an isolated schema or disposable database.

## Inject failures at every handoff seam

The happy path usually works. Reliability comes from seam failures:

- task pause persistence fails before publish;
- publish times out after the queue accepted the packet;
- acknowledgement is lost;
- reviewer UI cannot load one evidence attachment;
- human decision arrives exactly at expiry;
- decision is approved for a different action;
- task state changed through an administrative path;
- tool execution succeeds but completion receipt is lost;
- notification to the customer fails after safe pause.

For each injection, assert three things: the task state, the number of external side effects, and the audit events. A thrown error alone does not prove safety. If publish times out ambiguously, retrying with the same escalation id should not create another case. If an approved tool action times out ambiguously, use the tool's idempotency mechanism where available and reconcile before retrying.

## Diagnose the failure where a human approved but the agent never resumed

Suppose the queue shows an approved case, but the task remains \`waiting_for_human\`. Operators manually restart it, creating a risk of duplicate action. Do not begin by changing the model prompt. The model is no longer involved in this transition.

Trace the correlation chain:

1. Confirm the decision's escalation id and task id match the persisted packet.
2. Confirm the reviewer was authorized for that risk queue.
3. Compare \`decidedAt\` with \`expiresAt\` using parsed instants, not string-local time assumptions.
4. Inspect the decision consumer's idempotency record.
5. Verify the approved action belongs to \`allowedResumeActions\`.
6. Check whether a conditional state update expected \`waiting_for_human\` but found another state.
7. Confirm the resume job was enqueued and acknowledged separately from the decision webhook.

A frequent cause is an expired packet caused by timezone conversion in the reviewer UI. Another is that the queue delivered \`approvedAction: 'refund'\` while the packet permitted \`issue_refund\`. Typed action identifiers and UTC instants prevent a surprising amount of operational ambiguity.

## Verify the conversation experience without making prose the oracle

Once protocol tests are stable, test what the customer sees. The agent should state that it has stopped the risky action, explain what information was sent for review, provide a reference that support can find, and set an honest expectation about the next event. It must not claim "a human is reviewing now" until the queue acknowledges ownership.

Use semantic assertions rather than one exact generated sentence:

| Experience requirement | Robust assertion |
|---|---|
| Stop is clear | Message states action has not been executed |
| Ownership is accurate | Pending and accepted states use different language |
| Reference is usable | Safe escalation reference appears |
| Secrets stay hidden | Known secret canaries are absent |
| Customer can exit | Cancellation or alternate route is offered when policy permits |

For model-based wording, run a curated suite containing paraphrases, hostility, urgency, prompt injection, and repeated requests. Feed extracted intent into the deterministic policy oracle, then separately score whether the response communicates the actual state. Do not let a language-quality score overrule a failed side-effect invariant.

## Prove the case reaches the right human queue

Escalation is not successful when any person can see a case. Risk, region, product, language, customer tier, and required authority may determine the correct destination. Encode routing inputs as structured fields, then test routing independently from message generation.

Create fixtures for every supported queue and at least one unmapped combination. An unmapped critical case should enter a monitored safety queue or fail closed according to policy, never fall into a general inbox without an alert. Verify that changing prose does not change routing when the structured reason and risk stay constant.

Routing tests should also cover absence and availability. If the primary reviewer group is off shift, the system may route to an on-call queue or reject tasks that cannot be handled safely. Use a fake schedule and clock so tests cover shift boundaries and holidays deterministically. Assert the selected queue id, required reviewer role, acknowledgement deadline, and audit reason for fallback.

Finally, test separation of duties. The agent owner or original requester may be prohibited from approving certain actions. A queue assignment test should prove that only eligible reviewers are offered the case, while the resume authorization test proves an ineligible decision is rejected even if it reaches the consumer. Routing reduces mistakes, but authorization remains the final control.

## Monitor the protocol in production with testable signals

Pre-release tests cannot reproduce every queue outage or staffing delay. Emit structured events for policy decision, pause committed, publish attempted, queue acknowledged, human decision received, resume authorized, tool completed, and terminal state. Correlate them by task and escalation ids without recording secret prompts.

Useful indicators include handoff request rate by reason, acknowledgement latency, decision latency by risk, expiry rate, duplicate-delivery rate, resume failure rate, and tasks with no terminal event. Avoid declaring a universal target. Establish baselines by queue and risk class, then page on safety invariant violations immediately and latency drift according to operations policy.

Create synthetic escalation probes in a non-production action path. The probe should verify a case can be delivered, acknowledged, decided, and terminally closed without granting real tool authority. This tests the human channel as an operational dependency, not merely a UI feature.

## Frequently Asked Questions

### What should an agent human handoff test assert first?

Assert that risky execution stops before testing wording or queue appearance. The task must enter a paused state, no forbidden tool call may occur, and the escalation must carry a stable correlation id. Then verify queue acknowledgement, evidence redaction, ownership, expiry, and the final decision transition. This order matters because a polished message cannot compensate for an agent that continued acting. Side-effect counts and durable state are stronger oracles than generated prose.

### How do I test low-confidence escalation without trusting a model score?

Define which task classes may use confidence as a signal and map the signal into deterministic policy. Test boundaries around that mapping, plus cases where higher-priority rules such as missing authority, destructive action, or an explicit customer request decide the outcome. Calibrate model uncertainty separately with a labeled evaluation set. A raw score should not become a universal safety threshold because its meaning can change across models, prompts, and tasks.

### What context belongs in a human escalation packet?

Include a typed reason, risk, concise decision summary, stable action name, safe evidence with source labels, permitted resume actions, correlation ids, creation time, and expiry. Exclude credentials, cookies, hidden instructions, unnecessary conversation history, and raw tool payloads that contain personal data. Build evidence from approved fields and apply deterministic redaction. Test both completeness and minimization, since a packet can fail by omitting the key conflict or by exposing far more than the reviewer needs.

### How should the agent behave when no human responds before expiry?

Move to an explicit expired terminal state or a documented compensating workflow. Do not silently resume, repeatedly execute the risky action, or leave the task looking active. Notify the customer accurately, preserve the audit trail, and allow a new review request only through a controlled transition with a new expiry. Tests should use a fake clock, exercise the exact boundary instant, and prove that a late approval cannot authorize the expired task.
`,
};
