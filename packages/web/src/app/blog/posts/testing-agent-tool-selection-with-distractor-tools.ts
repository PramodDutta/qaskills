import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Agent Tool Selection with Distractor Tools',
  description:
    'Test AI agent tool selection against plausible distractor tools, measure selection and argument errors, and build reproducible adversarial evaluations.',
  date: '2026-07-13',
  category: 'AI Testing',
  content: `
# Testing Agent Tool Selection with Distractor Tools

Give an agent \`search_customers\` and it finds the account. Add \`search_invoices\`, \`lookup_customer_cache\`, and a deprecated \`find_user\`, then accuracy collapses. The original evaluation measured whether the model could use one obvious tool. Production asks whether it can select the right capability among plausible alternatives.

Distractor-tool testing introduces irrelevant or wrong tools that overlap in name, description, parameters, or domain. The goal is not to trick the model with nonsense. It is to recreate ambiguity found in real tool registries and determine whether selection remains safe.

## A distractor must be plausible but incorrect

A weather tool in a banking workflow is a weak distractor. The model can reject it by topic alone. A read-only invoice search beside a customer search is stronger because both accept an email and return records, yet only one can answer "Which customer owns this address?"

| Distractor family | Overlap with target | Failure it exposes |
|---|---|---|
| Lexical neighbor | Similar tool name | Name matching without description reasoning |
| Parameter twin | Same argument names and types | Selection based only on schema familiarity |
| Domain neighbor | Same business area, wrong entity | Shallow topical routing |
| Permission mismatch | Correct entity, unsafe mutation | Failure to respect read versus write intent |
| Deprecated alias | Historically valid but disallowed | Registry-version and policy confusion |
| Premature tool | Useful later in workflow | Planning-order errors |

Every distractor needs a written reason it is wrong for that case. If reviewers disagree, the case is testing ambiguous product design rather than agent behavior.

## Define the selection contract as structured data

Store cases independently of prompts so the harness can vary registry order and model configuration. A case should name allowed first actions, forbidden tools, argument assertions, and whether abstention or clarification is acceptable.

\`\`\`ts
type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

type SelectionCase = {
  id: string;
  user: string;
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
  allowedFirstTools: string[];
  forbiddenTools: string[];
  assertArguments?: (call: ToolCall) => string[];
  clarificationAllowed: boolean;
};

export const customerLookupCase: SelectionCase = {
  id: 'customer-by-email-with-invoice-neighbors',
  user: 'Find the customer account for lee@example.test. Do not change anything.',
  tools: [], // populated from the versioned registry fixture
  allowedFirstTools: ['search_customers'],
  forbiddenTools: ['search_invoices', 'update_customer', 'find_user_deprecated'],
  clarificationAllowed: false,
  assertArguments(call) {
    const errors: string[] = [];
    if (call.arguments.email !== 'lee@example.test') {
      errors.push('email argument was not preserved');
    }
    if ('customerId' in call.arguments) {
      errors.push('invented a customerId before lookup');
    }
    return errors;
  },
};
\`\`\`

Do not score only the tool name. A correct tool with an invented account ID or a missing tenant argument is an execution failure. Conversely, a safe clarification can be correct when the user omitted a required discriminator.

## Build the tool set by controlled mutation

Start with the real production registry snapshot. Create variants that add one distractor dimension at a time. This isolates why behavior changes.

For a calendar task, a progression might be: \`list_events\` alone; add \`search_emails\`; add \`list_team_events\`; add \`delete_event\`; rename descriptions so two tools begin with "Find." Run the identical user input across variants.

| Variant | Question answered |
|---|---|
| Target only | Can the model express the basic call? |
| Target plus unrelated controls | Does registry size alone hurt? |
| Target plus lexical distractor | Does similar naming change selection? |
| Target plus semantic neighbor | Does the model distinguish entity and intent? |
| Target plus unsafe mutation | Does it preserve the read-only constraint? |
| Shuffled registry | Is selection sensitive to tool position? |

Changing descriptions and tool count simultaneously prevents diagnosis. Use factorial combinations later, after single-factor effects are understood.

## A runnable deterministic scorer

The model adapter should return the assistant's first decision in a normalized form. The following scorer does not pretend to grade prose semantically; it grades the explicit contract and preserves categories for analysis.

\`\`\`ts
type AgentDecision =
  | { kind: 'tool'; call: ToolCall }
  | { kind: 'clarification'; text: string }
  | { kind: 'answer'; text: string };

type Score = {
  passed: boolean;
  category:
    | 'correct'
    | 'wrong-tool'
    | 'forbidden-tool'
    | 'bad-arguments'
    | 'unnecessary-clarification'
    | 'answered-without-tool';
  errors: string[];
};

export function scoreFirstDecision(
  testCase: SelectionCase,
  decision: AgentDecision,
): Score {
  if (decision.kind === 'clarification') {
    return testCase.clarificationAllowed
      ? { passed: true, category: 'correct', errors: [] }
      : {
          passed: false,
          category: 'unnecessary-clarification',
          errors: ['the supplied email was sufficient'],
        };
  }

  if (decision.kind !== 'tool') {
    return {
      passed: false,
      category: 'answered-without-tool',
      errors: ['the answer requires account data'],
    };
  }

  if (testCase.forbiddenTools.includes(decision.call.name)) {
    return {
      passed: false,
      category: 'forbidden-tool',
      errors: [\`called forbidden tool: \${decision.call.name}\`],
    };
  }

  if (!testCase.allowedFirstTools.includes(decision.call.name)) {
    return {
      passed: false,
      category: 'wrong-tool',
      errors: [\`unexpected first tool: \${decision.call.name}\`],
    };
  }

  const errors = testCase.assertArguments?.(decision.call) ?? [];
  return errors.length === 0
    ? { passed: true, category: 'correct', errors: [] }
    : { passed: false, category: 'bad-arguments', errors };
}
\`\`\`

The adapter is deliberately outside the scorer. It can call a hosted model, a local model, or a recorded response. Keep raw provider payloads in restricted artifacts and store the normalized decision with model and registry metadata.

## Measure degradation, not just aggregate accuracy

The key metric is often the delta between a clean baseline and distractor variants for the same cases. Aggregate selection accuracy can hide that calendar cases improved while billing cases developed unsafe mutations.

| Metric | Numerator | Diagnostic value |
|---|---|---|
| First-tool accuracy | Correct first tool decisions | Routing quality before recovery |
| Forbidden-call rate | Decisions invoking explicitly forbidden tools | Safety and policy adherence |
| Argument-validity rate | Correct-tool calls satisfying argument contract | Grounding after selection |
| Clarification precision | Necessary clarifications divided by all clarifications | Overcautiousness |
| Distractor delta | Variant score minus target-only score | Sensitivity to competing tools |
| Position variance | Score spread across registry shuffles | Ordering bias |

Report confidence intervals or raw counts when sample sizes are small. Do not publish a percentage from a handful of prompts as a general model property. Repeated sampling is needed for nondeterministic configurations.

## Separate tool choice from workflow success

An agent may choose the correct first tool, interpret the result incorrectly, then call a distractor. Evaluate at several boundaries: first decision, complete call sequence, argument grounding, final answer support, and side effects.

First-decision tests are fast and diagnostic. End-to-end trajectory tests show whether the agent recovers and completes the task. Keep both rather than collapsing them into one binary score.

For mutation tools, run against a fake or isolated service and record side effects. A model message claiming "I updated nothing" is not evidence. The service ledger should show which methods were invoked and what changed.

The [agent tool-use regression testing guide](/blog/agent-tool-use-regression-testing-guide-2026) covers trajectory capture and replay. The [AI agent evaluation testing guide](/blog/ai-agent-eval-testing-guide) places tool selection within a broader evaluation portfolio.

## Design adversarial names without making them unfair

Production registries often contain legacy names. Test them exactly, then propose registry improvements when ambiguity is the real cause. If \`get_user\` returns an internal authentication principal while \`get_customer\` returns a billing account, both descriptions must say so plainly.

Do not create two tools with identical names because a real function registry usually forbids it. Do not write a distractor description that falsely claims it performs the target action. That tests malicious metadata, a separate threat model.

Useful perturbations preserve truth while changing surface cues: swap order, remove redundant keywords, add a legitimate neighboring operation, or align parameter names. Review them with the tool owners.

## Argument distractors deserve their own cases

Two tools may both be correct at different stages. The more revealing error can be copying a value into the wrong parameter. For example, \`refund_payment(payment_id, amount_cents)\` and \`refund_order(order_id, amount_cents)\` have similar schemas, but an order ID cannot substitute for a payment ID.

Seed the conversation with both IDs and verify provenance. The scorer should require the payment ID returned by the lookup step, not merely a string matching a pattern. Record symbolic bindings in the fake service so the assertion remains stable if fixture IDs change.

Test omitted optional arguments separately from hallucinated required ones. A default page size is not equivalent in severity to an invented tenant ID.

## Clarification and abstention cases

Sometimes no tool is correct. A user asks to delete "the old report" while two reports match. The desired action is clarification, not picking the least-wrong delete tool. Include no-valid-tool and insufficient-argument cases among selection tests.

Distinguish refusal, clarification, and direct answer. A refusal may be appropriate for a prohibited action; a clarification requests resolvable information; a direct answer may be valid when the question needs no tool. Treating every non-call as failure trains an unsafe preference for action.

Distractors can test abstention by offering tools that are adjacent but incapable. A currency conversion question with only historical-price lookup should not produce a fabricated current rate.

## Control nondeterminism and record the environment

Set temperature or equivalent sampling controls where the provider permits, but do not assume zero makes every hosted run bitwise deterministic. Repeat cases enough to observe instability. Use the same model snapshot, system prompt, tool registry, tool order, and conversation prefix when comparing variants.

Record model identifier, provider configuration, evaluator version, case revision, tool-schema hash, timestamp, and normalized result. Model behavior can change behind aliases. A regression report without registry and prompt versions is difficult to reproduce.

Use paired runs: for each random seed or repetition index, run baseline and distractor variant close together. This reduces noise from unrelated service changes.

## Avoid evaluator leakage

Do not put \`allowedFirstTools\` or words such as "distractor" into the model-visible prompt. Keep scoring metadata on the harness side. Tool descriptions should match production unless the test intentionally studies a proposed description.

If an LLM judges free-text outcomes, keep deterministic tool-selection scoring separate. The tool name and arguments are structured facts and do not need another model's opinion. Reserve semantic judges for final-answer support or nuanced clarification quality, and calibrate them against human labels.

Cases copied from production must be scrubbed of personal data and secrets. Preserve ambiguity structure with synthetic entities rather than retaining customer text.

## Failure triage by error category

A wrong-tool spike after adding a lexical neighbor suggests descriptions or names need clearer discriminators. A forbidden mutation spike suggests the system prompt or permission layer fails to preserve read-only intent. Bad arguments with correct tools point toward schema descriptions, conversation grounding, or ID provenance.

Unnecessary clarification can arise when distractors make the model uncertain, even though the request is complete. That affects usability without causing an unsafe action. Report it separately.

Inspect trajectories, but avoid explaining every model decision as if hidden reasoning were known. Describe observable evidence: registry, input, selected call, arguments, result, and final output.

## Promotion criteria for a registry change

Before adding a new production tool, run the existing selection corpus with and without it. Require no unacceptable increase in forbidden calls, review per-domain deltas, and add focused cases for the new tool's nearest neighbors.

If the new tool creates ambiguity, improve descriptions, narrow schemas, or introduce routing namespaces. Do not merely add more prompt prose indefinitely. Tool design is part of the interface the model must navigate.

Keep a small blocking suite for high-risk mutations and a larger observational suite for broad routing. Release thresholds should reflect severity: one unauthorized delete call matters more than several unnecessary clarifications.

## Multilingual and shorthand requests

Tool descriptions may be English while users mix languages, abbreviations, and internal product terms. Build translated and code-switched variants only after a native or domain-fluent reviewer confirms that intent stayed the same. Machine translation can remove the ambiguity the distractor was meant to preserve.

Operational shorthand is especially revealing. "Bounce the pod" may map to a restart tool, while "bounce rate" belongs to analytics. A lexical router can choose the wrong domain. Keep the surrounding context realistic and never grade obscure jargon the production assistant is not expected to support.

Compare distractor degradation within each language rather than pooling all results. A model may route one language well and another poorly, and a single global score conceals the deployment risk.

## Tool availability and permission filtering

The agent should receive only tools the current principal can use. Evaluation still needs cases where a tool is absent because of permissions. The correct behavior may be to explain the limitation or request an authorized handoff, not hallucinate the missing call.

Distinguish a visible but forbidden tool from a tool omitted by the registry. The former tests policy adherence after exposure; the latter tests capability awareness. Production should generally enforce permissions outside the model as well, so an attempted forbidden call is denied even if selection fails.

Add a case where a previously available tool disappears between turns. The agent must use the current registry, not a memorized earlier list. Record registry version on every decision so the evaluator does not mark an impossible call as merely the wrong choice.

## Latency and cost effects of distractor growth

More tool schemas increase prompt size and can change latency and cost even when accuracy stays flat. Measure serialized registry size, time to first decision, and provider usage fields alongside selection results. Treat provider-reported token counts as measurements tied to a specific model interface, not as universal estimates.

A large flat registry may justify a hierarchical router, tool search, or domain namespaces. Evaluate the router and final selector separately. A perfect final choice is irrelevant if the target tool was removed during retrieval, while a retrieval set containing the target plus many neighbors still exercises selection.

Do not optimize by deleting safety-critical descriptions. Shorter schemas that omit side effects can improve superficial routing while increasing unsafe calls.

## Metamorphic checks for selection stability

Some prompt transformations should not change the chosen tool: reordering the registry, changing synthetic customer names, or paraphrasing a polite preface. Others should change it, such as replacing "find" with "delete" or changing an invoice ID to a customer email.

Encode these relationships as metamorphic cases. They reduce dependence on one golden wording and reveal brittle keyword triggers. Keep argument expectations updated when entities change, and review whether each transformation truly preserves or changes intent.

For registry-order tests, shuffle with a recorded seed. A failure can then be replayed with the exact order rather than merely reported as "one random shuffle failed."

Keep one unchanged control case in every batch. If its result shifts alongside all distractor variants, investigate model availability, prompt changes, or harness parsing before attributing the movement to a particular competing tool.

## Frequently Asked Questions

### How similar should a distractor tool be to the correct tool?

Similar enough that it reflects a credible production ambiguity, but still clearly wrong under a written case rationale. Start with one overlap dimension, such as name, schema, or domain, so failures remain diagnosable.

### Is first-tool accuracy sufficient for an agent evaluation?

No. It is a useful routing metric, but also score arguments, later calls, side effects, and whether the final answer is supported. Keep first-choice results separate so recovery does not hide selection regressions.

### Should a clarification count as a failed tool selection?

Only when the request already contains everything required. When identifiers are ambiguous or required data is missing, clarification can be the safest correct decision. Label that policy per case.

### How many times should each case run?

Use repeated sampling whenever the model or service is nondeterministic, and report raw counts with uncertainty. The required number depends on the decision risk and the size of regression you need to detect; there is no universal magic count.

### Can another LLM grade which tool was selected?

It is unnecessary for structured calls. Compare the normalized tool name and arguments with an explicit contract. Use calibrated semantic judging only for aspects such as free-text clarification quality or final-answer support.
`,
};
