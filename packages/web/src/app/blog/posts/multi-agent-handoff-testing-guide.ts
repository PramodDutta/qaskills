import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Multi-Agent Handoff Testing Guide',
  description:
    'Test multi-agent handoffs with routing assertions, context contracts, refusal paths, trace review, and failure injection for AI orchestration.',
  date: '2026-07-10',
  category: 'AI Testing',
  content: `
# Multi-Agent Handoff Testing Guide

The refund agent answered a tax question because the router saw the word invoice. The research agent handed off to a code agent without the source URLs. The supervisor looped between two specialists until the token budget ran out. Multi-agent systems fail in ways that look like product behavior, not stack traces, so QA needs tests that inspect routing decisions, context transfer, authority boundaries, and recovery paths.

This guide treats handoff as a testable contract. A handoff is not just calling another agent. It is a decision that should include a target, a reason, a compact state package, permissions, stop conditions, and observable trace metadata. For broader orchestration coverage, read [Multi-agent system testing guide 2026](/blog/multi-agent-system-testing-guide-2026). For evaluating paths and decisions across full runs, use [Agent trajectory evaluation guide 2026](/blog/agent-trajectory-evaluation-guide-2026).

## Define the handoff contract before evaluating answers

End-to-end answer quality is too late to diagnose handoff bugs. If the wrong agent received the task, the final answer can be poor for reasons that are obvious only in the trace. Start with a contract for each handoff edge: when it is allowed, what state must be passed, what must be omitted, and what the receiving agent is expected to return.

This contract can be small. A support supervisor might hand billing disputes to a billing agent only when the user asks about charges, refunds, invoices, taxes, or payment failures. It must pass customer id, conversation summary, relevant order ids, and policy version. It must not pass unrelated private notes. The billing agent must either answer, ask for missing billing data, or hand back with a specific reason.

| Handoff edge | Allowed trigger | Required context | Forbidden context | Expected receiving behavior |
|---|---|---|---|---|
| support_supervisor -> billing_agent | Charge, invoice, refund, payment, tax | customer_id, order_ids, billing_summary, policy_version | Password reset token, unrelated health data | Resolve billing issue or request missing invoice data. |
| support_supervisor -> technical_agent | Error code, integration failure, API outage | account_id, product_area, error_text, recent_steps | Payment card details | Diagnose technical cause or ask for logs. |
| research_agent -> writing_agent | Evidence gathered and outline requested | source_urls, claims, confidence notes | Raw private credentials from browsing session | Draft with citations and preserve uncertainty. |
| planner_agent -> executor_agent | Approved tool plan exists | task_steps, allowed_tools, rollback_note | Hidden chain-of-thought, disallowed tools | Execute bounded step and report result. |
| coding_agent -> reviewer_agent | Patch ready for inspection | diff_summary, changed_files, test_results | API secrets from local env | Review risks, not rewrite the patch. |

## Testing router decisions with fixtures

The router is usually the first handoff risk. Test it with fixtures that include obvious routes, ambiguous routes, and adversarial wording. A good router test does not require the downstream agent to produce a beautiful answer. It only asserts that the selected target and reason match the contract.

The example below uses a plain TypeScript router function so the test can run deterministically. In production, the router may call an LLM, a classifier, or a rules-plus-model pipeline. The point is to return structured routing data that can be asserted.

\`\`\`typescript
type AgentName = 'billing_agent' | 'technical_agent' | 'general_support';

interface RouteDecision {
  target: AgentName;
  reason: string;
  requiredContext: string[];
}

export function routeSupportRequest(message: string): RouteDecision {
  const text = message.toLowerCase();

  if (text.includes('refund') || text.includes('invoice') || text.includes('charged')) {
    return {
      target: 'billing_agent',
      reason: 'billing_intent_detected',
      requiredContext: ['customer_id', 'order_ids', 'billing_summary'],
    };
  }

  if (text.includes('500') || text.includes('api') || text.includes('webhook')) {
    return {
      target: 'technical_agent',
      reason: 'technical_failure_detected',
      requiredContext: ['account_id', 'product_area', 'error_text'],
    };
  }

  return {
    target: 'general_support',
    reason: 'no_specialist_required',
    requiredContext: ['conversation_summary'],
  };
}
\`\`\`

\`\`\`typescript
import { routeSupportRequest } from '../src/router';

test.each([
  ['I was charged twice for order A17', 'billing_agent', 'billing_intent_detected'],
  ['Webhook delivery returns 500 after retry', 'technical_agent', 'technical_failure_detected'],
  ['Can you update my display name?', 'general_support', 'no_specialist_required'],
])('routes %s', (message, expectedTarget, expectedReason) => {
  const decision = routeSupportRequest(message);

  expect(decision.target).toBe(expectedTarget);
  expect(decision.reason).toBe(expectedReason);
  expect(decision.requiredContext.length).toBeGreaterThan(0);
});
\`\`\`

For LLM routers, keep the same assertion shape but run multiple examples per class. Do not assert exact prose from the model. Assert the structured target, reason code, and context requirements.

## Context transfer tests catch silent failures

Many handoff failures are not wrong target failures. The target is correct, but the receiving agent lacks the one field needed to act. A billing agent without order ids asks the user to repeat information. A code reviewer without test results repeats work. A research writer without confidence notes presents weak claims as facts.

Write tests around the handoff envelope. The envelope should be serializable and inspectable. Avoid passing an opaque conversation blob and hoping the receiver extracts everything. Summaries are useful, but critical fields deserve names.

| Field | Why it exists | Test assertion |
|---|---|---|
| target_agent | Determines the receiver | Equals the expected specialist for the fixture. |
| handoff_reason | Explains the decision | Uses a controlled reason code, not free-form only. |
| conversation_summary | Keeps context compact | Contains the user goal and latest blocker. |
| required_entities | Carries ids and domain objects | Includes order id, account id, file path, or project id as needed. |
| permissions | Limits what the receiver may do | Does not escalate tools beyond the originating policy. |
| stop_condition | Prevents loops | Defines when to answer, ask back, or return to supervisor. |
| trace_tags | Makes evaluation queryable | Includes route name, fixture id, and risk category. |

## LangGraph handoff behavior under test

LangGraph is often used for explicit multi-agent workflows. The Python example below keeps the graph simple: a supervisor decides which node should handle the message, then the specialist returns a response. In real projects the nodes may call models and tools, but the test should still assert the state transition.

\`\`\`python
from typing import Literal, TypedDict

from langgraph.graph import StateGraph, START, END


class SupportState(TypedDict):
    message: str
    route: str
    handoff_reason: str
    response: str


def supervisor(state: SupportState) -> SupportState:
    text = state['message'].lower()
    if 'refund' in text or 'invoice' in text:
        return {**state, 'route': 'billing', 'handoff_reason': 'billing_intent_detected'}
    if 'api' in text or 'webhook' in text:
        return {**state, 'route': 'technical', 'handoff_reason': 'technical_failure_detected'}
    return {**state, 'route': 'general', 'handoff_reason': 'no_specialist_required'}


def choose_next(state: SupportState) -> Literal['billing', 'technical', 'general']:
    return state['route']


def billing_agent(state: SupportState) -> SupportState:
    return {**state, 'response': 'Billing specialist received the request.'}


def technical_agent(state: SupportState) -> SupportState:
    return {**state, 'response': 'Technical specialist received the request.'}


def general_agent(state: SupportState) -> SupportState:
    return {**state, 'response': 'General support can handle this request.'}


builder = StateGraph(SupportState)
builder.add_node('supervisor', supervisor)
builder.add_node('billing', billing_agent)
builder.add_node('technical', technical_agent)
builder.add_node('general', general_agent)
builder.add_edge(START, 'supervisor')
builder.add_conditional_edges('supervisor', choose_next)
builder.add_edge('billing', END)
builder.add_edge('technical', END)
builder.add_edge('general', END)

graph = builder.compile()
\`\`\`

\`\`\`python
def test_refund_request_hands_off_to_billing():
    result = graph.invoke({
        'message': 'The invoice was paid twice, please refund one charge.',
        'route': '',
        'handoff_reason': '',
        'response': '',
    })

    assert result['route'] == 'billing'
    assert result['handoff_reason'] == 'billing_intent_detected'
    assert result['response'] == 'Billing specialist received the request.'
\`\`\`

This is not an evaluation of natural-language quality. It is a workflow assertion. Keep it deterministic so it can run in every pull request.

## Failure modes worth injecting

Handoff testing becomes useful when it covers unpleasant paths. The downstream agent can reject the task. The context can be too large. A tool permission can be missing. The supervisor can choose a specialist that is offline. The receiving agent can discover that the route was wrong and return control.

Inject these failures deliberately. A multi-agent system that only works when every agent accepts every task is not ready for production use.

| Injected failure | Expected system behavior | What to inspect in trace |
|---|---|---|
| Missing required entity | Receiver asks for the missing field or returns to supervisor | Handoff reason, missing field list, user-facing question. |
| Specialist unavailable | Supervisor chooses fallback or queues work | Error classification and fallback target. |
| Context too large | Summarizer compacts before handoff | Token count, retained entities, dropped low-value history. |
| Tool not allowed | Receiver refuses tool use and explains limitation | Permission set and refusal reason. |
| Wrong route detected by receiver | Receiver hands back with route_mismatch | Loop count and next supervisor decision. |
| Repeated handoff loop | System stops at configured limit | Stop condition and final safe response. |

## Evaluating handoff traces

Trace review should answer four questions: was the first route correct, was the context sufficient, did the receiver stay within authority, and did the system stop cleanly. You can evaluate these manually at first, then convert recurring checks into automated assertions.

Tag traces with route names and fixture ids. Without tags, evaluating handoff quality turns into reading random transcripts. With tags, you can pull all billing_agent handoffs for the latest release and compare route accuracy, missing context frequency, and loop count.

Do not score every handoff only by final answer satisfaction. A final answer can be acceptable even when the route was wasteful, and a final answer can fail because the user omitted information even though the handoff was correct. Keep routing metrics separate from answer metrics.

## Test data design for handoff suites

Build fixtures from real categories, not generic prompts. Include short messages, long conversations, mixed intents, user corrections, policy-sensitive requests, and adversarial phrasing. A refund request with an API error in the same sentence should test prioritization. A user saying do not send me to billing again should test whether the supervisor respects history while still routing correctly when the issue is clearly billing.

Each fixture should declare expected target, required context, forbidden context, and acceptable fallback. That gives reviewers a concrete contract to debate. If the expected route is unclear, the product routing rule is unclear too.

## Loop prevention is a first-class test

Handoff loops are not rare. A technical agent decides the issue is billing because the error appeared during checkout. The billing agent decides it is technical because the payment API returned 500. The supervisor sees both words and sends the task back to technical. Without a stop condition, the system burns tokens and gives the user nothing useful.

Test loop limits deliberately. Create a fixture where two specialists have plausible reasons to reject the task. The system should stop after the configured number of transfers, summarize what is known, and ask the user for the missing discriminator or escalate to a human workflow. A silent loop that ends only because of token exhaustion is a product failure.

| Loop pattern | Fixture trigger | Expected stop behavior |
|---|---|---|
| Billing and technical bounce | Payment failed with API 500 and invoice mismatch | Supervisor asks for order id and error screenshot or escalates. |
| Research and writing bounce | Writer says evidence incomplete, researcher finds no source | Final response states evidence gap instead of looping. |
| Planner and executor bounce | Executor lacks permission for planned tool | Planner revises plan within allowed tools or stops. |
| Safety and specialist bounce | Specialist wants to answer disallowed request | Safety policy returns refusal with no further handoff. |
| Reviewer and coder bounce | Reviewer requests change, coder says file ownership unclear | System asks for human clarification after limit. |

## Permission envelopes for receiving agents

A receiving agent should not inherit every capability owned by the supervisor. Handoff tests should assert the permission envelope: tools, data scopes, write authority, and external side effects. This matters when a planner can read many systems but an executor should only modify one repository, or when a support supervisor can view billing metadata but a technical agent should not see payment details.

Represent permissions as data, not prose. An allowlist of tool names and resource scopes can be inspected before the receiving agent runs. If an agent asks for a tool outside the envelope, the orchestrator should deny it and record the denial in the trace. That denial path deserves a test because it is where accidental privilege escalation often appears.

| Permission dimension | Example value | Test assertion |
|---|---|---|
| Tool allowlist | search_docs, read_ticket | Agent cannot call refund_payment. |
| Resource scope | tenant_id equals t_123 | Agent cannot fetch another tenant's ticket. |
| Write authority | read_only | Agent proposes action but does not execute mutation. |
| Network access | disabled | Agent cannot browse external URLs during private workflow. |
| Human approval required | true for payment refunds | Tool execution pauses for approval event. |

## Handoff tests for partial context compression

Long conversations need compression before handoff. Compression can destroy the task if it drops entities, constraints, or user corrections. Test the summarizer that prepares handoff context. Feed it a conversation with irrelevant chatter, corrected facts, and important ids. Assert that the summary keeps the latest truth and required fields.

For example, if the user first says order A17 and then corrects it to order A71, the handoff summary must carry A71 only or explicitly mention the correction. If the user says do not email me, that preference should follow a support handoff that might otherwise trigger notification tooling. These are not style details. They determine whether the receiving agent acts safely.

Compression tests are easier when the handoff envelope has structured fields next to the summary. The summary can be natural language, but order_ids, customer_id, constraints, and denied_actions should be arrays or objects. Then the test can assert them deterministically even if the summary wording changes.

## Human escalation as a valid route

Multi-agent systems often treat human escalation as failure. In testing, escalation is a valid target when confidence is low, authority is missing, or the cost of a wrong automated action is high. Add human_escalation to the routing contract instead of burying it in a fallback answer.

Escalation tests should assert that the system includes useful handoff notes for the human: user goal, attempted specialists, missing information, risk category, and suggested next question. A human queue item that only says agent failed wastes the context the system already gathered.

| Escalation reason | Required note | Bad escalation smell |
|---|---|---|
| Low routing confidence | Top candidate routes and why uncertain | No reason recorded. |
| Missing permission | Tool requested and policy that blocked it | Agent asks user to retry. |
| High-risk financial action | Amount, account, policy citation | Automated refund attempted anyway. |
| Repeated loop | Agents involved and loop count | Conversation ends with generic apology. |
| Safety policy conflict | Policy category and safe alternative | Specialist keeps trying to answer. |

## Regression suite maintenance

Handoff behavior changes when prompts, tools, model versions, and business policy change. Keep a small fixture suite in source control and review fixture updates like API contract changes. If a route expectation changes, the pull request should explain the product rule change, not merely update a snapshot.

Avoid brittle golden transcripts. Store expected structured decisions and trace events. Let natural language vary within evaluated bounds. The regression suite should fail when the billing request routes to technical, when order ids disappear, or when a forbidden tool is requested. It should not fail because the specialist changed a greeting.

## Frequently Asked Questions

### Should handoff tests assert the exact final answer?

Only for deterministic agents. For LLM-backed agents, assert structured route decisions, required context fields, refusal categories, and trace metadata. Evaluate final answer quality separately with rubrics or human review.

### How do I test that context was not over-shared?

Inspect the handoff envelope before it reaches the receiving agent. Assert that forbidden fields, secrets, unrelated customer data, and hidden reasoning are absent. This is a security and privacy test, not a style preference.

### What is the best first metric for handoff quality?

Start with route accuracy by intent class, then add missing-context rate and loop count. These metrics explain failures better than a single final-answer score.

### How many handoff fixtures do I need?

Use enough to cover every allowed edge, every forbidden edge, and the top ambiguous intents. A small, reviewed fixture set is more useful than hundreds of unlabeled transcripts with unclear expected behavior.

### Should agents be allowed to hand off directly to each other?

Only when the workflow contract permits it. Direct specialist-to-specialist handoff can reduce latency, but it also increases loop risk. Test stop conditions and trace visibility before enabling it broadly.
`,
};
